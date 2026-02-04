from fastapi import APIRouter
from app.shared.types import Incident
from .repo import IncidentsRepo
from .service import IncidentsService

router = APIRouter(prefix="", tags=["incidents"])

_repo = IncidentsRepo()
_svc = IncidentsService(_repo)


@router.get("/incidents", response_model=list[Incident])
async def list_incidents():
    return await _svc.list_incidents()
