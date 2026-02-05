from pydantic import BaseModel, Field
from typing import Any, Optional, List
from datetime import datetime


class AuthCallbackIn(BaseModel):
    code: str
    redirect_uri: str | None = None


class AuthCallbackOut(BaseModel):
    app_token: str
    profile: Optional[dict[str, Any]] = None


class Incident(BaseModel):
    incident_id: str
    lng: float
    lat: float
    title: str


class IncidentCreateIn(BaseModel):
    lng: float
    lat: float
    title: str = Field(min_length=1, max_length=120)


class IncidentCreateOut(BaseModel):
    incident: Incident


class CommentCreateIn(BaseModel):
    incident_id: str
    content: str = Field(min_length=1, max_length=2000)


class Comment(BaseModel):
    comment_id: str
    incident_id: str
    content: str
    created_at: str  # ISO string


class CommentCreateOut(BaseModel):
    ok: bool = True
    comment: Comment


class CommentListOut(BaseModel):
    incident_id: str
    items: List[Comment]
