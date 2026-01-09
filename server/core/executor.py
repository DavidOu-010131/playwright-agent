import asyncio
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Optional
from dataclasses import dataclass, field, asdict

from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright, expect, Page, Request, Response


def _setup_browser_permissions(user_data_dir: str, origins: list[str] = None):
    """
    Pre-configure Chrome permissions in the user data directory.
    This allows granting local network access without GUI interaction.

    Args:
        user_data_dir: Path to Chrome user data directory
        origins: List of origins to grant permissions for.
                 If None, grants wildcard permissions.
    """
    prefs_dir = Path(user_data_dir) / "Default"
    prefs_dir.mkdir(parents=True, exist_ok=True)
    prefs_file = prefs_dir / "Preferences"

    # Load existing preferences or create new
    prefs = {}
    if prefs_file.exists():
        try:
            with prefs_file.open("r", encoding="utf-8") as f:
                prefs = json.load(f)
        except (json.JSONDecodeError, IOError):
            prefs = {}

    # Ensure nested structure exists
    if "profile" not in prefs:
        prefs["profile"] = {}
    if "content_settings" not in prefs["profile"]:
        prefs["profile"]["content_settings"] = {}
    if "exceptions" not in prefs["profile"]["content_settings"]:
        prefs["profile"]["content_settings"]["exceptions"] = {}

    exceptions = prefs["profile"]["content_settings"]["exceptions"]

    # Permission setting value: 1 = allow, 2 = block
    permission_value = {"setting": 1, "last_modified": str(int(datetime.now().timestamp() * 1000))}

    # Set up local_network permission (for "Access local network" prompt)
    if "local_network" not in exceptions:
        exceptions["local_network"] = {}

    # Grant permission for specified origins or use wildcard
    if origins:
        for origin in origins:
            # Chrome uses origin pattern like "https://example.com,*"
            exceptions["local_network"][f"{origin},*"] = permission_value
    else:
        # Wildcard pattern to allow all origins
        exceptions["local_network"]["*,*"] = permission_value

    # Also set "private_network_access" if it exists
    if "private_network_access" not in exceptions:
        exceptions["private_network_access"] = {}

    if origins:
        for origin in origins:
            exceptions["private_network_access"][f"{origin},*"] = permission_value
    else:
        exceptions["private_network_access"]["*,*"] = permission_value

    # Write back preferences
    with prefs_file.open("w", encoding="utf-8") as f:
        json.dump(prefs, f, ensure_ascii=False, indent=2)

    return True


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

    def cancel(self):
        self._cancelled = True

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

        self._log(f"Executing action: {action}")

        try:
            if action == "goto":
                target_url = resolve_local_url(step["url"])
                self._log(f"Navigating to: {target_url}")
                await page.goto(target_url, wait_until="load", timeout=step_timeout)
                used_selector = target_url
            elif action == "run_js":
                # Execute JavaScript code
                js_code = step.get("value", "")
                self._log(f"Executing JavaScript: {js_code[:100]}{'...' if len(js_code) > 100 else ''}")
                await page.evaluate(js_code)
                used_selector = "javascript"
            elif action == "screenshot":
                # Just take screenshot without other action
                self._log("Taking screenshot")
                used_selector = "screenshot"
            elif action == "wait":
                # Wait for specified time in ms
                wait_ms = int(step.get("value", 1000))
                self._log(f"Waiting for {wait_ms}ms")
                await asyncio.sleep(wait_ms / 1000)
                used_selector = f"wait:{wait_ms}ms"
            else:
                target = step.get("target")

                # Get selectors from ui_maps_by_name or use target as direct selector
                # Target format can be: "uiMapName.elementName" or direct CSS selector
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
                                    self._log(f"Resolved target '{target}' to selectors: {selectors}")

                    # Fallback: try legacy single ui_map lookup or use as direct selector
                    if not selectors:
                        spec = ui_map.get(target) if ui_map else None
                        if spec:
                            if "primary" in spec:
                                selectors.append(spec["primary"])
                            selectors.extend(spec.get("fallbacks", []))
                            self._log(f"Resolved target '{target}' from legacy UI Map: {selectors}")
                        else:
                            # Treat target as direct CSS selector
                            selectors.append(target)
                            self._log(f"Using direct selector: {target}")

                if not selectors and action not in ("run_js", "screenshot", "wait"):
                    raise ValueError(f"Target '{target}' not found and no selectors available")

                async def click_fn(sel: str, to: int):
                    await page.locator(sel).click(timeout=to)

                async def type_fn(sel: str, to: int):
                    value = step.get("value", "")
                    locator = page.locator(sel)
                    await locator.fill("", timeout=to)
                    await locator.type(value, timeout=to)

                async def fill_fn(sel: str, to: int):
                    value = step.get("value", "")
                    await page.locator(sel).fill(value, timeout=to)

                async def wait_fn(sel: str, to: int):
                    await page.locator(sel).wait_for(state="visible", timeout=to)

                async def assert_fn(sel: str, to: int):
                    locator = page.locator(sel)
                    await expect(locator).to_contain_text(step["value"], timeout=to)

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
                    value = step.get("value", "")
                    await page.locator(sel).select_option(value, timeout=to)

                async def press_fn(sel: str, to: int):
                    key = step.get("value", "Enter")
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
        disable_private_network_access: bool = False,
        browser_user_data_dir: Optional[str] = None,
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

            # Build launch args
            launch_args = []
            if disable_private_network_access:
                launch_args.extend([
                    # Disable Private Network Access preflight checks and permission prompt
                    "--disable-features=PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessPermissionPrompt",
                    "--enable-features=PrivateNetworkAccessNonSecureContextsAllowed",
                    # Additional flags to prevent permission prompts
                    "--disable-site-isolation-trials",
                    "--allow-running-insecure-content",
                ])
                self._log("[runner] Private Network Access checks disabled")

            # Use persistent context if user_data_dir is specified
            if browser_user_data_dir:
                self._log(f"[runner] Using persistent browser profile: {browser_user_data_dir}")

                # Pre-configure browser permissions for local network access
                if disable_private_network_access:
                    try:
                        _setup_browser_permissions(browser_user_data_dir)
                        self._log("[runner] Pre-configured local network permissions in browser profile")
                    except Exception as e:
                        self._log(f"[runner] Warning: Failed to setup browser permissions: {e}")

                launch_options = {
                    **context_options,
                    "args": launch_args if launch_args else None,
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
