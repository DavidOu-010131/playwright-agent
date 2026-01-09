import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from server.api.schemas import ScenarioCreate, ScenarioUpdate, ScenarioResponse, Step

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "scenarios"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _get_scenario_path(scenario_id: str) -> Path:
    return DATA_DIR / f"{scenario_id}.json"


def _load_scenario(scenario_id: str) -> Optional[dict]:
    path = _get_scenario_path(scenario_id)
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save_scenario(scenario_id: str, data: dict):
    path = _get_scenario_path(scenario_id)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _delete_scenario(scenario_id: str) -> bool:
    path = _get_scenario_path(scenario_id)
    if path.exists():
        path.unlink()
        return True
    return False


@router.get("", response_model=list[ScenarioResponse])
async def list_scenarios(project_id: Optional[str] = Query(None, description="Filter by project ID")):
    """List all Scenarios, optionally filtered by project."""
    result = []
    for path in DATA_DIR.glob("*.json"):
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if project_id is not None:
                if data.get("project_id") != project_id:
                    continue
            result.append(ScenarioResponse(**data))
    return sorted(result, key=lambda x: x.updated_at, reverse=True)


@router.get("/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(scenario_id: str):
    """Get a Scenario by ID."""
    data = _load_scenario(scenario_id)
    if not data:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return ScenarioResponse(**data)


@router.post("", response_model=ScenarioResponse)
async def create_scenario(scenario: ScenarioCreate):
    """Create a new Scenario."""
    scenario_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    data = {
        "id": scenario_id,
        "name": scenario.name,
        "project_id": scenario.project_id,
        "description": scenario.description,
        "ui_map_id": scenario.ui_map_id,
        "steps": [s.model_dump() for s in scenario.steps],
        "created_at": now,
        "updated_at": now,
    }
    _save_scenario(scenario_id, data)
    return ScenarioResponse(**data)


@router.put("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(scenario_id: str, scenario: ScenarioUpdate):
    """Update an existing Scenario."""
    data = _load_scenario(scenario_id)
    if not data:
        raise HTTPException(status_code=404, detail="Scenario not found")

    if scenario.name is not None:
        data["name"] = scenario.name
    if scenario.description is not None:
        data["description"] = scenario.description
    if scenario.ui_map_id is not None:
        data["ui_map_id"] = scenario.ui_map_id
    if scenario.steps is not None:
        data["steps"] = [s.model_dump() for s in scenario.steps]
    data["updated_at"] = datetime.now().isoformat()

    _save_scenario(scenario_id, data)
    return ScenarioResponse(**data)


@router.delete("/{scenario_id}")
async def delete_scenario(scenario_id: str):
    """Delete a Scenario."""
    if not _delete_scenario(scenario_id):
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {"status": "deleted", "id": scenario_id}


@router.post("/{scenario_id}/steps", response_model=ScenarioResponse)
async def add_step(scenario_id: str, step: Step):
    """Add a step to a Scenario."""
    data = _load_scenario(scenario_id)
    if not data:
        raise HTTPException(status_code=404, detail="Scenario not found")

    data["steps"].append(step.model_dump())
    data["updated_at"] = datetime.now().isoformat()

    _save_scenario(scenario_id, data)
    return ScenarioResponse(**data)


@router.put("/{scenario_id}/steps/{step_index}", response_model=ScenarioResponse)
async def update_step(scenario_id: str, step_index: int, step: Step):
    """Update a step in a Scenario."""
    data = _load_scenario(scenario_id)
    if not data:
        raise HTTPException(status_code=404, detail="Scenario not found")

    if step_index < 0 or step_index >= len(data["steps"]):
        raise HTTPException(status_code=404, detail="Step index out of range")

    data["steps"][step_index] = step.model_dump()
    data["updated_at"] = datetime.now().isoformat()

    _save_scenario(scenario_id, data)
    return ScenarioResponse(**data)


@router.delete("/{scenario_id}/steps/{step_index}", response_model=ScenarioResponse)
async def delete_step(scenario_id: str, step_index: int):
    """Delete a step from a Scenario."""
    data = _load_scenario(scenario_id)
    if not data:
        raise HTTPException(status_code=404, detail="Scenario not found")

    if step_index < 0 or step_index >= len(data["steps"]):
        raise HTTPException(status_code=404, detail="Step index out of range")

    del data["steps"][step_index]
    data["updated_at"] = datetime.now().isoformat()

    _save_scenario(scenario_id, data)
    return ScenarioResponse(**data)
