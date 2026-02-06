from fastapi import APIRouter, HTTPException, Query

from app.shared.text_safety import validate_text
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
    res = validate_text(
        body.content,
        min_len=1,
        max_len=300,
        check_contact=True,
        check_threat=True,
    )
    if not res.ok:
        raise HTTPException(
            status_code=400,
            detail={"code": res.reason, "message": "留言不符合规范"},
        )

    c = await _svc.create_comment(body.incident_id, res.cleaned)
    return CommentCreateOut(comment=c)
