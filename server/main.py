from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from server.api import ui_map, runner, project, scenario, docs, resource

app = FastAPI(
    title="Playwright Agent API",
    description="AI-powered browser automation testing platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount artifacts directory for serving screenshots
ARTIFACTS_DIR = Path(__file__).parent.parent / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/artifacts", StaticFiles(directory=str(ARTIFACTS_DIR)), name="artifacts")

# Mount web-lite static files
WEB_LITE_DIR = Path(__file__).parent.parent / "web-lite"
if WEB_LITE_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(WEB_LITE_DIR / "static")), name="web-lite-static")

app.include_router(project.router, prefix="/api/projects", tags=["Projects"])
app.include_router(ui_map.router, prefix="/api/ui-map", tags=["UI Map"])
app.include_router(scenario.router, prefix="/api/scenarios", tags=["Scenarios"])
app.include_router(runner.router, prefix="/api/runner", tags=["Runner"])
app.include_router(resource.router, prefix="/api/resources", tags=["Resources"])
app.include_router(docs.router, prefix="/api/docs", tags=["Documentation"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


# Serve web-lite index.html for /lite route
@app.get("/")
async def serve_lite():
    index_path = WEB_LITE_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"error": "web-lite not found"}
