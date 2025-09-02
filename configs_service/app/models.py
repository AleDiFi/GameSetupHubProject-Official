from pydantic import BaseModel
from typing import Dict, List, Optional

class ConfigCreate(BaseModel):
    game: str
    title: str
    description: Optional[str]
    parameters: Dict[str, str]
    tags: List[str]
