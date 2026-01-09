import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from server.api.schemas import UIMapCreate, UIMapUpdate, UIMapResponse, ElementLocator

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "ui_maps"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _get_ui_map_path(ui_map_id: str) -> Path:
    return DATA_DIR / f"{ui_map_id}.json"


def _load_ui_map(ui_map_id: str) -> Optional[dict]:
    path = _get_ui_map_path(ui_map_id)
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save_ui_map(ui_map_id: str, data: dict):
    path = _get_ui_map_path(ui_map_id)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _delete_ui_map(ui_map_id: str) -> bool:
    path = _get_ui_map_path(ui_map_id)
    if path.exists():
        path.unlink()
        return True
    return False


@router.get("", response_model=list[UIMapResponse])
async def list_ui_maps(project_id: Optional[str] = Query(None, description="Filter by project ID")):
    """List all UI Maps, optionally filtered by project."""
    result = []
    for path in DATA_DIR.glob("*.json"):
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
            # Filter by project_id if specified
            if project_id is not None:
                if data.get("project_id") != project_id:
                    continue
            result.append(UIMapResponse(**data))
    return sorted(result, key=lambda x: x.updated_at, reverse=True)


@router.get("/{ui_map_id}", response_model=UIMapResponse)
async def get_ui_map(ui_map_id: str):
    """Get a UI Map by ID."""
    data = _load_ui_map(ui_map_id)
    if not data:
        raise HTTPException(status_code=404, detail="UI Map not found")
    return UIMapResponse(**data)


@router.post("", response_model=UIMapResponse)
async def create_ui_map(ui_map: UIMapCreate):
    """Create a new UI Map."""
    ui_map_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    data = {
        "id": ui_map_id,
        "name": ui_map.name,
        "project_id": ui_map.project_id,
        "description": ui_map.description,
        "elements": {k: v.model_dump() for k, v in ui_map.elements.items()},
        "created_at": now,
        "updated_at": now,
    }
    _save_ui_map(ui_map_id, data)
    return UIMapResponse(**data)


@router.put("/{ui_map_id}", response_model=UIMapResponse)
async def update_ui_map(ui_map_id: str, ui_map: UIMapUpdate):
    """Update an existing UI Map."""
    data = _load_ui_map(ui_map_id)
    if not data:
        raise HTTPException(status_code=404, detail="UI Map not found")

    if ui_map.name is not None:
        data["name"] = ui_map.name
    if ui_map.project_id is not None:
        data["project_id"] = ui_map.project_id
    if ui_map.description is not None:
        data["description"] = ui_map.description
    if ui_map.elements is not None:
        data["elements"] = {k: v.model_dump() for k, v in ui_map.elements.items()}
    data["updated_at"] = datetime.now().isoformat()

    _save_ui_map(ui_map_id, data)
    return UIMapResponse(**data)


@router.delete("/{ui_map_id}")
async def delete_ui_map(ui_map_id: str):
    """Delete a UI Map."""
    if not _delete_ui_map(ui_map_id):
        raise HTTPException(status_code=404, detail="UI Map not found")
    return {"status": "deleted", "id": ui_map_id}


@router.post("/{ui_map_id}/elements/{element_name}", response_model=UIMapResponse)
async def add_element(ui_map_id: str, element_name: str, element: ElementLocator):
    """Add or update an element in a UI Map."""
    data = _load_ui_map(ui_map_id)
    if not data:
        raise HTTPException(status_code=404, detail="UI Map not found")

    data["elements"][element_name] = element.model_dump()
    data["updated_at"] = datetime.now().isoformat()

    _save_ui_map(ui_map_id, data)
    return UIMapResponse(**data)


@router.delete("/{ui_map_id}/elements/{element_name}", response_model=UIMapResponse)
async def delete_element(ui_map_id: str, element_name: str):
    """Delete an element from a UI Map."""
    data = _load_ui_map(ui_map_id)
    if not data:
        raise HTTPException(status_code=404, detail="UI Map not found")

    if element_name not in data["elements"]:
        raise HTTPException(status_code=404, detail="Element not found")

    del data["elements"][element_name]
    data["updated_at"] = datetime.now().isoformat()

    _save_ui_map(ui_map_id, data)
    return UIMapResponse(**data)
