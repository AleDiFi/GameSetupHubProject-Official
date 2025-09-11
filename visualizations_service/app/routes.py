from fastapi import APIRouter, HTTPException, Query
from .models import ConfigurationView, ConfigurationDetails, GameConfigurationsView, SearchConfigsResponse
from .database import comments_collection, ratings_collection, likes_collection
from .utils import get_user_info, get_configuration_from_service, get_configurations_by_game
from datetime import datetime
from bson import ObjectId
from typing import List, Optional

router = APIRouter()

def _sanitize_bson(obj):
    """Recursively convert BSON types (ObjectId) to JSON-serializable types (str).
    Leaves datetimes as-is so Pydantic can parse them into datetime objects.
    """
    from bson import ObjectId
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if isinstance(v, ObjectId):
                out[k] = str(v)
            elif isinstance(v, list) or isinstance(v, tuple):
                out[k] = [_sanitize_bson(x) for x in v]
            elif isinstance(v, dict):
                out[k] = _sanitize_bson(v)
            else:
                out[k] = v
        return out
    elif isinstance(obj, list) or isinstance(obj, tuple):
        return [_sanitize_bson(x) for x in obj]
    else:
        return obj


def enrich_configuration(config: dict) -> ConfigurationView:
    # config may come from configs service where _id is already converted to str,
    # but comments/ratings returned from Mongo contain ObjectId in their _id fields.
    config_id = config.get("_id")

    # counts
    likes_count = likes_collection.count_documents({"config_id": config_id})

    # load comments and ratings from their collections and sanitize them
    raw_comments = list(comments_collection.find({"config_id": config_id}))
    raw_ratings = list(ratings_collection.find({"config_id": config_id}))

    # sanitize BSON types to make them JSON serializable / acceptable by Pydantic
    comments = []
    for c in raw_comments:
        c_s = _sanitize_bson(c)
        # normalize id field name for frontend convenience
        if "_id" in c_s:
            c_s["id"] = str(c_s.pop("_id"))
        comments.append(c_s)

    ratings = []
    for r in raw_ratings:
        r_s = _sanitize_bson(r)
        if "_id" in r_s:
            r_s["id"] = str(r_s.pop("_id"))
        ratings.append(r_s)

    total_ratings = len(ratings)
    avg_rating = round(sum(r.get("rating", 0) for r in ratings) / total_ratings, 2) if total_ratings else None

    author_info = get_user_info(config.get("user_id")) or {}

    # Debug: check for any remaining BSON ObjectId instances in the payload
    try:
        from bson import ObjectId as _ObjectId
        def _find_bson(obj, path=''):
            found = []
            if isinstance(obj, dict):
                for k, v in obj.items():
                    new_path = f"{path}.{k}" if path else k
                    if isinstance(v, _ObjectId):
                        found.append(new_path)
                    elif isinstance(v, dict) or isinstance(v, list):
                        found.extend(_find_bson(v, new_path))
            elif isinstance(obj, list):
                for i, v in enumerate(obj):
                    new_path = f"{path}[{i}]"
                    if isinstance(v, _ObjectId):
                        found.append(new_path)
                    elif isinstance(v, dict) or isinstance(v, list):
                        found.extend(_find_bson(v, new_path))
            return found

        residuals = _find_bson({
            'config': config,
            'comments': comments,
            'ratings': ratings
        })
        if residuals:
            # log to stdout so container logs capture it
            print('DEBUG: Found residual BSON ObjectId at paths:', residuals)
    except Exception as e:
        print('DEBUG: BSON inspect failed:', e)

    # Build structured author object for frontend
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

@router.get("/configs/{config_id}", response_model=ConfigurationDetails)
def get_configuration_details(config_id: str):
    config = get_configuration_from_service(config_id)
    return enrich_configuration(config)

@router.get("/game/{game_name}")
def get_game_configurations(
    game_name: str,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    configs = get_configurations_by_game(game_name)
    total = len(configs)
    enriched = [enrich_configuration(c) for c in configs]
    has_more = offset + limit < total
    return {
        "game": game_name,
        "total_configurations": total,
        "configurations": enriched,
        "limit": limit,
        "offset": offset,
        "has_more": has_more
    }

@router.get("/search", response_model=SearchConfigsResponse)
def search_configurations(
    game: Optional[str] = Query(None),
    title: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    query = {}
    if game:
        query["game"] = game
    if title:
        query["title"] = {"$regex": title, "$options": "i"}
    if tags:
        query["tags"] = {"$in": tags}

    configs = get_configurations_by_game(game)
    total = len(configs)
    configs = [c for c in configs if c.get("title") and title.lower() in c["title"].lower()]
    if tags:
        configs = [c for c in configs if set(tags) & set(c.get("tags", []))]
    enriched = [enrich_configuration(c) for c in configs]
    has_more = offset + limit < total
    return SearchConfigsResponse(
        configs=enriched,
        total=total,
        limit=limit,
        offset=offset,
        has_more=has_more
    )

# Non sappiamo dove e se vengono usati, per ora teniamoli ma sono da eliminare in futuro
'''
@router.get("/stats/popular-games")
def get_popular_games(limit: int = Query(10, ge=1, le=100)):
    pipeline = [
        {
            "$group": {
                "_id": "$game",
                "total_ratings": {"$sum": 1},
                "average_rating": {"$avg": "$rating"}
            }
        },
        {"$sort": {"total_ratings": -1}},
        {"$limit": limit}
    ]
    results = list(ratings_collection.aggregate(pipeline))
    return {
        "popular_games": [
            {
                "game": r["_id"],
                "total_ratings": r["total_ratings"],
                "average_rating": round(r["average_rating"], 2) if r["average_rating"] else 0
            }
            for r in results
        ]
    }

@router.get("/stats/top-configurations")
def get_top_configurations(limit: int = Query(10, ge=1, le=100)):
    pipeline = [
        {
            "$group": {
                "_id": "$config_id",
                "average_rating": {"$avg": "$rating"},
                "total_ratings": {"$sum": 1}
            }
        },
        {"$sort": {"average_rating": -1, "total_ratings": -1}},
        {"$limit": limit}
    ]
    results = list(ratings_collection.aggregate(pipeline))
    top_configs = []
    for r in results:
        config = get_configuration_from_service(str(r["_id"]))
        if config:
            enriched = enrich_configuration(config)
            top_configs.append(enriched)
    return {
        "top_configurations": top_configs
    }
'''
