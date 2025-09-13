import requests
from fastapi import HTTPException
from typing import Optional, Any
from datetime import datetime
from typing import List, Dict
from .models import ConfigurationView
from .database import comments_collection, ratings_collection, likes_collection

USERS_SERVICE_URL = "http://user-service:8000"
CONFIGS_SERVICE_URL = "http://configs-service:8000"

def get_user_info(user_id: str):
    # Recupera informazioni utente dal servizio users
    response = requests.get(f"{USERS_SERVICE_URL}/users/{user_id}")
    if response.status_code == 200:
        return response.json()
    else:
        return {"username": "Utente sconosciuto"}
    
def get_configuration_from_service(config_id: str):
    # Recupera una configurazione dal servizio configs
    # chiedi di non incrementare il contatore views quando questa chiamata è fatta internamente
    response = requests.get(f"{CONFIGS_SERVICE_URL}/configs/{config_id}", params={"increment": "false"})
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 404:
        return None
    else:
        raise HTTPException(status_code=503, detail="Servizio configurazioni non disponibile")
    
def get_configurations_by_game(game: str):
    # Recupera tutte le configurazioni per un gioco
    response = requests.get(f"{CONFIGS_SERVICE_URL}/configs/", params={"game": game})
    if response.status_code == 200:
        return response.json()
    else:
        raise HTTPException(status_code=503, detail="Servizio configurazioni non disponibile")


def sanitize_bson(obj):
    """Recursively convert BSON ObjectId to str for JSON serialization."""
    from bson import ObjectId
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if isinstance(v, ObjectId):
                out[k] = str(v)
            elif isinstance(v, (list, tuple)):
                out[k] = [sanitize_bson(x) for x in v]
            elif isinstance(v, dict):
                out[k] = sanitize_bson(v)
            else:
                out[k] = v
        return out
    elif isinstance(obj, (list, tuple)):
        return [sanitize_bson(x) for x in obj]
    else:
        return obj


def find_bson_residuals(payload):
    """Find paths in payload that still contain bson.ObjectId instances."""
    from bson import ObjectId as _ObjectId

    def _find(obj, path=''):
        found = []
        if isinstance(obj, dict):
            for k, v in obj.items():
                new_path = f"{path}.{k}" if path else k
                if isinstance(v, _ObjectId):
                    found.append(new_path)
                elif isinstance(v, dict) or isinstance(v, list):
                    found.extend(_find(v, new_path))
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                new_path = f"{path}[{i}]"
                if isinstance(v, _ObjectId):
                    found.append(new_path)
                elif isinstance(v, dict) or isinstance(v, list):
                    found.extend(_find(v, new_path))
        return found

    return _find(payload)


def enrich_configuration(config: dict) -> ConfigurationView:
    """Build an enriched ConfigurationView from raw config dict.

    This function reads comments/ratings/likes from local collections,
    sanitizes BSON ObjectIds, enriches comments with user info and avatar,
    computes averages and counts, and returns a `ConfigurationView`.
    """
    config_id = config.get("_id")

    # counts
    likes_count = likes_collection.count_documents({"config_id": config_id})

    # load comments and ratings from their collections and sanitize them
    raw_comments = list(comments_collection.find({"config_id": config_id}))
    raw_ratings = list(ratings_collection.find({"config_id": config_id}))

    comments = []
    for c in raw_comments:
        c_s = sanitize_bson(c)
        if "_id" in c_s:
            c_s["id"] = str(c_s.pop("_id"))
        try:
            user_info = get_user_info(c_s.get("user_id")) if c_s.get("user_id") else None
            if user_info:
                c_s.setdefault("username", user_info.get("username"))
                avatar = user_info.get("avatar_url") if isinstance(user_info, dict) else None
                if not avatar:
                    uname = c_s.get("username") or 'U'
                    avatar = f"https://ui-avatars.com/api/?name={uname.replace(' ', '+')}&background=0D6EFD&color=fff&size=128"
                c_s["avatar_url"] = avatar
        except Exception:
            pass
        comments.append(c_s)

    ratings = []
    for r in raw_ratings:
        r_s = sanitize_bson(r)
        if "_id" in r_s:
            r_s["id"] = str(r_s.pop("_id"))
        ratings.append(r_s)

    total_ratings = len(ratings)
    avg_rating = round(sum(r.get("rating", 0) for r in ratings) / total_ratings, 2) if total_ratings else None

    author_info = get_user_info(config.get("user_id")) or {}

    # Debug: detect bson residuals
    try:
        residuals = find_bson_residuals({
            'config': config,
            'comments': comments,
            'ratings': ratings
        })
        if residuals:
            print('DEBUG: Found residual BSON ObjectId at paths:', residuals)
    except Exception as e:
        print('DEBUG: BSON inspect failed:', e)

    author_obj = None
    if author_info:
        author_obj = {
            "username": author_info.get("username", "Utente sconosciuto"),
            "email": author_info.get("email", "-")
        }

    return ConfigurationView(
        id=str(config_id),
        game=config.get("game", ""),
        title=config.get("title", ""),
        description=config.get("description"),
        parameters=config.get("parameters", {}),
        tags=config.get("tags", []),
        author=author_obj,
        user_id=str(config.get("user_id")) if config.get("user_id") else None,
        created_at=config.get("created_at", datetime.now()),
        average_rating=avg_rating,
        total_ratings=total_ratings,
        views=int(config.get("views", 0)),
        comments=comments,
        comments_count=len(comments),
        likes_count=likes_count
    )
