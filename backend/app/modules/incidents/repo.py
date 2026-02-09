## 本地测试：
# from __future__ import annotations

# import asyncio
# from typing import List

# from app.shared.types import Incident


# class IncidentsRepo:
#     def __init__(self) -> None:
#         self._lock = asyncio.Lock()
#         # MVP：内存数据（后端重启会重置）
#         self._items: List[Incident] = [
#             Incident(incident_id="test-1", lat=31.2304, lng=121.4737, title="测试点位（上海）"),
#             Incident(incident_id="test-2", lat=39.9042, lng=116.4074, title="测试点位（北京）"),
#         ]

#     async def list_incidents(self) -> List[Incident]:
#         async with self._lock:
#             # 返回副本，避免外部误改
#             return list(self._items)

#     async def create_incident(self, incident: Incident) -> Incident:
#         async with self._lock:
#             self._items.append(incident)
#             return incident

from __future__ import annotations

import os
import asyncio
from decimal import Decimal
from typing import Any, Optional

import boto3
from botocore.config import Config

from app.shared.types import Incident


def _to_dynamodb(value: Any) -> Any:
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {k: _to_dynamodb(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_dynamodb(v) for v in value]
    return value


def _from_dynamodb(value: Any) -> Any:
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    if isinstance(value, dict):
        return {k: _from_dynamodb(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_from_dynamodb(v) for v in value]
    return value


class IncidentsRepo:
    """
    DynamoDB best-practice repo
    PK: incident_id (String)
    """

    def __init__(self) -> None:
        region = os.getenv("AWS_REGION", "ap-northeast-2")
        table_name = os.getenv("DDB_INCIDENTS_TABLE", "FriendlyPetMapIncidents")

        cfg = Config(region_name=region, retries={"max_attempts": 10, "mode": "standard"})
        self._ddb = boto3.resource("dynamodb", config=cfg)
        self._table = self._ddb.Table(table_name)

    async def list_incidents(self, limit: int = 500) -> list[Incident]:
        items: list[Incident] = []
        last_key: Optional[dict[str, Any]] = None

        while len(items) < limit:
            page_limit = min(200, limit - len(items))

            def _scan():
                kwargs: dict[str, Any] = {"Limit": page_limit}
                if last_key:
                    kwargs["ExclusiveStartKey"] = last_key
                return self._table.scan(**kwargs)

            resp = await asyncio.to_thread(_scan)
            raw = resp.get("Items", [])
            for it in raw:
                items.append(Incident(**_from_dynamodb(it)))

            last_key = resp.get("LastEvaluatedKey")
            if not last_key:
                break

        return items

    async def create_incident(self, incident: Incident) -> Incident:
        item = _to_dynamodb(incident.model_dump())

        def _put():
            # 防止覆盖同 id
            return self._table.put_item(
                Item=item,
                ConditionExpression="attribute_not_exists(incident_id)",
            )

        await asyncio.to_thread(_put)
        return incident
