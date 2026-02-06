from __future__ import annotations

from uuid import uuid4

from app.shared.types import Incident
from .repo import IncidentsRepo


class IncidentsService:
    def __init__(self, repo: IncidentsRepo):
        self.repo = repo

    async def list_incidents(self):
        return await self.repo.list_incidents()

    async def create_incident(self, lng: float, lat: float, title: str) -> Incident:
        incident = Incident(
            incident_id=f"u-{uuid4().hex[:12]}",
            lng=lng,
            lat=lat,
            title=title,
        )
        return await self.repo.create_incident(incident)

