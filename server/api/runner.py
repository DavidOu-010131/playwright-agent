import asyncio
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel, Field

from server.core.executor import ExecutionEngine, StepResult, NetworkRequest, RunResult

router = APIRouter()

# Store active runs
_active_runs: dict[str, ExecutionEngine] = {}
_run_results: dict[str, dict] = {}

DATA_DIR = Path(__file__).parent.parent.parent / "data"
UI_MAPS_DIR = DATA_DIR / "ui_maps"
SCENARIOS_DIR = DATA_DIR / "scenarios"
RUNS_DIR = DATA_DIR / "runs"
PROJECTS_DIR = DATA_DIR / "projects"
RUNS_DIR.mkdir(parents=True, exist_ok=True)


def _load_all_runs():
    """Load all persisted run results on startup."""
    for path in RUNS_DIR.glob("*.json"):
        try:
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
                _run_results[data["run_id"]] = data
        except Exception:
            pass


def _save_run(run_result: RunResult):
    """Save run result to file and memory."""
    data = run_result.to_dict()
    _run_results[run_result.run_id] = data
    path = RUNS_DIR / f"{run_result.run_id}.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# Load existing runs on module load
_load_all_runs()


class RunRequest(BaseModel):
    ui_map_id: str = Field(..., description="UI Map ID to use")
    steps: list[dict] = Field(..., description="Steps to execute")
    goal: str = Field(default="", description="Test goal description")
    timeout: int = Field(default=5000, description="Default timeout per step (ms)")
    headed: bool = Field(default=False, description="Run with visible browser")


class QuickRunRequest(BaseModel):
    url: str = Field(..., description="URL to navigate to")
    ui_map_id: Optional[str] = Field(None, description="Optional UI Map ID")
    steps: list[dict] = Field(default_factory=list, description="Steps to execute after goto")
    timeout: int = Field(default=5000)
    headed: bool = Field(default=False)


def _load_ui_map(ui_map_id: str) -> dict:
    path = UI_MAPS_DIR / f"{ui_map_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"UI Map '{ui_map_id}' not found")
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("elements", {})


def _load_scenario(scenario_id: str) -> dict:
    path = SCENARIOS_DIR / f"{scenario_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _load_project(project_id: str) -> Optional[dict]:
    """Load project data by ID."""
    path = PROJECTS_DIR / f"{project_id}.json"
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _load_project_ui_maps(project_id: str) -> dict:
    """Load all UI Maps for a project, keyed by UI Map name."""
    ui_maps_by_name = {}
    for path in UI_MAPS_DIR.glob("*.json"):
        try:
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("project_id") == project_id:
                    ui_map_name = data.get("name", path.stem)
                    ui_maps_by_name[ui_map_name] = data.get("elements", {})
        except Exception:
            pass
    return ui_maps_by_name


class ScenarioRunRequest(BaseModel):
    headed: bool = Field(default=False, description="Run with visible browser")
    record_video: bool = Field(default=False, description="Record video of the run")
    timeout: int = Field(default=5000, description="Default timeout per step (ms)")
    environment_base_url: Optional[str] = Field(default=None, description="Environment base URL to prepend as first goto step")


@router.post("/start")
async def start_run(request: RunRequest):
    """Start a test execution."""
    ui_map = _load_ui_map(request.ui_map_id)

    engine = ExecutionEngine()

    # Run in background
    async def run_task():
        result = await engine.run(
            steps=request.steps,
            ui_map=ui_map,
            goal=request.goal,
            timeout=request.timeout,
            headed=request.headed,
        )
        _save_run(result)
        if result.run_id in _active_runs:
            del _active_runs[result.run_id]
        return result

    task = asyncio.create_task(run_task())

    # Wait briefly to get run_id
    await asyncio.sleep(0.1)

    # For now, run synchronously and return result
    result = await task

    return {
        "run_id": result.run_id,
        "status": result.status,
        "artifact_dir": result.artifact_dir,
        "steps": [
            {
                "index": s.index,
                "action": s.action,
                "status": s.status,
                "selector": s.selector,
                "error": s.error,
                "duration_ms": s.duration_ms,
            }
            for s in result.steps
        ],
        "total_duration_ms": result.total_duration_ms,
    }


@router.post("/quick")
async def quick_run(request: QuickRunRequest):
    """Quick run: navigate to URL and optionally execute steps."""
    ui_map = {}
    if request.ui_map_id:
        ui_map = _load_ui_map(request.ui_map_id)

    steps = [{"action": "goto", "url": request.url}] + request.steps

    engine = ExecutionEngine()
    result = await engine.run(
        steps=steps,
        ui_map=ui_map,
        goal=f"Quick run: {request.url}",
        timeout=request.timeout,
        headed=request.headed,
    )

    _save_run(result)

    return {
        "run_id": result.run_id,
        "status": result.status,
        "artifact_dir": result.artifact_dir,
        "steps": [
            {
                "index": s.index,
                "action": s.action,
                "status": s.status,
                "selector": s.selector,
                "error": s.error,
                "duration_ms": s.duration_ms,
            }
            for s in result.steps
        ],
        "total_duration_ms": result.total_duration_ms,
    }


@router.post("/scenario/{scenario_id}")
async def run_scenario(scenario_id: str, request: ScenarioRunRequest):
    """Run a scenario by ID."""
    scenario = _load_scenario(scenario_id)

    # Load all UI Maps for the project (keyed by name)
    project_id = scenario.get("project_id")
    ui_maps_by_name = {}
    browser_channel = None
    if project_id:
        ui_maps_by_name = _load_project_ui_maps(project_id)
        # Load project to get browser_channel setting
        project = _load_project(project_id)
        if project:
            browser_channel = project.get("browser_channel")

    steps = scenario.get("steps", [])

    # If environment_base_url is provided, prepend a goto step
    if request.environment_base_url:
        goto_step = {"action": "goto", "url": request.environment_base_url}
        steps = [goto_step] + steps

    if not steps:
        raise HTTPException(status_code=400, detail="Scenario has no steps to execute")

    engine = ExecutionEngine()
    result = await engine.run(
        steps=steps,
        ui_maps_by_name=ui_maps_by_name,
        goal=f"Scenario: {scenario.get('name', scenario_id)}",
        timeout=request.timeout,
        headed=request.headed,
        record_video=request.record_video,
        project_id=project_id,
        scenario_id=scenario_id,
        browser_channel=browser_channel,
    )

    _save_run(result)

    return {
        "run_id": result.run_id,
        "status": result.status,
        "artifact_dir": result.artifact_dir,
        "video_path": result.video_path,
        "steps": [
            {
                "index": s.index,
                "action": s.action,
                "status": s.status,
                "selector": s.selector,
                "error": s.error,
                "duration_ms": s.duration_ms,
            }
            for s in result.steps
        ],
        "total_duration_ms": result.total_duration_ms,
    }


@router.get("/status/{run_id}")
async def get_run_status(run_id: str):
    """Get status of a run."""
    if run_id in _run_results:
        data = _run_results[run_id]
        return {
            "run_id": data["run_id"],
            "status": data["status"],
            "goal": data.get("goal", ""),
            "artifact_dir": data.get("artifact_dir", ""),
            "total_duration_ms": data.get("total_duration_ms", 0),
            "steps_count": len(data.get("steps", [])),
            "start_time": data.get("start_time"),
            "end_time": data.get("end_time"),
        }
    if run_id in _active_runs:
        return {"run_id": run_id, "status": "running"}
    raise HTTPException(status_code=404, detail="Run not found")


@router.get("/result/{run_id}")
async def get_run_result(run_id: str):
    """Get full result of a completed run."""
    if run_id not in _run_results:
        raise HTTPException(status_code=404, detail="Run not found")

    return _run_results[run_id]


@router.get("/list")
async def list_runs(project_id: Optional[str] = None, scenario_id: Optional[str] = None):
    """List recent runs, optionally filtered by project_id or scenario_id."""
    runs = []
    for run_id, data in _run_results.items():
        # Filter by project_id if provided
        if project_id:
            if data.get("project_id") != project_id:
                continue
        # Filter by scenario_id if provided
        if scenario_id:
            if data.get("scenario_id") != scenario_id:
                continue
        runs.append({
            "run_id": data["run_id"],
            "status": data["status"],
            "goal": data.get("goal", ""),
            "project_id": data.get("project_id"),
            "scenario_id": data.get("scenario_id"),
            "start_time": data.get("start_time"),
            "end_time": data.get("end_time"),
            "total_duration_ms": data.get("total_duration_ms", 0),
            "steps_count": len(data.get("steps", [])),
            "artifact_dir": data.get("artifact_dir", ""),
        })
    return sorted(runs, key=lambda x: x.get("start_time", ""), reverse=True)[:50]  # Limit to 50 recent runs


@router.post("/cancel/{run_id}")
async def cancel_run(run_id: str):
    """Cancel a running test."""
    if run_id in _active_runs:
        _active_runs[run_id].cancel()
        return {"status": "cancelling", "run_id": run_id}
    raise HTTPException(status_code=404, detail="Run not found or already completed")


@router.websocket("/ws/{run_id}")
async def websocket_run(websocket: WebSocket, run_id: str):
    """WebSocket endpoint for real-time run updates."""
    await websocket.accept()

    logs: list[str] = []
    steps: list[dict] = []
    network: list[dict] = []

    def on_log(message: str):
        logs.append(message)

    def on_step_start(index: int, step: dict):
        pass

    def on_step_end(result: StepResult):
        steps.append({
            "index": result.index,
            "action": result.action,
            "status": result.status,
            "selector": result.selector,
            "error": result.error,
            "duration_ms": result.duration_ms,
            "screenshot": result.screenshot,
        })

    def on_network(req: NetworkRequest):
        network.append({
            "url": req.url,
            "method": req.method,
            "status": req.status,
            "duration_ms": req.duration_ms,
            "error": req.error,
        })

    try:
        # Receive run configuration
        data = await websocket.receive_json()
        ui_map_id = data.get("ui_map_id")
        run_steps = data.get("steps", [])
        goal = data.get("goal", "")
        timeout = data.get("timeout", 5000)
        headed = data.get("headed", False)

        ui_map = {}
        if ui_map_id:
            ui_map = _load_ui_map(ui_map_id)

        engine = ExecutionEngine(
            on_step_start=on_step_start,
            on_step_end=on_step_end,
            on_network=on_network,
            on_log=on_log,
        )

        _active_runs[run_id] = engine

        # Send updates periodically while running
        async def send_updates():
            last_log_idx = 0
            last_step_idx = 0
            last_net_idx = 0

            while run_id in _active_runs:
                updates = {}

                if len(logs) > last_log_idx:
                    updates["logs"] = logs[last_log_idx:]
                    last_log_idx = len(logs)

                if len(steps) > last_step_idx:
                    updates["steps"] = steps[last_step_idx:]
                    last_step_idx = len(steps)

                if len(network) > last_net_idx:
                    updates["network"] = network[last_net_idx:]
                    last_net_idx = len(network)

                if updates:
                    await websocket.send_json(updates)

                await asyncio.sleep(0.1)

        update_task = asyncio.create_task(send_updates())

        result = await engine.run(
            steps=run_steps,
            ui_map=ui_map,
            goal=goal,
            timeout=timeout,
            headed=headed,
        )

        _save_run(result)

        if run_id in _active_runs:
            del _active_runs[run_id]

        update_task.cancel()

        # Send final result
        await websocket.send_json({
            "type": "complete",
            "result": {
                "run_id": result.run_id,
                "status": result.status,
                "total_duration_ms": result.total_duration_ms,
                "artifact_dir": result.artifact_dir,
            },
        })

    except WebSocketDisconnect:
        if run_id in _active_runs:
            _active_runs[run_id].cancel()
            del _active_runs[run_id]
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
    finally:
        await websocket.close()


@router.websocket("/ws/scenario/{scenario_id}")
async def websocket_run_scenario(websocket: WebSocket, scenario_id: str):
    """WebSocket endpoint for real-time scenario execution."""
    await websocket.accept()

    steps_progress: list[dict] = []
    current_step_index = -1

    def on_log(message: str):
        pass  # We focus on step updates

    def on_step_start(index: int, step: dict):
        nonlocal current_step_index
        current_step_index = index
        # Send step start notification
        asyncio.create_task(websocket.send_json({
            "type": "step_start",
            "index": index,
            "step": step,
        }))

    def on_step_end(result: StepResult):
        # Convert network requests to dict
        network_data = [
            {
                "url": req.url,
                "method": req.method,
                "status": req.status,
                "duration_ms": req.duration_ms,
                "response_size": req.response_size,
                "error": req.error,
            }
            for req in result.network_requests
        ]
        step_data = {
            "index": result.index,
            "action": result.action,
            "status": result.status,
            "selector": result.selector,
            "error": result.error,
            "duration_ms": result.duration_ms,
            "screenshot": result.screenshot,
            "network_requests": network_data,
            "logs": result.logs,
        }
        steps_progress.append(step_data)
        # Send step end notification
        asyncio.create_task(websocket.send_json({
            "type": "step_end",
            "step": step_data,
        }))

    def on_network(req: NetworkRequest):
        pass  # Skip network updates for now

    try:
        # Receive run configuration
        data = await websocket.receive_json()
        headed = data.get("headed", False)
        record_video = data.get("record_video", False)
        timeout = data.get("timeout", 5000)
        environment_base_url = data.get("environment_base_url")

        # Load scenario
        scenario = _load_scenario(scenario_id)
        project_id = scenario.get("project_id")
        ui_maps_by_name = {}
        browser_channel = None
        if project_id:
            ui_maps_by_name = _load_project_ui_maps(project_id)
            # Load project to get browser_channel setting
            project = _load_project(project_id)
            if project:
                browser_channel = project.get("browser_channel")

        steps = scenario.get("steps", [])

        # If environment_base_url is provided, prepend a goto step
        if environment_base_url:
            goto_step = {"action": "goto", "url": environment_base_url}
            steps = [goto_step] + steps

        if not steps:
            await websocket.send_json({"type": "error", "message": "Scenario has no steps"})
            await websocket.close()
            return

        # Send initial info
        await websocket.send_json({
            "type": "start",
            "scenario_name": scenario.get("name", scenario_id),
            "total_steps": len(steps),
            "steps": steps,
        })

        engine = ExecutionEngine(
            on_step_start=on_step_start,
            on_step_end=on_step_end,
            on_network=on_network,
            on_log=on_log,
        )

        run_id = f"{scenario_id[:8]}"
        _active_runs[run_id] = engine

        result = await engine.run(
            steps=steps,
            ui_maps_by_name=ui_maps_by_name,
            goal=f"Scenario: {scenario.get('name', scenario_id)}",
            timeout=timeout,
            headed=headed,
            record_video=record_video,
            project_id=project_id,
            scenario_id=scenario_id,
            browser_channel=browser_channel,
        )

        _save_run(result)

        if run_id in _active_runs:
            del _active_runs[run_id]

        # Send final result
        await websocket.send_json({
            "type": "complete",
            "result": {
                "run_id": result.run_id,
                "status": result.status,
                "total_duration_ms": result.total_duration_ms,
                "artifact_dir": result.artifact_dir,
                "video_path": result.video_path,
                "steps": [
                    {
                        "index": s.index,
                        "action": s.action,
                        "status": s.status,
                        "selector": s.selector,
                        "error": s.error,
                        "duration_ms": s.duration_ms,
                        "screenshot": s.screenshot,
                        "logs": s.logs,
                        "network_requests": [
                            {
                                "url": req.url,
                                "method": req.method,
                                "status": req.status,
                                "duration_ms": req.duration_ms,
                                "response_size": req.response_size,
                                "error": req.error,
                            }
                            for req in s.network_requests
                        ],
                    }
                    for s in result.steps
                ],
            },
        })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass
