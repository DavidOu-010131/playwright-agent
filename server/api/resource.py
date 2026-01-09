import json
import uuid
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "resources"
DATA_DIR.mkdir(parents=True, exist_ok=True)


class ResourceResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    original_name: str
    content_type: str
    size: int
    created_at: str


def _get_project_dir(project_id: str) -> Path:
    project_dir = DATA_DIR / project_id
    project_dir.mkdir(parents=True, exist_ok=True)
    return project_dir


def _get_metadata_path(project_id: str) -> Path:
    return _get_project_dir(project_id) / "metadata.json"


def _load_metadata(project_id: str) -> list[dict]:
    path = _get_metadata_path(project_id)
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save_metadata(project_id: str, metadata: list[dict]):
    path = _get_metadata_path(project_id)
    with path.open("w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)


@router.get("/{project_id}", response_model=list[ResourceResponse])
async def list_resources(project_id: str):
    """List all resources for a project."""
    metadata = _load_metadata(project_id)
    return [ResourceResponse(**item) for item in metadata]


@router.post("/{project_id}", response_model=ResourceResponse)
async def upload_resource(
    project_id: str,
    file: UploadFile = File(...),
):
    """Upload a resource file to a project."""
    resource_id = str(uuid.uuid4())[:8]

    # Generate unique filename
    ext = Path(file.filename).suffix if file.filename else ""
    filename = f"{resource_id}{ext}"

    # Save file
    project_dir = _get_project_dir(project_id)
    file_path = project_dir / filename

    with file_path.open("wb") as f:
        content = await file.read()
        f.write(content)

    # Create metadata
    resource_data = {
        "id": resource_id,
        "project_id": project_id,
        "filename": filename,
        "original_name": file.filename or filename,
        "content_type": file.content_type or "application/octet-stream",
        "size": len(content),
        "created_at": datetime.now().isoformat(),
    }

    # Update metadata
    metadata = _load_metadata(project_id)
    metadata.append(resource_data)
    _save_metadata(project_id, metadata)

    return ResourceResponse(**resource_data)


@router.get("/{project_id}/{resource_id}")
async def get_resource(project_id: str, resource_id: str):
    """Get a resource file."""
    metadata = _load_metadata(project_id)

    resource = next((r for r in metadata if r["id"] == resource_id), None)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    file_path = _get_project_dir(project_id) / resource["filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Resource file not found")

    return FileResponse(
        path=file_path,
        filename=resource["original_name"],
        media_type=resource["content_type"],
    )


@router.get("/{project_id}/{resource_id}/path")
async def get_resource_path(project_id: str, resource_id: str):
    """Get the absolute path of a resource file (for use in tests)."""
    metadata = _load_metadata(project_id)

    resource = next((r for r in metadata if r["id"] == resource_id), None)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    file_path = _get_project_dir(project_id) / resource["filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Resource file not found")

    return {"path": str(file_path.resolve())}


@router.delete("/{project_id}/{resource_id}")
async def delete_resource(project_id: str, resource_id: str):
    """Delete a resource."""
    metadata = _load_metadata(project_id)

    resource = next((r for r in metadata if r["id"] == resource_id), None)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Delete file
    file_path = _get_project_dir(project_id) / resource["filename"]
    if file_path.exists():
        file_path.unlink()

    # Update metadata
    metadata = [r for r in metadata if r["id"] != resource_id]
    _save_metadata(project_id, metadata)

    return {"status": "deleted", "id": resource_id}
