from __future__ import annotations

from uuid import uuid4
from datetime import datetime, timezone

from app.shared.types import Comment
from .repo import CommentsRepo


class CommentsService:
    def __init__(self, repo: CommentsRepo) -> None:
        self.repo = repo

    async def list_comments(self, incident_id: str):
        return await self.repo.list_by_incident(incident_id)

    async def create_comment(self, incident_id: str, content: str) -> Comment:
        now = datetime.now(timezone.utc).isoformat()
        c = Comment(
            comment_id=f"c-{uuid4().hex[:12]}",
            incident_id=incident_id,
            content=content,
            created_at=now,
        )
        return await self.repo.add(c)
