from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class ConfigurationView(BaseModel):
    id: str
    game: str
    title: str
    description: Optional[str]
    parameters: Dict[str, Any]
    tags: List[str]
    # author as structured object to provide username and email for frontend
    author: Optional[Dict[str, str]] = None
    # keep the original user id to allow additional lookups from the frontend if needed
    user_id: Optional[str] = None
    created_at: datetime
    average_rating: Optional[float]
    total_ratings: int
    views: int = 0
    comments: List[Any]
    comments_count: int
    likes_count: int

class ConfigurationDetails(ConfigurationView):
    pass

class GameConfigurationsView(BaseModel):
    game: str
    total_configurations: int
    configurations: List[ConfigurationView]

class SearchConfigsResponse(BaseModel):
    configs: List[ConfigurationView]
    total: int
    limit: int
    offset: int
    has_more: bool
