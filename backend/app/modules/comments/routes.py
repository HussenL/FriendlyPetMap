from fastapi import APIRouter, Depends
from app.shared.security import get_current_user
from app.shared.types import CommentCreateIn, CommentCreateOut
from .repo import CommentsRepo
from .service import CommentsService

router = APIRouter(prefix="", tags=["comments"])

_repo = CommentsRepo()
_svc = CommentsService(_repo)


@router.post("/comments", response_model=CommentCreateOut)
async def post_comment(inp: CommentCreateIn, user=Depends(get_current_user)):
    comment_id = await _svc.create_comment(
        incident_id=inp.incident_id,
        content=inp.content,
        user=user,
    )
    return CommentCreateOut(comment_id=comment_id)
