
from pydantic import BaseModel, Field
from typing import Optional

# Modello per creare una valutazione (rating/score)
class ValutationCreate(BaseModel):
    rating: int = Field(ge=1, le=5, description="Rating da 1 a 5 stelle")
    comment: Optional[str] = None

# Modello principale per valutazione
class Valutation(BaseModel):
    id: Optional[str] = None
    user_id: str
    config_id: str
    score: int

# Modello per creare un commento (con parent_id opzionale)
class CommentCreate(BaseModel):
    comment: str
    parent_id: Optional[str] = None

# Modello principale per commento
class Comment(BaseModel):
    id: Optional[str] = None
    user: str
    config_id: str
    text: str
    parent_id: Optional[str] = None

class CommentUpdate(BaseModel):
    comment: str

# Modello per creare un like
class LikeCreate(BaseModel):
    pass  # Non servono campi aggiuntivi, user_id e config_id vengono dal context

# Modello principale per like
class Like(BaseModel):
    id: Optional[str] = None
    user: str
    config_id: str
