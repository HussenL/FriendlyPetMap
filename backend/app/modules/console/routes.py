from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.shared.security import require_console_token
from app.shared.text_safety import validate_text
from app.shared.types import (
    CommentUpdateIn,
    ConsoleCommentRow,
    ConsolePaged,
    Incident,
    IncidentUpdateIn,
)
from app.modules.incidents.repo import IncidentsRepo
from app.modules.incidents.service import IncidentsService
from app.modules.comments.repo import CommentsRepo
from app.modules.comments.service import CommentsService

router = APIRouter(prefix="/console", tags=["console"])

_inc_repo = IncidentsRepo()
_inc_svc = IncidentsService(_inc_repo)

_c_repo = CommentsRepo()
_c_svc = CommentsService(_c_repo)


def _parse_iso(s: str) -> datetime:
    s2 = s.strip().replace("Z", "+00:00")
    return datetime.fromisoformat(s2)


def _in_range(v: float, lo: Optional[float], hi: Optional[float]) -> bool:
    if lo is not None and v < lo:
        return False
    if hi is not None and v > hi:
        return False
    return True


@router.get("/incidents", dependencies=[Depends(require_console_token)], response_model=ConsolePaged)
async def console_list_incidents(
    lat_min: float | None = None,
    lat_max: float | None = None,
    lng_min: float | None = None,
    lng_max: float | None = None,
    start: str | None = None,
    end: str | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
):
    items = await _inc_repo.list_incidents(limit=5000)

    qn = (q or "").strip().lower()
    start_dt = _parse_iso(start) if start else None
    end_dt = _parse_iso(end) if end else None

    def ok(it: Incident) -> bool:
        if not _in_range(it.lat, lat_min, lat_max):
            return False
        if not _in_range(it.lng, lng_min, lng_max):
            return False

        if qn and qn not in (it.title or "").lower():
            return False

        if start_dt or end_dt:
            if not it.created_at:
                return False
            try:
                dt = _parse_iso(it.created_at)
            except Exception:
                return False
            if start_dt and dt < start_dt:
                return False
            if end_dt and dt > end_dt:
                return False

        return True

    filtered = [it for it in items if ok(it)]

    def sort_key(it: Incident):
        if not it.created_at:
            return datetime.min
        try:
            return _parse_iso(it.created_at)
        except Exception:
            return datetime.min

    filtered.sort(key=sort_key, reverse=True)

    total = len(filtered)
    start_i = (page - 1) * page_size
    end_i = start_i + page_size
    page_items = filtered[start_i:end_i]

    return ConsolePaged(page=page, page_size=page_size, total=total, items=[x.model_dump() for x in page_items])


@router.put("/incidents/{incident_id}", dependencies=[Depends(require_console_token)])
async def console_update_incident(incident_id: str, body: IncidentUpdateIn):
    res = validate_text(
        body.title,
        min_len=1,
        max_len=30,
        check_contact=True,
        check_threat=True,
    )
    if not res.ok:
        raise HTTPException(status_code=400, detail={"code": res.reason, "message": "标题不符合规范"})

    try:
        it = await _inc_svc.update_incident_title(incident_id, res.cleaned)
    except KeyError:
        raise HTTPException(status_code=404, detail="incident not found")

    return {"ok": True, "incident": it.model_dump()}


@router.delete("/incidents/{incident_id}", dependencies=[Depends(require_console_token)])
async def console_delete_incident(incident_id: str):
    await _inc_svc.delete_incident(incident_id)
    return {"ok": True}


@router.get("/comments", dependencies=[Depends(require_console_token)], response_model=ConsolePaged)
async def console_list_comments(
    lat_min: float | None = None,
    lat_max: float | None = None,
    lng_min: float | None = None,
    lng_max: float | None = None,
    start: str | None = None,
    end: str | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
):
    incidents = await _inc_repo.list_incidents(limit=5000)
    by_id = {it.incident_id: it for it in incidents}

    qn = (q or "").strip().lower()
    start_dt = _parse_iso(start) if start else None
    end_dt = _parse_iso(end) if end else None

    all_comments = []
    last = None
    for _ in range(50):  # guardrail
        batch, last = await _c_svc.scan_comments(limit=200, start_key=last)
        all_comments.extend(batch)
        if not last:
            break

    rows: list[ConsoleCommentRow] = []

    for c in all_comments:
        inc = by_id.get(c.incident_id)
        if not inc:
            continue

        if not _in_range(inc.lat, lat_min, lat_max):
            continue
        if not _in_range(inc.lng, lng_min, lng_max):
            continue

        if qn and qn not in (c.content or "").lower():
            continue

        if start_dt or end_dt:
            try:
                dt = _parse_iso(c.created_at)
            except Exception:
                continue
            if start_dt and dt < start_dt:
                continue
            if end_dt and dt > end_dt:
                continue

        rows.append(
            ConsoleCommentRow(
                comment_id=c.comment_id,
                incident_id=c.incident_id,
                content=c.content,
                created_at=c.created_at,
                incident_lng=inc.lng,
                incident_lat=inc.lat,
                incident_title=inc.title,
            )
        )

    def c_sort_key(r: ConsoleCommentRow):
        try:
            return _parse_iso(r.created_at)
        except Exception:
            return datetime.min

    rows.sort(key=c_sort_key, reverse=True)

    total = len(rows)
    start_i = (page - 1) * page_size
    end_i = start_i + page_size
    page_items = rows[start_i:end_i]

    return ConsolePaged(page=page, page_size=page_size, total=total, items=[x.model_dump() for x in page_items])


@router.put("/comments", dependencies=[Depends(require_console_token)])
async def console_update_comment(body: CommentUpdateIn):
    res = validate_text(
        body.content,
        min_len=1,
        max_len=300,
        check_contact=True,
        check_threat=True,
    )
    if not res.ok:
        raise HTTPException(status_code=400, detail={"code": res.reason, "message": "留言不符合规范"})

    await _c_svc.update_comment(body.incident_id, body.created_at, res.cleaned)
    return {"ok": True}


@router.delete("/comments", dependencies=[Depends(require_console_token)])
async def console_delete_comment(
    incident_id: str = Query(..., min_length=1),
    created_at: str = Query(..., min_length=1),
):
    await _c_svc.delete_comment(incident_id, created_at)
    return {"ok": True}