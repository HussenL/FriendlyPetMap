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

from decimal import Decimal
from typing import Any

from app.shared.types import Comment


def _to_dynamodb(value: Any) -> Any:
    """
    Recursively convert float to Decimal for DynamoDB.
    DynamoDB (boto3) does NOT accept Python float.
    """
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {k: _to_dynamodb(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_dynamodb(v) for v in value]
    return value


class CommentsRepo:
    def __init__(self) -> None:
        # TODO: 保留你原本的 DynamoDB 初始化方式（region/table name/credentials）
        # 例如（示意）：
        #   import os, boto3
        #   region = os.getenv("AWS_REGION", "ap-northeast-2")
        #   table_name = os.getenv("DDB_COMMENTS_TABLE", "FriendlyPetMapComments")
        #   self._ddb = boto3.resource("dynamodb", region_name=region)
        #   self._table = self._ddb.Table(table_name)
        #
        # 如果你当前 repo 还是内存 dict，就先别用这份；但你现在已经接 DDB 了，所以应该有 _table。
        pass

    async def add(self, comment: Comment) -> Comment:
        item = _to_dynamodb(comment.model_dump())
        self._table.put_item(Item=item)
        return comment

    async def list_by_incident(self, incident_id: str) -> list[Comment]:
        """
        推荐：用 Query（需要你的 Comments 表有合适的 PK/SK 设计）。
        如果你现在暂时用 Scan 也能跑，但成本高。
        这里先按你现有 repo 实现来写：
        - 如果你已有 Query 写法：保留你原来的那段即可
        - 如果你没有：先用 Scan 兜底（MVP 可接受）
        """
        # TODO: 如果你已经实现了 Query，请直接把你现有的 query 逻辑放回这里并 return items

        # ===== Scan 兜底（MVP）=====
        from boto3.dynamodb.conditions import Attr

        resp = self._table.scan(
            FilterExpression=Attr("incident_id").eq(incident_id)
        )
        raw_items = resp.get("Items", [])

        # DynamoDB 返回的数值会是 Decimal；你的模型字段如果是 float/int 会自动转换或你自行处理
        return [Comment(**it) for it in raw_items]
