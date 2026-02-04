from .repo import IncidentsRepo


class IncidentsService:
    def __init__(self, repo: IncidentsRepo):
        self.repo = repo

    async def list_incidents(self):
        return await self.repo.list_incidents()
