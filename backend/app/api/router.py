from fastapi import APIRouter

from app.modules.auth.routes import router as auth_router
from app.modules.incidents.routes import router as incidents_router
from app.modules.comments.routes import router as comments_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(incidents_router)
router.include_router(comments_router)
