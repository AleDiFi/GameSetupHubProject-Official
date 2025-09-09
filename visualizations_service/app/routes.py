from fastapi import APIRouter, HTTPException, Query
from .models import ConfigurationView, ConfigurationDetails, GameConfigurationsView, SearchConfigsResponse
from .database import comments_collection, ratings_collection, likes_collection
from .utils import get_user_info, get_configuration_from_service, get_configurations_by_game
from datetime import datetime
from bson import ObjectId
from typing import List, Optional

router = APIRouter()

def enrich_configuration(config: dict) -> ConfigurationView:
    config_id = config.get("_id")
    likes_count = likes_collection.count_documents({"config_id": config_id})
    comments = list(comments_collection.find({"config_id": config_id}))
    ratings = list(ratings_collection.find({"config_id": config_id}))
    total_ratings = len(ratings)
    avg_rating = round(sum(r.get("rating", 0) for r in ratings) / total_ratings, 2) if total_ratings else None
    author_info = get_user_info(config["user_id"])
    return ConfigurationView(
        id=config_id,
        game=config.get("game", ""),
        title=config.get("title", ""),
        description=config.get("description"),
        parameters=config.get("parameters", {}),
        tags=config.get("tags", []),
        author=author_info.get("username", "Utente sconosciuto"),
        created_at=config.get("created_at", datetime.now()),
        average_rating=avg_rating,
        total_ratings=total_ratings,
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
