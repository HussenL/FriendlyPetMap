from __future__ import annotations

import asyncio
from typing import Dict, List

from app.shared.types import Comment


class CommentsRepo:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        # key: incident_id -> list[Comment]
        self._by_incident: Dict[str, List[Comment]] = {}

    async def list_by_incident(self, incident_id: str) -> List[Comment]:
        async with self._lock:
            return list(self._by_incident.get(incident_id, []))

    async def add(self, comment: Comment) -> Comment:
        async with self._lock:
            self._by_incident.setdefault(comment.incident_id, []).append(comment)
            return comment
