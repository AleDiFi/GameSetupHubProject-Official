from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum

# Enumerazioni per la ricerca
class SortOrder(str, Enum):
    """Ordinamento crescente o decrescente"""
    ASC = "asc"
    DESC = "desc"

class SortField(str, Enum):
    """Campi disponibili per l'ordinamento"""
    GAME = "game"
    TITLE = "title"
    POPULARITY = "popularity"
    CREATED_AT = "created_at"
    AVERAGE_RATING = "average_rating"

class ConfigurationView(BaseModel):
    id: str
    game: str
    title: str
    description: Optional[str]
    parameters: Dict[str, str]
    tags: List[str]
    author: str
    created_at: datetime
    average_rating: Optional[float] = None
    total_ratings: int = 0
    comments_count: int = 0
    likes_count: int = 0

class ConfigurationDetails(ConfigurationView):
    comments: List[dict] = []
    ratings: List[dict] = []
    likes: List[dict] = []

class Rating(BaseModel):
    id: str
    config_id: str
    user_id: str
    username: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime

class Comment(BaseModel):
    id: str
    config_id: str
    user_id: str
    username: str
    comment: str
    created_at: datetime

class GameConfigurationsView(BaseModel):
    game: str
    total_configurations: int
    configurations: List[ConfigurationView]

# Modelli per la ricerca
class SearchConfigsRequest(BaseModel):
    """Richiesta di ricerca configurazioni"""
    game: Optional[str] = None
    title: Optional[str] = None
    tags: Optional[List[str]] = None
    sort_by: Optional[SortField] = SortField.CREATED_AT
    sort_order: Optional[SortOrder] = SortOrder.DESC
    limit: Optional[int] = 10
    offset: Optional[int] = 0

class SearchConfigsResponse(BaseModel):
    """Risposta della ricerca configurazioni"""
    configs: List[ConfigurationView]
    total: int
    limit: int
    offset: int
    has_more: bool
