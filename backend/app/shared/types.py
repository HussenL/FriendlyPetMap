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
    created_at: str | None = None  # ISO string (UTC). Old records may be None.


class IncidentCreateIn(BaseModel):
    lng: float
    lat: float
    title: str = Field(min_length=1, max_length=120)


class IncidentUpdateIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class ConsolePaged(BaseModel):
    page: int
    page_size: int
    total: int
    items: list[Any]


class CommentUpdateIn(BaseModel):
    incident_id: str
    created_at: str
    content: str = Field(min_length=1, max_length=2000)


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


class ConsoleCommentRow(Comment):
    incident_lng: float
    incident_lat: float
    incident_title: str


class CommentCreateOut(BaseModel):
    ok: bool = True
    comment: Comment


class CommentListOut(BaseModel):
    incident_id: str
    items: List[Comment]