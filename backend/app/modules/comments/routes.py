from fastapi import APIRouter, Query

from app.shared.types import CommentCreateIn, CommentCreateOut, CommentListOut
from .repo import CommentsRepo
from .service import CommentsService

router = APIRouter(prefix="", tags=["comments"])

_repo = CommentsRepo()
_svc = CommentsService(_repo)


@router.get("/comments", response_model=CommentListOut)
async def list_comments(incident_id: str = Query(..., min_length=1)):
    items = await _svc.list_comments(incident_id)
    return CommentListOut(incident_id=incident_id, items=items)


@router.post("/comments", response_model=CommentCreateOut)
async def create_comment(body: CommentCreateIn):
    c = await _svc.create_comment(body.incident_id, body.content)
    return CommentCreateOut(comment=c)
