import asyncio
import json
import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Optional
from dataclasses import dataclass, field, asdict

from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright, expect, Page, Request, Response


@dataclass
class StepResult:
    index: int
    action: str
    status: str  # "success", "failed", "skipped"
    name: Optional[str] = None
    selector: Optional[str] = None
    screenshot: Optional[str] = None
    error: Optional[str] = None
    duration_ms: int = 0
    network_requests: list["NetworkRequest"] = field(default_factory=list)
    logs: list[str] = field(default_factory=list)


@dataclass
class NetworkRequest:
    url: str
    method: str
    status: Optional[int] = None
    duration_ms: int = 0
    request_size: int = 0
    response_size: int = 0
    error: Optional[str] = None


@dataclass
class RunResult:
    run_id: str
    status: str  # "running", "completed", "failed"
    goal: str = ""
    project_id: Optional[str] = None
    scenario_id: Optional[str] = None
    steps: list[StepResult] = field(default_factory=list)
    network_requests: list[NetworkRequest] = field(default_factory=list)
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    total_duration_ms: int = 0
    artifact_dir: str = ""
    video_path: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


def resolve_local_url(url: str) -> str:
    if url.startswith("http://") or url.startswith("https://") or url.startswith("file://"):
        return url
    abs_path = (Path.cwd() / url).resolve()
    return abs_path.as_uri()


def resolve_resource_path(file_path: str, project_id: Optional[str] = None) -> str:
    """Resolve resource:xxx paths to actual file paths."""
    if not file_path.startswith("resource:"):
        return file_path

    resource_id = file_path.replace("resource:", "")
    if not project_id:
        raise ValueError("project_id is required to resolve resource paths")

    # Load resource metadata
    data_dir = Path(__file__).parent.parent.parent / "data" / "resources" / project_id
    metadata_path = data_dir / "metadata.json"

    if not metadata_path.exists():
        raise ValueError(f"Resource metadata not found for project: {project_id}")

    with metadata_path.open("r", encoding="utf-8") as f:
        metadata = json.load(f)

    resource = next((r for r in metadata if r["id"] == resource_id), None)
    if not resource:
        raise ValueError(f"Resource not found: {resource_id}")

    resolved_path = data_dir / resource["filename"]
    if not resolved_path.exists():
        raise ValueError(f"Resource file not found: {resolved_path}")

    return str(resolved_path)


# Auth states directory
AUTH_STATES_DIR = Path(__file__).parent.parent.parent / "data" / "auth_states"
AUTH_STATES_DIR.mkdir(parents=True, exist_ok=True)


def get_auth_state_path(project_id: str, state_name: str) -> Path:
    """Get the path for an auth state file."""
    project_dir = AUTH_STATES_DIR / project_id
    project_dir.mkdir(parents=True, exist_ok=True)
    return project_dir / f"{state_name}.json"


class ExecutionEngine:
    def __init__(
        self,
        on_step_start: Optional[Callable[[int, dict], None]] = None,
        on_step_end: Optional[Callable[[StepResult], None]] = None,
        on_network: Optional[Callable[[NetworkRequest], None]] = None,
        on_log: Optional[Callable[[str], None]] = None,
    ):
        self.on_step_start = on_step_start
        self.on_step_end = on_step_end
        self.on_network = on_network
        self.on_log = on_log
        self._cancelled = False
        self._pending_requests: dict[str, tuple[float, Request]] = {}
        self._step_network_requests: list[NetworkRequest] = []  # Per-step collection
        self._step_logs: list[str] = []  # Per-step logs
        self._variables: dict[str, str] = {}  # Variables extracted during execution
        self._scenario_loader: Optional[Callable[[str], Optional[dict]]] = None  # Callback to load scenarios
        self._project_id: Optional[str] = None  # Current project ID for auth state storage
        self._context = None  # Browser context reference for auth state operations

    def cancel(self):
        self._cancelled = True

    def set_scenario_loader(self, loader: Callable[[str], Optional[dict]]):
        """Set the callback function to load scenarios by ID."""
        self._scenario_loader = loader

    def _substitute_variables(self, text: str) -> str:
        """Replace {{variable}} placeholders with actual values."""
        if not text or "{{" not in text:
            return text

        def replace_var(match):
            var_name = match.group(1).strip()
            return self._variables.get(var_name, match.group(0))

        return re.sub(r"\{\{(\w+)\}\}", replace_var, text)

    def _resolve_selectors(self, target: str, ui_map: dict, ui_maps_by_name: dict) -> list[str]:
        """Resolve target to list of CSS selectors."""
        selectors = []
        if target:
            if "." in target and not target.startswith("."):
                # Parse "uiMapName.elementName" format
                parts = target.split(".", 1)
                if len(parts) == 2:
                    ui_map_name, element_name = parts
                    if ui_map_name in ui_maps_by_name:
                        spec = ui_maps_by_name[ui_map_name].get(element_name)
                        if spec:
                            if "primary" in spec:
                                selectors.append(spec["primary"])
                            selectors.extend(spec.get("fallbacks", []))

            # Fallback: try legacy single ui_map lookup or use as direct selector
            if not selectors:
                spec = ui_map.get(target) if ui_map else None
                if spec:
                    if "primary" in spec:
                        selectors.append(spec["primary"])
                    selectors.extend(spec.get("fallbacks", []))
                else:
                    # Treat target as direct CSS selector
                    selectors.append(target)
        return selectors

    def _log(self, message: str):
        self._step_logs.append(message)
        if self.on_log:
            self.on_log(message)

    async def _perform_with_selectors(
        self,
        action: str,
        selectors: list[str],
        fn: Callable,
        timeout: int,
    ) -> str:
        errors: list[str] = []
        for sel in selectors:
            try:
                await fn(sel, timeout)
                return sel
            except PlaywrightTimeoutError as exc:
                errors.append(f"{sel}: timeout")
            except Exception as exc:
                errors.append(f"{sel}: {exc}")
        raise RuntimeError(f"{action} failed for selectors {selectors}: {'; '.join(errors)}")

    async def _run_step(
        self,
        page: Page,
        step: dict,
        ui_map: dict,
        ui_maps_by_name: dict,
        artifact_dir: Path,
        index: int,
        timeout: int,
    ) -> StepResult:
        action = step["action"]
        step_timeout = step.get("timeout") or timeout
        step_timeout = int(step_timeout)
        start_time = asyncio.get_event_loop().time()

        # Clear network requests and logs for this step
        self._step_network_requests = []
        self._step_logs = []

        # Substitute variables in step values
        step_url = self._substitute_variables(step.get("url", ""))
        step_target = self._substitute_variables(step.get("target", ""))
        step_value = self._substitute_variables(step.get("value", ""))

        self._log(f"Executing action: {action}")

        try:
            if action == "goto":
                target_url = resolve_local_url(step_url or step["url"])
                self._log(f"Navigating to: {target_url}")
                await page.goto(target_url, wait_until="load", timeout=step_timeout)
                used_selector = target_url
            elif action == "extract":
                # Extract text from element and save to variable
                var_name = step.get("save_as") or step.get("value", "")
                if not var_name:
                    raise ValueError("extract action requires 'save_as' or 'value' parameter for variable name")
                target = step_target or step.get("target", "")
                if not target:
                    raise ValueError("extract action requires 'target' parameter")

                # Resolve selector
                selectors = self._resolve_selectors(target, ui_map, ui_maps_by_name)
                extracted_text = ""
                for sel in selectors:
                    try:
                        extracted_text = await page.locator(sel).inner_text(timeout=step_timeout)
                        self._log(f"Extracted '{extracted_text}' from '{sel}' -> {{{{var_name}}}}")
                        break
                    except Exception:
                        continue

                self._variables[var_name] = extracted_text.strip()
                used_selector = f"extract:{var_name}={extracted_text[:50]}"
            elif action == "run_scenario":
                # Run another scenario by ID
                scenario_id = step.get("scenario_id") or step_value
                if not scenario_id:
                    raise ValueError("run_scenario action requires 'scenario_id' or 'value' parameter")
                if not self._scenario_loader:
                    raise ValueError("Scenario loader not configured")

                scenario_data = self._scenario_loader(scenario_id)
                if not scenario_data:
                    raise ValueError(f"Scenario '{scenario_id}' not found")

                self._log(f"Running sub-scenario: {scenario_data.get('name', scenario_id)}")

                # Execute sub-scenario steps
                sub_steps = scenario_data.get("steps", [])
                for sub_idx, sub_step in enumerate(sub_steps):
                    if self._cancelled:
                        break
                    sub_result = await self._run_step(
                        page, sub_step, ui_map, ui_maps_by_name, artifact_dir,
                        index * 100 + sub_idx, step_timeout
                    )
                    if sub_result.status == "failed" and not sub_step.get("optional"):
                        if not sub_step.get("continue_on_error"):
                            raise RuntimeError(f"Sub-scenario step failed: {sub_result.error}")

                used_selector = f"run_scenario:{scenario_id}"
            elif action == "upload_file":
                # Upload file to a file input element
                # Supports both direct input[type=file] and click-triggered file choosers
                target = step_target or step.get("target", "")
                file_path = step.get("file_path") or step_value
                if not target:
                    raise ValueError("upload_file action requires 'target' parameter")
                if not file_path:
                    raise ValueError("upload_file action requires 'file_path' or 'value' parameter")

                # Resolve resource:xxx paths
                file_path = resolve_resource_path(file_path, project_id)

                # Resolve selector
                selectors = self._resolve_selectors(target, ui_map, ui_maps_by_name)
                if not selectors:
                    selectors = [target]

                # Verify file exists
                file_path_obj = Path(file_path)
                if not file_path_obj.exists():
                    raise ValueError(f"File not found: {file_path}")

                self._log(f"Uploading file: {file_path}")

                uploaded = False
                # Try each selector
                for sel in selectors:
                    try:
                        locator = page.locator(sel)
                        tag_name = await locator.evaluate("el => el.tagName.toLowerCase()")

                        if tag_name == "input":
                            # Direct file input - use set_input_files (works in headless)
                            await locator.set_input_files(str(file_path_obj), timeout=step_timeout)
                            self._log(f"File uploaded via set_input_files using selector: {sel}")
                        else:
                            # Non-input element (button, div, etc.) - use filechooser event
                            # This handles cases where clicking triggers a file dialog
                            async with page.expect_file_chooser(timeout=step_timeout) as fc_info:
                                await locator.click(timeout=step_timeout)
                            file_chooser = await fc_info.value
                            await file_chooser.set_files(str(file_path_obj))
                            self._log(f"File uploaded via file_chooser using selector: {sel}")

                        uploaded = True
                        break
                    except Exception as e:
                        self._log(f"Failed with selector {sel}: {e}")
                        continue

                if not uploaded:
                    raise RuntimeError(f"Failed to upload file with any selector")

                used_selector = f"upload:{file_path_obj.name}"
            elif action == "paste_image":
                # Paste image from clipboard (simulates Ctrl+V with image)
                file_path = step.get("file_path") or step_value
                if not file_path:
                    raise ValueError("paste_image action requires 'file_path' or 'value' parameter")

                # Resolve resource:xxx paths
                file_path = resolve_resource_path(file_path, project_id)

                file_path_obj = Path(file_path)
                if not file_path_obj.exists():
                    raise ValueError(f"Image file not found: {file_path}")

                self._log(f"Pasting image: {file_path}")

                # Read image file and create data transfer
                import base64
                with open(file_path_obj, "rb") as f:
                    image_data = base64.b64encode(f.read()).decode()

                # Determine MIME type
                ext = file_path_obj.suffix.lower()
                mime_types = {
                    ".png": "image/png",
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".gif": "image/gif",
                    ".webp": "image/webp",
                }
                mime_type = mime_types.get(ext, "image/png")

                # Use JavaScript to simulate paste event with image
                await page.evaluate(f"""
                    async () => {{
                        const base64Data = "{image_data}";
                        const binaryString = atob(base64Data);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {{
                            bytes[i] = binaryString.charCodeAt(i);
                        }}
                        const blob = new Blob([bytes], {{ type: "{mime_type}" }});
                        const file = new File([blob], "{file_path_obj.name}", {{ type: "{mime_type}" }});

                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);

                        const pasteEvent = new ClipboardEvent("paste", {{
                            bubbles: true,
                            cancelable: true,
                            clipboardData: dataTransfer
                        }});

                        document.activeElement.dispatchEvent(pasteEvent);
                    }}
                """)

                used_selector = f"paste:{file_path_obj.name}"
            elif action == "run_js":
                # Execute JavaScript code
                js_code = step_value or step.get("value", "")
                self._log(f"Executing JavaScript: {js_code[:100]}{'...' if len(js_code) > 100 else ''}")
                await page.evaluate(js_code)
                used_selector = "javascript"
            elif action == "screenshot":
                # Just take screenshot without other action
                self._log("Taking screenshot")
                used_selector = "screenshot"
            elif action == "wait":
                # Wait for specified time in ms
                wait_ms = int(step_value or step.get("value", 1000))
                self._log(f"Waiting for {wait_ms}ms")
                await asyncio.sleep(wait_ms / 1000)
                used_selector = f"wait:{wait_ms}ms"
            elif action == "save_auth_state":
                # Save browser auth state (cookies, localStorage, sessionStorage)
                state_name = step.get("state_name") or step_value or "default"
                if not self._project_id:
                    raise ValueError("project_id is required for save_auth_state")
                if not self._context:
                    raise ValueError("Browser context not available for save_auth_state")

                state_path = get_auth_state_path(self._project_id, state_name)
                storage_state = await self._context.storage_state()
                with state_path.open("w", encoding="utf-8") as f:
                    json.dump(storage_state, f, ensure_ascii=False, indent=2)

                self._log(f"Auth state saved to: {state_path}")
                used_selector = f"save_auth_state:{state_name}"
            elif action == "load_auth_state":
                # Load browser auth state (cookies, localStorage, sessionStorage)
                state_name = step.get("state_name") or step_value or "default"
                if not self._project_id:
                    raise ValueError("project_id is required for load_auth_state")
                if not self._context:
                    raise ValueError("Browser context not available for load_auth_state")

                state_path = get_auth_state_path(self._project_id, state_name)
                if not state_path.exists():
                    raise ValueError(f"Auth state not found: {state_name}. Please run save_auth_state first.")

                with state_path.open("r", encoding="utf-8") as f:
                    storage_state = json.load(f)

                # Apply cookies
                if storage_state.get("cookies"):
                    await self._context.add_cookies(storage_state["cookies"])
                    self._log(f"Loaded {len(storage_state['cookies'])} cookies")

                # Apply localStorage and sessionStorage via JavaScript
                for origin_state in storage_state.get("origins", []):
                    origin = origin_state.get("origin", "")
                    local_storage = origin_state.get("localStorage", [])

                    if local_storage and page.url.startswith(origin):
                        # If we're on the same origin, inject localStorage directly
                        for item in local_storage:
                            await page.evaluate(
                                f"localStorage.setItem({json.dumps(item['name'])}, {json.dumps(item['value'])})"
                            )
                        self._log(f"Loaded {len(local_storage)} localStorage items for {origin}")

                self._log(f"Auth state loaded from: {state_path}")
                used_selector = f"load_auth_state:{state_name}"
            elif action == "ensure_auth":
                # Smart auth action: check if logged in, if not run login scenario
                state_name = step.get("state_name") or "default"
                check_url = step.get("check_url") or step.get("url") or ""
                login_scenario_id = step.get("login_scenario_id") or step.get("scenario_id") or ""
                logged_in_selector = step.get("logged_in_selector") or step.get("target") or ""
                login_url_pattern = step.get("login_url_pattern") or "/login"

                if not self._project_id:
                    raise ValueError("project_id is required for ensure_auth")
                if not self._context:
                    raise ValueError("Browser context not available for ensure_auth")
                if not check_url:
                    raise ValueError("ensure_auth requires 'check_url' parameter")
                if not login_scenario_id:
                    raise ValueError("ensure_auth requires 'login_scenario_id' parameter")

                self._log(f"Ensuring auth with state: {state_name}")

                # Step 1: Try to load existing auth state
                state_path = get_auth_state_path(self._project_id, state_name)
                if state_path.exists():
                    self._log(f"Found existing auth state: {state_name}")
                    with state_path.open("r", encoding="utf-8") as f:
                        storage_state = json.load(f)
                    if storage_state.get("cookies"):
                        await self._context.add_cookies(storage_state["cookies"])
                        self._log(f"Loaded {len(storage_state['cookies'])} cookies")
                else:
                    self._log(f"No existing auth state found: {state_name}")

                # Step 2: Navigate to check_url
                target_url = resolve_local_url(check_url)
                self._log(f"Navigating to check URL: {target_url}")
                await page.goto(target_url, wait_until="load", timeout=step_timeout)

                # Step 3: Check if logged in
                is_logged_in = False
                current_url = page.url

                # Check 1: URL should not contain login pattern
                if login_url_pattern and login_url_pattern not in current_url:
                    self._log(f"URL check passed: {current_url} does not contain '{login_url_pattern}'")
                    is_logged_in = True
                else:
                    self._log(f"URL check failed: {current_url} contains '{login_url_pattern}'")

                # Check 2: If selector provided, verify element exists
                if is_logged_in and logged_in_selector:
                    try:
                        selectors = self._resolve_selectors(logged_in_selector, ui_map, ui_maps_by_name)
                        if not selectors:
                            selectors = [logged_in_selector]
                        for sel in selectors:
                            try:
                                await page.locator(sel).wait_for(state="visible", timeout=3000)
                                self._log(f"Logged-in selector found: {sel}")
                                is_logged_in = True
                                break
                            except Exception:
                                continue
                        else:
                            self._log(f"Logged-in selector not found: {logged_in_selector}")
                            is_logged_in = False
                    except Exception as e:
                        self._log(f"Error checking logged-in selector: {e}")
                        is_logged_in = False

                # Step 4: If not logged in, run login scenario
                if not is_logged_in:
                    self._log(f"Not logged in, running login scenario: {login_scenario_id}")

                    if not self._scenario_loader:
                        raise ValueError("Scenario loader not configured")

                    scenario_data = self._scenario_loader(login_scenario_id)
                    if not scenario_data:
                        raise ValueError(f"Login scenario '{login_scenario_id}' not found")

                    # Execute login scenario steps
                    sub_steps = scenario_data.get("steps", [])
                    for sub_idx, sub_step in enumerate(sub_steps):
                        if self._cancelled:
                            break
                        sub_result = await self._run_step(
                            page, sub_step, ui_map, ui_maps_by_name, artifact_dir,
                            index * 100 + sub_idx, step_timeout
                        )
                        if sub_result.status == "failed" and not sub_step.get("optional"):
                            if not sub_step.get("continue_on_error"):
                                raise RuntimeError(f"Login scenario step failed: {sub_result.error}")

                    # Step 5: Save new auth state
                    self._log(f"Login completed, saving auth state: {state_name}")
                    storage_state = await self._context.storage_state()
                    with state_path.open("w", encoding="utf-8") as f:
                        json.dump(storage_state, f, ensure_ascii=False, indent=2)

                    # Navigate back to check_url after login
                    self._log(f"Navigating back to: {target_url}")
                    await page.goto(target_url, wait_until="load", timeout=step_timeout)
                else:
                    self._log(f"Already logged in, skipping login scenario")

                used_selector = f"ensure_auth:{state_name}:{'skipped' if is_logged_in else 'logged_in'}"
            else:
                target = step_target or step.get("target")

                # Use _resolve_selectors helper
                selectors = self._resolve_selectors(target, ui_map, ui_maps_by_name)
                if selectors:
                    self._log(f"Resolved target '{target}' to selectors: {selectors}")

                if not selectors and action not in ("run_js", "screenshot", "wait"):
                    raise ValueError(f"Target '{target}' not found and no selectors available")

                # Use substituted value for action handlers
                action_value = step_value or step.get("value", "")

                async def click_fn(sel: str, to: int):
                    await page.locator(sel).click(timeout=to)

                async def type_fn(sel: str, to: int):
                    locator = page.locator(sel)
                    await locator.fill("", timeout=to)
                    await locator.type(action_value, timeout=to)

                async def fill_fn(sel: str, to: int):
                    await page.locator(sel).fill(action_value, timeout=to)

                async def wait_fn(sel: str, to: int):
                    await page.locator(sel).wait_for(state="visible", timeout=to)

                async def assert_fn(sel: str, to: int):
                    locator = page.locator(sel)
                    await expect(locator).to_contain_text(action_value, timeout=to)

                async def hover_fn(sel: str, to: int):
                    await page.locator(sel).hover(timeout=to)

                async def dblclick_fn(sel: str, to: int):
                    await page.locator(sel).dblclick(timeout=to)

                async def focus_fn(sel: str, to: int):
                    await page.locator(sel).focus(timeout=to)

                async def check_fn(sel: str, to: int):
                    await page.locator(sel).check(timeout=to)

                async def uncheck_fn(sel: str, to: int):
                    await page.locator(sel).uncheck(timeout=to)

                async def select_fn(sel: str, to: int):
                    await page.locator(sel).select_option(action_value, timeout=to)

                async def press_fn(sel: str, to: int):
                    key = action_value or "Enter"
                    await page.locator(sel).press(key, timeout=to)

                async def scroll_fn(sel: str, to: int):
                    await page.locator(sel).scroll_into_view_if_needed(timeout=to)

                dispatch = {
                    "click": click_fn,
                    "type": type_fn,
                    "fill": fill_fn,
                    "wait_for": wait_fn,
                    "assert_text": assert_fn,
                    "hover": hover_fn,
                    "dblclick": dblclick_fn,
                    "focus": focus_fn,
                    "check": check_fn,
                    "uncheck": uncheck_fn,
                    "select": select_fn,
                    "press": press_fn,
                    "scroll": scroll_fn,
                }
                handler = dispatch.get(action)
                if not handler:
                    raise ValueError(f"Unsupported action '{action}'")
                used_selector = await self._perform_with_selectors(action, selectors, handler, step_timeout)

            screenshot_path = artifact_dir / f"{index:02d}_{action}.png"
            await page.screenshot(path=screenshot_path, full_page=True)

            # Wait for all pending network requests to complete (including streaming)
            wait_start = asyncio.get_event_loop().time()
            max_wait = 30  # Maximum wait time in seconds
            while self._pending_requests:
                elapsed = asyncio.get_event_loop().time() - wait_start
                if elapsed > max_wait:
                    pending_count = len(self._pending_requests)
                    self._log(f"Network wait timeout ({max_wait}s), {pending_count} requests still pending")
                    break
                await asyncio.sleep(0.1)
            else:
                elapsed = asyncio.get_event_loop().time() - wait_start
                if elapsed > 0.2:  # Only log if we actually waited
                    self._log(f"All network requests completed ({elapsed:.1f}s)")

            duration = int((asyncio.get_event_loop().time() - start_time) * 1000)

            self._log(f"Completed successfully in {duration}ms")

            return StepResult(
                index=index,
                action=action,
                status="success",
                name=step.get("name"),
                selector=used_selector,
                screenshot=str(screenshot_path),
                duration_ms=duration,
                network_requests=list(self._step_network_requests),
                logs=list(self._step_logs),
            )

        except Exception as exc:
            duration = int((asyncio.get_event_loop().time() - start_time) * 1000)
            self._log(f"Failed with error: {exc}")
            error_shot = artifact_dir / f"{index:02d}_{action}_error.png"
            try:
                await page.screenshot(path=error_shot, full_page=True)
            except Exception:
                pass

            return StepResult(
                index=index,
                action=action,
                status="failed",
                name=step.get("name"),
                error=str(exc),
                screenshot=str(error_shot) if error_shot.exists() else None,
                duration_ms=duration,
                network_requests=list(self._step_network_requests),
                logs=list(self._step_logs),
            )

    def _setup_network_monitoring(self, page: Page):
        async def on_request(request: Request):
            self._pending_requests[request.url] = (asyncio.get_event_loop().time(), request)

        async def on_response(response: Response):
            request = response.request
            if request.url in self._pending_requests:
                start_time, _ = self._pending_requests.pop(request.url)
                duration = int((asyncio.get_event_loop().time() - start_time) * 1000)

                # Try to get response size
                response_size = 0
                try:
                    headers = response.headers
                    if "content-length" in headers:
                        response_size = int(headers["content-length"])
                except Exception:
                    pass

                net_req = NetworkRequest(
                    url=request.url,
                    method=request.method,
                    status=response.status,
                    duration_ms=duration,
                    response_size=response_size,
                )

                # Add to step-level collection
                self._step_network_requests.append(net_req)

                if self.on_network:
                    self.on_network(net_req)

        async def on_request_failed(request: Request):
            if request.url in self._pending_requests:
                start_time, _ = self._pending_requests.pop(request.url)
                duration = int((asyncio.get_event_loop().time() - start_time) * 1000)

                net_req = NetworkRequest(
                    url=request.url,
                    method=request.method,
                    duration_ms=duration,
                    error=request.failure,
                )

                # Add to step-level collection
                self._step_network_requests.append(net_req)

                if self.on_network:
                    self.on_network(net_req)

        page.on("request", on_request)
        page.on("response", on_response)
        page.on("requestfailed", on_request_failed)

    async def run(
        self,
        steps: list[dict],
        ui_map: dict = None,
        ui_maps_by_name: dict = None,
        goal: str = "",
        timeout: int = 5000,
        headed: bool = False,
        record_video: bool = True,
        artifact_root: Optional[Path] = None,
        project_id: Optional[str] = None,
        scenario_id: Optional[str] = None,
        browser_channel: Optional[str] = None,
        browser_user_data_dir: Optional[str] = None,
        browser_args: Optional[list[str]] = None,
    ) -> RunResult:
        ui_map = ui_map or {}
        ui_maps_by_name = ui_maps_by_name or {}
        run_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        artifact_dir = artifact_root or Path("artifacts") / f"{timestamp}_{run_id}"
        artifact_dir.mkdir(parents=True, exist_ok=True)

        result = RunResult(
            run_id=run_id,
            status="running",
            goal=goal,
            project_id=project_id,
            scenario_id=scenario_id,
            start_time=datetime.now().isoformat(),
            artifact_dir=str(artifact_dir),
        )

        self._log(f"[runner] Starting run {run_id}, goal: {goal}")
        self._log(f"[runner] Steps: {len(steps)}, artifacts -> {artifact_dir}")
        if browser_channel:
            self._log(f"[runner] Using browser channel: {browser_channel}")

        start_time = asyncio.get_event_loop().time()

        async with async_playwright() as p:
            # Configure context options for video recording
            context_options = {"headless": not headed}
            if record_video:
                video_dir = artifact_dir / "videos"
                video_dir.mkdir(exist_ok=True)
                context_options["record_video_dir"] = str(video_dir)
                context_options["record_video_size"] = {"width": 1280, "height": 720}

            # Build launch args from project configuration
            launch_args = list(browser_args) if browser_args else []

            # Use persistent context if user_data_dir is specified
            if browser_user_data_dir:
                self._log(f"[runner] Using persistent browser profile: {browser_user_data_dir}")

                launch_options = {
                    **context_options,
                    "args": launch_args if launch_args else None,
                    "no_viewport": True,  # Behave more like a real browser
                    "slow_mo": 100,  # Add slight delay between actions
                }
                if browser_channel:
                    launch_options["channel"] = browser_channel
                # Remove None values
                launch_options = {k: v for k, v in launch_options.items() if v is not None}

                context = await p.chromium.launch_persistent_context(
                    browser_user_data_dir,
                    **launch_options
                )
                browser = None  # No separate browser object in persistent context mode
                page = context.pages[0] if context.pages else await context.new_page()
            else:
                # Standard launch mode
                launch_options = {"headless": not headed}
                if browser_channel:
                    launch_options["channel"] = browser_channel
                if launch_args:
                    launch_options["args"] = launch_args

                browser = await p.chromium.launch(**launch_options)
                context = await browser.new_context(**{k: v for k, v in context_options.items() if k != "headless"})
                page = await context.new_page()

            # Store context and project_id for auth state operations
            self._context = context
            self._project_id = project_id

            self._setup_network_monitoring(page)

            for idx, step in enumerate(steps):
                if self._cancelled:
                    self._log(f"[runner] Cancelled at step {idx + 1}")
                    result.status = "cancelled"
                    break

                self._log(f"[runner] Step {idx + 1}/{len(steps)}: {step['action']}")

                if self.on_step_start:
                    self.on_step_start(idx, step)

                step_result = await self._run_step(page, step, ui_map, ui_maps_by_name, artifact_dir, idx, timeout)
                result.steps.append(step_result)

                if self.on_step_end:
                    self.on_step_end(step_result)

                if step_result.status == "failed":
                    self._log(f"[runner] Step failed: {step_result.error}")

                    # Check step options
                    is_optional = step.get("optional", False)
                    continue_on_error = step.get("continue_on_error", False)

                    if not is_optional:
                        # Only mark run as failed if step is not optional
                        result.status = "failed"

                    if not continue_on_error:
                        # Stop execution unless continue_on_error is set
                        break
                    else:
                        self._log(f"[runner] Continuing after failed step (continue_on_error=True)")
                else:
                    self._log(f"[runner] Step completed: {step_result.selector}")

            # Get video path before closing (video is finalized on page close)
            video_path = None
            if record_video and page.video:
                try:
                    video_path = await page.video.path()
                    result.video_path = str(video_path)
                    self._log(f"[runner] Video recorded: {video_path}")
                except Exception as e:
                    self._log(f"[runner] Failed to get video path: {e}")

            await context.close()
            if browser:
                await browser.close()

        result.end_time = datetime.now().isoformat()
        result.total_duration_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)

        if result.status == "running":
            result.status = "completed"

        # Save result to file
        result_path = artifact_dir / "result.json"
        with result_path.open("w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)

        self._log(f"[runner] Run {result.status}, total duration: {result.total_duration_ms}ms")

        return result
