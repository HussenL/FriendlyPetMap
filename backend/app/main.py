from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import router
from app.shared.config import settings

app = FastAPI(title="Pet Poison Map API", version="0.1.0")

origins = [o.strip() for o in settings.cors_origins.split(",")] if settings.cors_origins != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health():
    return {"ok": True}

from fastapi.routing import APIRoute

@app.get("/__routes")
def __routes():
    return sorted(
        [
            f"{','.join(sorted(r.methods))} {r.path}"
            for r in app.routes
            if isinstance(r, APIRoute)
        ]
    )


from app.shared.types import IncidentCreateIn, IncidentCreateOut, Incident
from uuid import uuid4

@app.post("/incidents", response_model=IncidentCreateOut)
def __fallback_create_incident(body: IncidentCreateIn):
    inc = Incident(
        incident_id=f"fallback-{uuid4().hex[:8]}",
        lng=body.lng,
        lat=body.lat,
        title=body.title,
    )
    return IncidentCreateOut(incident=inc)
