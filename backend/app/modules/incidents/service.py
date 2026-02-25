from __future__ import annotations

from uuid import uuid4
from datetime import datetime, timezone

from app.shared.types import Incident
from .repo import IncidentsRepo


class IncidentsService:
    def __init__(self, repo: IncidentsRepo):
        self.repo = repo

    async def list_incidents(self):
        return await self.repo.list_incidents()

    async def create_incident(self, lng: float, lat: float, title: str) -> Incident:
        now = datetime.now(timezone.utc).isoformat()
        incident = Incident(
            incident_id=f"u-{uuid4().hex[:12]}",
            lng=lng,
            lat=lat,
            title=title,
            created_at=now,
        )
        return await self.repo.create_incident(incident)

    async def update_incident_title(self, incident_id: str, title: str) -> Incident:
        return await self.repo.update_title(incident_id, title)

    async def delete_incident(self, incident_id: str) -> None:
        await self.repo.delete(incident_id)