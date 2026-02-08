## 本地测试：
# from __future__ import annotations

# import asyncio
# from typing import Dict, List

# from app.shared.types import Comment


# class CommentsRepo:
#     def __init__(self) -> None:
#         self._lock = asyncio.Lock()
#         # key: incident_id -> list[Comment]
#         self._by_incident: Dict[str, List[Comment]] = {}

#     async def list_by_incident(self, incident_id: str) -> List[Comment]:
#         async with self._lock:
#             return list(self._by_incident.get(incident_id, []))

#     async def add(self, comment: Comment) -> Comment:
#         async with self._lock:
#             self._by_incident.setdefault(comment.incident_id, []).append(comment)
#             return comment


from __future__ import annotations

import os
from typing import List

import boto3
from boto3.dynamodb.conditions import Key

from app.shared.types import Comment


class CommentsRepo:
    def __init__(self) -> None:
        self.region = os.getenv("AWS_REGION", "ap-northeast-2")
        self.table_name = os.getenv("DDB_COMMENTS_TABLE", "FriendlyPetMapComments")

        self._ddb = boto3.resource("dynamodb", region_name=self.region)
        self._table = self._ddb.Table(self.table_name)

    async def list_by_incident(self, incident_id: str) -> List[Comment]:
        resp = self._table.query(
            KeyConditionExpression=Key("incident_id").eq(incident_id),
            ScanIndexForward=True,  # 时间正序；想最近在前可改 False
        )
        items = resp.get("Items", [])
        return [Comment(**it) for it in items]

    async def add(self, c: Comment) -> Comment:
        self._table.put_item(Item=c.model_dump())
        return c
