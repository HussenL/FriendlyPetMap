from typing import List
from app.shared.types import Incident
from app.shared.config import settings

try:
    import boto3  # noqa
except Exception:
    boto3 = None


class IncidentsRepo:
    async def list_incidents(self) -> List[Incident]:
        # MVP：默认返回 demo；你把 DDB 表接上后改下面分支即可
        if settings.ddb_incidents_table and boto3:
            # 轻量实现：scan（后续可换 GSI/分页）
            ddb = boto3.resource("dynamodb", region_name=settings.aws_region)
            table = ddb.Table(settings.ddb_incidents_table)
            resp = table.scan()
            items = resp.get("Items", [])
            return [Incident(**it) for it in items]

        return [
            Incident(incident_id="demo-1", lng=121.5654, lat=25.0330, title="示例点位"),
        ]
