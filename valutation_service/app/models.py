from pydantic import BaseModel, Field
from typing import Optional

# Modello per creare una valutazione (rating/score)
class ValutationCreate(BaseModel):
    rating: int = Field(ge=1, le=5, description="Rating da 1 a 5 stelle")
    comment: Optional[str] = None

# Modello per creare un commento
class CommentCreate(BaseModel):
    comment: str


class CommentUpdate(BaseModel):
    comment: str

# Modello per creare un like
class LikeCreate(BaseModel):
    pass  # Non servono campi aggiuntivi, user_id e config_id vengono dal context

# Modelli legacy per compatibilità (se necessario)
class Valutation(BaseModel):
    id: Optional[str] = None
    user_id: str
    config_id: str
    score: int

class Comment(BaseModel):
    id: Optional[str] = None
    user: str
    config_id: str
    text: str

class Like(BaseModel):
    id: Optional[str] = None
    user: str
    config_id: str
