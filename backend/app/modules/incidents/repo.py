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
import boto3
from app.shared.types import Incident


from decimal import Decimal
from typing import Any, List


def _to_dynamodb(value: Any) -> Any:
    """
    Recursively convert float to Decimal for DynamoDB.
    """
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {k: _to_dynamodb(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_dynamodb(v) for v in value]
    return value


class IncidentsRepo:
    def __init__(self):
        self._table = ...  # 你原来的 table 初始化逻辑

    async def create_incident(self, incident: Incident) -> Incident:
        item = _to_dynamodb(incident.model_dump())
        self._table.put_item(Item=item)
        return incident

