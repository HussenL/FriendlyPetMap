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
from typing import List

import boto3

from app.shared.types import Incident


class IncidentsRepo:
    def __init__(self) -> None:
        self.region = os.getenv("AWS_REGION", "ap-northeast-2")
        self.table_name = os.getenv("DDB_INCIDENTS_TABLE", "FriendlyPetMapIncidents")

        self._ddb = boto3.resource("dynamodb", region_name=self.region)
        self._table = self._ddb.Table(self.table_name)

    async def list_incidents(self) -> List[Incident]:
        # MVP：scan 全表（后续上地理索引再优化）
        resp = self._table.scan()
        items = resp.get("Items", [])
        return [Incident(**it) for it in items]

    async def create_incident(self, incident: Incident) -> Incident:
        self._table.put_item(Item=incident.model_dump())
        return incident
