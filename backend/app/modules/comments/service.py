from datetime import datetime, timezone
import uuid
from .repo import CommentsRepo


class CommentsService:
    def __init__(self, repo: CommentsRepo):
        self.repo = repo

    async def create_comment(self, *, incident_id: str, content: str, user: dict) -> str:
        now = datetime.now(timezone.utc).isoformat()
        comment_id = str(uuid.uuid4())

        item = {
            "incident_id": incident_id,
            "sort_key": f"{now}#{comment_id}",   # DDB：SK 推荐这样
            "created_at": now,
            "comment_id": comment_id,
            "content": content,
            "user_sub": user.get("sub"),
            "nickname": user.get("nickname"),
            "avatar": user.get("avatar"),
        }
        await self.repo.create_comment(item)
        return comment_id
