# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A minimal Python Playwright + DSL-based browser automation agent. It executes test scenarios defined in JSON, using element locators from YAML UI maps. Designed to work offline with local HTML files.

## Commands

```bash
# Install dependencies
pip install -r requirements.txt
python -m playwright install

# Run a scenario (headless, screenshots saved to artifacts/)
python agent_runner.py samples/scenario.json samples/ui_map.yaml

# Run with visible browser window
python agent_runner.py samples/scenario.json samples/ui_map.yaml --headed

# Custom artifacts directory and timeout
python agent_runner.py samples/scenario.json samples/ui_map.yaml --artifacts my_run/ --timeout 10000
```

## Architecture

**Single-file runner** (`agent_runner.py`):
- Loads scenario JSON (steps array) and UI map YAML (element selectors)
- Executes steps via Playwright async API
- Supports fallback selectors: tries primary selector first, then fallbacks in order
- Takes screenshot after each step, saves to timestamped `artifacts/` subdirectory

**DSL Actions**: `goto`, `click`, `type`, `fill`, `wait_for`, `assert_text`

**UI Map Structure**:
```yaml
elements:
  element_name:
    primary: "[data-test='selector']"
    fallbacks:
      - "#fallback-id"
```

**Scenario Structure**:
```json
{
  "goal": "description",
  "steps": [
    {"action": "goto", "url": "path/to/page.html"},
    {"action": "click", "target": "element_name"},
    {"action": "type", "target": "element_name", "value": "text"}
  ]
}
```

**URL Resolution**: Non-http/https/file URLs are resolved as local file paths relative to cwd.
