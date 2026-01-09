from fastapi import APIRouter, HTTPException
from pathlib import Path
from pydantic import BaseModel

router = APIRouter()

DOC_DIR = Path(__file__).parent.parent.parent / "doc"


class DocFile(BaseModel):
    name: str
    title: str


class DocContent(BaseModel):
    name: str
    title: str
    content: str


def extract_title(content: str, filename: str) -> str:
    """Extract title from markdown content (first # heading)."""
    for line in content.split("\n"):
        if line.startswith("# "):
            return line[2:].strip()
    return filename.replace("-", " ").replace("_", " ").title()


@router.get("", response_model=list[DocFile])
async def list_docs():
    """List all documentation files."""
    if not DOC_DIR.exists():
        return []

    docs = []
    for file in sorted(DOC_DIR.glob("*.md")):
        content = file.read_text(encoding="utf-8")
        title = extract_title(content, file.stem)
        docs.append(DocFile(name=file.stem, title=title))

    return docs


@router.get("/{name}", response_model=DocContent)
async def get_doc(name: str):
    """Get documentation file content."""
    file_path = DOC_DIR / f"{name}.md"

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Document '{name}' not found")

    content = file_path.read_text(encoding="utf-8")
    title = extract_title(content, name)

    return DocContent(name=name, title=title, content=content)
