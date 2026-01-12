# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered browser automation testing platform. Python Playwright execution engine with FastAPI backend, React frontend for visual management. Executes DSL-based test scenarios using element locators from YAML UI maps.

## Commands

```bash
# Backend setup and run
pip install -r requirements.txt
python -m playwright install
cd server && uvicorn main:app --reload --port 8000

# Frontend setup and run
cd web && npm install && npm run dev  # http://localhost:5173

# Lint frontend
cd web && npm run lint

# Build frontend for production
cd web && npm run build
```

## Architecture

### Backend (server/)

**FastAPI entry point** (`main.py`): Mounts API routers and serves artifacts static files.

**API Routes** (`api/`):
- `project.py` - CRUD for projects with multi-environment config (dev/test/prod), browser settings
- `ui_map.py` - Element selector management (primary + fallback selectors)
- `scenario.py` - Test scenario CRUD with step arrays
- `runner.py` - WebSocket endpoint for real-time execution with progress streaming
- `resource.py` - File upload management for test resources
- `schemas.py` - Pydantic models for API validation

**Execution Engine** (`core/executor.py`):
- `ExecutionEngine` class runs scenarios with callbacks for step progress, network events, logs
- Supports fallback selectors: tries primary first, then fallbacks in order
- Network request monitoring per step
- Video recording and screenshots after each step
- Variable extraction and substitution (`{{variable}}` syntax)
- Sub-scenario execution via `run_scenario` action

### Frontend (web/src/)

React 18 + TypeScript with Vite. Uses TanStack Query for data fetching, shadcn/ui + Tailwind CSS for UI.

**Key directories**:
- `pages/` - Route components (project list, project detail, scenario editor, run history)
- `components/` - Reusable UI components
- `api/` - API client functions
- `hooks/` - Custom React hooks
- `i18n/` - Internationalization (English/Chinese)

### Data Storage

File-based JSON storage in `data/`:
- `projects/` - Project configs
- `scenarios/` - Test scenarios
- `ui_maps/` - Element selectors
- `resources/` - Uploaded test files
- `runs/` - Execution history

Artifacts (screenshots, videos) saved to `artifacts/` with timestamped subdirectories.

## DSL Actions

| Action | Parameters | Description |
|--------|------------|-------------|
| `goto` | `url` | Navigate to URL (local paths auto-resolved) |
| `click` | `target` | Click element |
| `fill` | `target`, `value` | Clear and fill input |
| `type` | `target`, `value` | Type character by character |
| `wait_for` | `target` | Wait for element visible |
| `assert_text` | `target`, `value` | Assert element contains text |
| `hover`, `dblclick`, `focus`, `scroll` | `target` | Element interactions |
| `check`, `uncheck` | `target` | Checkbox operations |
| `select` | `target`, `value` | Dropdown selection |
| `press` | `target`, `value` | Keyboard key press |
| `wait` | `value` (ms) | Wait fixed duration |
| `run_js` | `value` | Execute JavaScript |
| `extract` | `target`, `save_as` | Extract text to variable |
| `upload_file` | `target`, `file_path` | File upload |
| `run_scenario` | `scenario_id` | Execute sub-scenario |

## Step Options

Each step supports:
- `continue_on_error`: Continue execution after failure
- `optional`: Step failure doesn't fail the run
- `timeout`: Custom timeout in milliseconds

## UI Map Format

```yaml
elements:
  element_name:
    primary: "[data-test='selector']"
    fallbacks:
      - "#fallback-id"
      - ".class-selector"
```

Target resolution: `uiMapName.elementName` or direct CSS selector.
