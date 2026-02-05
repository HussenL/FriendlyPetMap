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

from app.shared.types import Incident, IncidentCreateIn, IncidentCreateOut
from .repo import IncidentsRepo
from .service import IncidentsService

router = APIRouter(prefix="", tags=["incidents"])

_repo = IncidentsRepo()
_svc = IncidentsService(_repo)


@router.get("/incidents", response_model=list[Incident])
async def list_incidents():
    return await _svc.list_incidents()


@router.post("/incidents", response_model=IncidentCreateOut)
async def create_incident(body: IncidentCreateIn):
    incident = await _svc.create_incident(lng=body.lng, lat=body.lat, title=body.title)
    return IncidentCreateOut(incident=incident)
