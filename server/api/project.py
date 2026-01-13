import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File as FastAPIFile
from pydantic import BaseModel, Field

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "projects"
DATA_DIR.mkdir(parents=True, exist_ok=True)

LOGOS_DIR = Path(__file__).parent.parent.parent / "artifacts" / "logos"
LOGOS_DIR.mkdir(parents=True, exist_ok=True)


class Environment(BaseModel):
    name: str = Field(..., description="Environment name (e.g., dev, test, prod)")
    base_url: str = Field(..., description="Base URL for this environment")
    description: Optional[str] = None


class ProjectCreate(BaseModel):
    name: str = Field(..., description="Project name")
    description: Optional[str] = None
    default_timeout: int = Field(default=5000, description="Default timeout in ms")
    browser_channel: Optional[str] = Field(default=None, description="Browser channel: None=bundled Chromium, 'chrome'=local Chrome, 'msedge'=local Edge")
    browser_args: list[str] = Field(default_factory=list, description="Extra browser launch arguments")
    environments: list[Environment] = Field(default_factory=list)
    logo: Optional[str] = Field(default=None, description="Project logo path")


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_timeout: Optional[int] = None
    browser_channel: Optional[str] = None
    browser_args: Optional[list[str]] = None
    environments: Optional[list[Environment]] = None
    logo: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    default_timeout: int
    browser_channel: Optional[str] = None
    browser_args: list[str] = []
    environments: list[Environment]
    logo: Optional[str] = None
    created_at: str
    updated_at: str


def _get_project_path(project_id: str) -> Path:
    return DATA_DIR / f"{project_id}.json"


def _load_project(project_id: str) -> Optional[dict]:
    path = _get_project_path(project_id)
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save_project(project_id: str, data: dict):
    path = _get_project_path(project_id)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _delete_project(project_id: str) -> bool:
    path = _get_project_path(project_id)
    if path.exists():
        path.unlink()
        return True
    return False


@router.get("", response_model=list[ProjectResponse])
async def list_projects():
    """List all projects."""
    result = []
    for path in DATA_DIR.glob("*.json"):
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
            result.append(ProjectResponse(**data))
    return sorted(result, key=lambda x: x.updated_at, reverse=True)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """Get a project by ID."""
    data = _load_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse(**data)


@router.post("", response_model=ProjectResponse)
async def create_project(project: ProjectCreate):
    """Create a new project."""
    project_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    data = {
        "id": project_id,
        "name": project.name,
        "description": project.description,
        "default_timeout": project.default_timeout,
        "browser_channel": project.browser_channel,
        "browser_args": project.browser_args,
        "environments": [env.model_dump() for env in project.environments],
        "logo": project.logo,
        "created_at": now,
        "updated_at": now,
    }
    _save_project(project_id, data)
    return ProjectResponse(**data)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project: ProjectUpdate):
    """Update an existing project."""
    data = _load_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.name is not None:
        data["name"] = project.name
    if project.description is not None:
        data["description"] = project.description
    if project.default_timeout is not None:
        data["default_timeout"] = project.default_timeout
    if project.browser_channel is not None:
        # Allow empty string to reset to default (bundled Chromium)
        data["browser_channel"] = project.browser_channel if project.browser_channel else None
    if project.browser_args is not None:
        data["browser_args"] = project.browser_args
    if project.environments is not None:
        data["environments"] = [env.model_dump() for env in project.environments]
    if project.logo is not None:
        # Allow empty string to remove logo
        data["logo"] = project.logo if project.logo else None
    data["updated_at"] = datetime.now().isoformat()

    _save_project(project_id, data)
    return ProjectResponse(**data)


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project."""
    if not _delete_project(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted", "id": project_id}


@router.post("/{project_id}/environments", response_model=ProjectResponse)
async def add_environment(project_id: str, env: Environment):
    """Add an environment to a project."""
    data = _load_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if environment name already exists
    for existing in data["environments"]:
        if existing["name"] == env.name:
            raise HTTPException(status_code=400, detail=f"Environment '{env.name}' already exists")

    data["environments"].append(env.model_dump())
    data["updated_at"] = datetime.now().isoformat()

    _save_project(project_id, data)
    return ProjectResponse(**data)


@router.delete("/{project_id}/environments/{env_name}", response_model=ProjectResponse)
async def delete_environment(project_id: str, env_name: str):
    """Delete an environment from a project."""
    data = _load_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")

    original_len = len(data["environments"])
    data["environments"] = [e for e in data["environments"] if e["name"] != env_name]

    if len(data["environments"]) == original_len:
        raise HTTPException(status_code=404, detail="Environment not found")

    data["updated_at"] = datetime.now().isoformat()

    _save_project(project_id, data)
    return ProjectResponse(**data)


@router.post("/{project_id}/logo", response_model=ProjectResponse)
async def upload_logo(project_id: str, file: UploadFile = FastAPIFile(...)):
    """Upload a logo for a project."""
    data = _load_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(allowed_types)}")

    # Validate file size (max 1MB)
    content = await file.read()
    if len(content) > 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 1MB limit")

    # Delete old logo if exists
    if data.get("logo"):
        old_logo_path = LOGOS_DIR / data["logo"].split("/")[-1]
        if old_logo_path.exists():
            old_logo_path.unlink()

    # Save new logo
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    logo_filename = f"{project_id}.{ext}"
    logo_path = LOGOS_DIR / logo_filename

    with logo_path.open("wb") as f:
        f.write(content)

    # Update project with logo path
    data["logo"] = f"/artifacts/logos/{logo_filename}"
    data["updated_at"] = datetime.now().isoformat()

    _save_project(project_id, data)
    return ProjectResponse(**data)


@router.delete("/{project_id}/logo", response_model=ProjectResponse)
async def delete_logo(project_id: str):
    """Delete a project's logo."""
    data = _load_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")

    # Delete logo file if exists
    if data.get("logo"):
        logo_path = LOGOS_DIR / data["logo"].split("/")[-1]
        if logo_path.exists():
            logo_path.unlink()

    # Update project
    data["logo"] = None
    data["updated_at"] = datetime.now().isoformat()

    _save_project(project_id, data)
    return ProjectResponse(**data)
