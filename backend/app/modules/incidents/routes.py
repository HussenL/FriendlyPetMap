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

from fastapi import APIRouter, HTTPException

from app.shared.text_safety import validate_text
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
    res = validate_text(
        body.title,
        min_len=1,
        max_len=30,
        check_contact=True,
        check_threat=True,
    )
    if not res.ok:
        raise HTTPException(
            status_code=400,
            detail={"code": res.reason, "message": "标题不符合规范"},
        )

    incident = await _svc.create_incident(lng=body.lng, lat=body.lat, title=res.cleaned)
    return IncidentCreateOut(incident=incident)

