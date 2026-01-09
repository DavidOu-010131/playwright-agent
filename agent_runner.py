import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright, expect


def load_ui_map(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    elements = data.get("elements", {})
    if not isinstance(elements, dict):
        raise ValueError("ui_map elements must be a mapping")
    return elements


def load_scenario(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def build_artifact_dir(root: Optional[Path]) -> Path:
    if root:
        return root
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return Path("artifacts") / timestamp


def resolve_local_url(url: str) -> str:
    if url.startswith("http://") or url.startswith("https://") or url.startswith("file://"):
        return url
    abs_path = (Path.cwd() / url).resolve()
    return abs_path.as_uri()


async def perform_with_selectors(
    action: str,
    selectors: List[str],
    fn,
    timeout: int,
) -> str:
    errors: List[str] = []
    for sel in selectors:
        try:
            await fn(sel, timeout)
            return sel
        except PlaywrightTimeoutError as exc:
            errors.append(f"{sel}: timeout ({exc})")
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{sel}: {exc}")
    raise RuntimeError(f"{action} failed for selectors {selectors}: {'; '.join(errors)}")


async def run_step(page, step: Dict[str, Any], ui_map: Dict[str, Any], artifact_dir: Path, index: int, timeout: int):
    action = step["action"]
    step_timeout = int(step.get("timeout", timeout))

    if action == "goto":
        target_url = resolve_local_url(step["url"])
        await page.goto(target_url, wait_until="load", timeout=step_timeout)
        used_selector = target_url
    else:
        target = step["target"]
        spec = ui_map.get(target)
        if not spec:
            raise KeyError(f"Target '{target}' not found in ui_map")
        selectors = []
        if "primary" in spec:
            selectors.append(spec["primary"])
        selectors.extend(spec.get("fallbacks", []))
        if not selectors:
            raise ValueError(f"Target '{target}' has no selectors")

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

        dispatch = {
            "click": click_fn,
            "type": type_fn,
            "fill": fill_fn,
            "wait_for": wait_fn,
            "assert_text": assert_fn,
        }
        handler = dispatch.get(action)
        if not handler:
            raise ValueError(f"Unsupported action '{action}'")
        used_selector = await perform_with_selectors(action, selectors, handler, step_timeout)

    screenshot_path = artifact_dir / f"{index:02d}_{action}.png"
    await page.screenshot(path=screenshot_path, full_page=True)
    return used_selector, screenshot_path


async def run_scenario(scenario_path: Path, ui_map_path: Path, artifact_root: Optional[Path], timeout: int, headed: bool):
    ui_map = load_ui_map(ui_map_path)
    scenario = load_scenario(scenario_path)
    steps = scenario.get("steps", [])
    artifact_dir = build_artifact_dir(artifact_root)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    print(f"[agent] goal: {scenario.get('goal', 'no goal provided')}")
    print(f"[agent] steps: {len(steps)}; artifacts -> {artifact_dir}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not headed)
        context = await browser.new_context()
        page = await context.new_page()
        for idx, step in enumerate(steps):
            label = f"step {idx+1}/{len(steps)} {step['action']}"
            print(f"[agent] {label} ...", end=" ", flush=True)
            try:
                selector, screenshot = await run_step(page, step, ui_map, artifact_dir, idx, timeout)
                print(f"ok ({selector}) -> {screenshot}")
            except Exception as exc:  # noqa: BLE001
                error_shot = artifact_dir / f"{idx:02d}_{step['action']}_error.png"
                try:
                    await page.screenshot(path=error_shot, full_page=True)
                except Exception:  # noqa: BLE001
                    pass
                print(f"failed: {exc}")
                await browser.close()
                return 1
        await browser.close()
    print("[agent] scenario completed")
    return 0


def parse_args(argv: List[str]):
    parser = argparse.ArgumentParser(description="Minimal Playwright DSL runner (Python).")
    parser.add_argument("scenario", type=Path, help="Path to scenario JSON file.")
    parser.add_argument("ui_map", type=Path, help="Path to UI map YAML file.")
    parser.add_argument("--artifacts", type=Path, help="Directory to store screenshots.")
    parser.add_argument("--timeout", type=int, default=5000, help="Default timeout per step (ms).")
    parser.add_argument("--headed", action="store_true", help="Run with browser window.")
    return parser.parse_args(argv)


def main(argv: List[str]) -> int:
    args = parse_args(argv)
    try:
        return asyncio.run(
            run_scenario(
                scenario_path=args.scenario,
                ui_map_path=args.ui_map,
                artifact_root=args.artifacts,
                timeout=args.timeout,
                headed=args.headed,
            )
        )
    except KeyboardInterrupt:
        print("\n[agent] interrupted")
        return 130


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
