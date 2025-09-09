from fastapi import APIRouter, Depends, HTTPException
from .models import ConfigCreate
from .database import configs_collection
from .auth import get_current_user
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.post("/")
def upload_config(config: ConfigCreate, user=Depends(get_current_user)):
    # Inizializza alcuni campi con valori neutrali: views a 0; non impostare valutazioni o likes qui
    config_doc = {
        "user_id": user["user_id"],
        "game": config.game,
        "title": config.title,
        "description": config.description,
        "parameters": config.parameters,
        "tags": config.tags,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "views": 0
    }
    result = configs_collection.insert_one(config_doc)
    return {"msg": "Configurazione caricata", "id": str(result.inserted_id)}

@router.get("/{config_id}")
def get_config(config_id: str):
    try:
        obj_id = ObjectId(config_id)
        config = configs_collection.find_one({"_id": obj_id})
    except Exception:
        config = configs_collection.find_one({"_id": config_id})
    if not config:
        raise HTTPException(status_code=404, detail="Configurazione non trovata")
    
    config["_id"] = str(config["_id"])
    return config

@router.get("/")
def search_configs(game: str = None):
    query = {"game": {"$regex": game, "$options": "i"}} if game else {}
    configs = list(configs_collection.find(query).limit(10))
    for c in configs:
        c["_id"] = str(c["_id"])
    return configs
