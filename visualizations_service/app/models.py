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
    author: str
    created_at: datetime
    average_rating: Optional[float]
    total_ratings: int
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
