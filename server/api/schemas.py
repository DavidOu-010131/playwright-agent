from pydantic import BaseModel, Field
from typing import Optional, Any


class ElementLocator(BaseModel):
    primary: str = Field(..., description="Primary CSS selector")
    fallbacks: list[str] = Field(default_factory=list, description="Fallback selectors")
    description: Optional[str] = Field(None, description="Human-readable description")


class UIMapCreate(BaseModel):
    name: str = Field(..., description="UI Map name (e.g., 'login_page')")
    project_id: Optional[str] = Field(None, description="Project ID this UI Map belongs to")
    elements: dict[str, ElementLocator] = Field(default_factory=dict)


class UIMapUpdate(BaseModel):
    name: Optional[str] = None
    project_id: Optional[str] = None
    elements: Optional[dict[str, ElementLocator]] = None


class UIMapResponse(BaseModel):
    id: str
    name: str
    project_id: Optional[str] = None
    elements: dict[str, ElementLocator]
    created_at: str
    updated_at: str


# Scenario schemas
class Step(BaseModel):
    action: str = Field(..., description="Action type: goto, click, dblclick, type, fill, hover, focus, check, uncheck, select, press, scroll, wait_for, assert_text, run_js, screenshot, wait")
    target: Optional[str] = Field(None, description="Element name from UI Map or CSS selector")
    url: Optional[str] = Field(None, description="URL for goto action")
    value: Optional[str] = Field(None, description="Value for type/fill/assert_text/run_js/select/press/wait actions")
    timeout: Optional[int] = Field(None, description="Custom timeout in ms")


class ScenarioCreate(BaseModel):
    name: str = Field(..., description="Scenario name")
    project_id: str = Field(..., description="Project ID this scenario belongs to")
    description: Optional[str] = Field(None, description="Scenario description")
    ui_map_id: Optional[str] = Field(None, description="Associated UI Map ID")
    steps: list[Step] = Field(default_factory=list)


class ScenarioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    ui_map_id: Optional[str] = None
    steps: Optional[list[Step]] = None


class ScenarioResponse(BaseModel):
    id: str
    name: str
    project_id: str
    description: Optional[str] = None
    ui_map_id: Optional[str] = None
    steps: list[Step]
    created_at: str
    updated_at: str
