from app.shared.config import settings

try:
    import boto3  # noqa
except Exception:
    boto3 = None


class CommentsRepo:
    async def create_comment(self, item: dict) -> None:
        if settings.ddb_comments_table and boto3:
            ddb = boto3.resource("dynamodb", region_name=settings.aws_region)
            table = ddb.Table(settings.ddb_comments_table)
            table.put_item(Item=item)
            return

        # MVP mock：不持久化
        return
