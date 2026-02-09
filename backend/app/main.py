from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute

from app.api.router import router
from app.shared.config import settings

from app.shared.types import IncidentCreateIn, IncidentCreateOut, Incident
from uuid import uuid4

app = FastAPI(title="Pet Poison Map API", version="0.1.0")


def _normalize_origin(o: str) -> str:
    o = (o or "").strip()
    if not o:
        return ""
    # 允许写成 localhost:5173 这种，自动补 scheme
    if "://" not in o and o != "*":
        o = f"http://{o}"
    return o


def _parse_cors_origins(raw: str) -> list[str] | str:
    raw = (raw or "").strip()
    if not raw:
        # 没配时默认允许本地开发
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    if raw == "*":
        return "*"
    items = [_normalize_origin(x) for x in raw.split(",")]
    return [x for x in items if x]


cors = _parse_cors_origins(getattr(settings, "cors_origins", ""))

# NOTE:
# - allow_credentials=True 时，allow_origins 不能是 ["*"]（浏览器会拒绝）
# - 如果你真的想 allow_origins="*"，那就必须 allow_credentials=False
if cors == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],  # 含 Authorization
    )

app.include_router(router)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/__routes")
def __routes():
    return sorted(
        [
            f"{','.join(sorted(r.methods))} {r.path}"
            for r in app.routes
            if isinstance(r, APIRoute)
        ]
    )


# 你现有的 fallback：保留不动（避免你路由没加载时前端彻底挂）
@app.post("/incidents", response_model=IncidentCreateOut)
def __fallback_create_incident(body: IncidentCreateIn):
    inc = Incident(
        incident_id=f"fallback-{uuid4().hex[:8]}",
        lng=body.lng,
        lat=body.lat,
        title=body.title,
    )
    return IncidentCreateOut(incident=inc)
