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
import asyncio
from decimal import Decimal
from typing import Any, Optional

import boto3
from botocore.config import Config
from boto3.dynamodb.conditions import Key

from app.shared.types import Comment


def _to_dynamodb(value: Any) -> Any:
    """Recursively convert Python floats to Decimal for DynamoDB."""
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {k: _to_dynamodb(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_dynamodb(v) for v in value]
    return value


def _from_dynamodb(value: Any) -> Any:
    """Recursively convert DynamoDB Decimals back to Python float/int."""
    if isinstance(value, Decimal):
        if value % 1 == 0:
            return int(value)
        return float(value)
    if isinstance(value, dict):
        return {k: _from_dynamodb(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_from_dynamodb(v) for v in value]
    return value


class CommentsRepo:
    """
    Best-practice DynamoDB repo:
    - PK: incident_id (String)
    - SK: created_at (String, ISO8601, sortable)
    This enables efficient Query by incident_id and time order.
    """

    def __init__(self) -> None:
        region = os.getenv("AWS_REGION", "ap-northeast-2")
        table_name = os.getenv("DDB_COMMENTS_TABLE", "FriendlyPetMapComments")

        cfg = Config(
            region_name=region,
            retries={"max_attempts": 10, "mode": "standard"},
        )
        self._ddb = boto3.resource("dynamodb", config=cfg)
        self._table = self._ddb.Table(table_name)

    async def add(self, comment: Comment) -> Comment:
        item = _to_dynamodb(comment.model_dump())

        # Best practice: ensure SK exists (created_at) and PK exists (incident_id)
        if not item.get("incident_id") or not item.get("created_at"):
            raise ValueError("Comment must include incident_id and created_at for DynamoDB keys.")

        def _put():
            # prevent overwriting same (incident_id, created_at)
            return self._table.put_item(
                Item=item,
                ConditionExpression="attribute_not_exists(incident_id) AND attribute_not_exists(created_at)",
            )

        await asyncio.to_thread(_put)
        return comment

    async def list_by_incident(
        self,
        incident_id: str,
        limit: int = 200,
        start_key: Optional[dict[str, Any]] = None,
        newest_first: bool = False,
    ) -> list[Comment]:
        """
        Efficient Query. For pagination, pass back `LastEvaluatedKey` (start_key).
        If you don't need pagination yet, just call with incident_id only.
        """
        def _query():
            kwargs: dict[str, Any] = {
                "KeyConditionExpression": Key("incident_id").eq(incident_id),
                "Limit": limit,
                "ScanIndexForward": not newest_first,  # True=oldest->newest
            }
            if start_key:
                kwargs["ExclusiveStartKey"] = start_key
            return self._table.query(**kwargs)

        resp = await asyncio.to_thread(_query)
        raw = resp.get("Items", [])
        return [Comment(**_from_dynamodb(it)) for it in raw]
