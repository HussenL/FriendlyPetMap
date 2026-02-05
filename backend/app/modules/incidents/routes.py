# from fastapi import APIRouter

# from app.shared.types import Incident, IncidentCreateIn, IncidentCreateOut
# from .repo import IncidentsRepo
# from .service import IncidentsService

# router = APIRouter(prefix="", tags=["incidents"])

# _repo = IncidentsRepo()
# _svc = IncidentsService(_repo)


# @router.get("/incidents", response_model=list[Incident])
# async def list_incidents():
#     return await _svc.list_incidents()


# @router.post("/incidents", response_model=IncidentCreateOut)
# async def create_incident(body: IncidentCreateIn):
#     incident = await _svc.create_incident(lng=body.lng, lat=body.lat, title=body.title)
#     return IncidentCreateOut(incident=incident)

from fastapi import APIRouter
from uuid import uuid4

from app.shared.types import CommentCreateIn, CommentCreateOut

router = APIRouter(prefix="", tags=["comments"])


@router.post("/comments", response_model=CommentCreateOut)
async def create_comment(body: CommentCreateIn):
    # MVP：暂不鉴权、暂不持久化，只返回一个 comment_id 表示“成功”
    return CommentCreateOut(comment_id=f"c-{uuid4().hex[:12]}")
