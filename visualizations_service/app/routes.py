from fastapi import APIRouter, HTTPException, Query
from .models import (
    ConfigurationView, ConfigurationDetails,
    Rating, Comment, GameConfigurationsView,
    SearchConfigsRequest, SearchConfigsResponse,
    SortField, SortOrder
)
from .database import configurations_collection, ratings_collection, comments_collection
from .utils import get_configuration_from_service, get_configurations_by_game, get_user_info, build_search_query, get_sort_criteria
from bson import ObjectId
from datetime import datetime
from typing import List, Optional
import time

router = APIRouter()

def calculate_average_rating(config_id: str) -> tuple[Optional[float], int]:
    """Calcola la valutazione media di una configurazione (fallback su valutations)"""
    ratings = list(ratings_collection.find({"config_id": config_id}))
    # fallback: check legacy collection name if no ratings
    if not ratings:
        # import db and try legacy collection
        from .database import db
        legacy = db.get_collection("valutations")
        if legacy:
            ratings = list(legacy.find({"config_id": config_id}))
    if not ratings:
        return None, 0
    total_rating = sum(r["rating"] for r in ratings)
    count = len(ratings)
    average = round(total_rating / count, 2)
    return average, count

def get_comments_count(config_id: str) -> int:
    """Conta i commenti di una configurazione"""
    return comments_collection.count_documents({"config_id": config_id})

def get_likes_count(config_id: str) -> int:
    """Conta i likes di una configurazione"""
    # Assumendo che ci sia una collection likes nel database
    from .database import db
    likes_collection = db["likes"]
    return likes_collection.count_documents({"config_id": config_id})

def enrich_configuration(config: dict) -> ConfigurationView:
    """Arricchisce una configurazione con valutazioni e informazioni utente"""
    # Normalizza l'id (potrebbe essere ObjectId o stringa)
    config_id = str(config.get("_id"))
    
    # Calcola valutazione media (None, 0 se non ci sono)
    avg_rating, total_ratings = calculate_average_rating(config_id)
    
    # Conta commenti
    comments_count = get_comments_count(config_id)
    
    # Conta likes
    likes_count = get_likes_count(config_id)
    
    # Ottieni informazioni autore
    author_info = get_user_info(config["user_id"])
    
    # Garantiamo valori coerenti al frontend: average_rating può essere None
    return ConfigurationView(
        id=config_id,
        game=config.get("game", ""),
        title=config.get("title", ""),
        description=config.get("description"),
        parameters=config.get("parameters", {}),
        tags=config.get("tags", []),
        author=author_info.get("username", "Utente sconosciuto"),
        created_at=config.get("created_at", datetime.now()),
        average_rating=avg_rating if avg_rating is not None else None,
        total_ratings=total_ratings or 0,
        comments_count=comments_count or 0,
        likes_count=likes_count or 0
    )

@router.get("/search", response_model=SearchConfigsResponse)
def search_configurations(
    # Parametri di query per filtrare le configurazioni
    game: Optional[str] = Query(None, description="Nome del gioco da cercare"),
    title: Optional[str] = Query(None, description="Titolo della configurazione"),
    tags: Optional[List[str]] = Query(None, description="Lista di tag per filtrare"),
    # Parametri per ordinamento
    sort_by: Optional[str] = Query("created_at", description="Campo per ordinamento"),
    sort_order: Optional[str] = Query("desc", description="Direzione ordinamento"),
    # Parametri per paginazione
    limit: int = Query(10, ge=1, le=100, description="Numero massimo risultati per pagina"),
    offset: int = Query(0, ge=0, description="Offset per paginazione")
):
    """
    Endpoint integrato per ricerca e filtraggio delle configurazioni.
    Combina funzionalità di ricerca con enrichment dei dati per visualizzazione.
    """
    try:
        # Converte parametri in enum
        sort_field = SortField(sort_by) if sort_by in [e.value for e in SortField] else SortField.CREATED_AT
        sort_order_enum = SortOrder(sort_order) if sort_order in [e.value for e in SortOrder] else SortOrder.DESC
        
        # Crea richiesta di ricerca
        search_request = SearchConfigsRequest(
            game=game,
            title=title,
            tags=tags,
            sort_by=sort_field,
            sort_order=sort_order_enum,
            limit=limit,
            offset=offset
        )
        
        # Ottieni configurazioni dal servizio configs
        configs = get_configurations_by_game(game) if game else []
        if not game:
            # Se non è specificato un gioco, dobbiamo fare una ricerca più ampia
            # Per ora restituiamo risultato vuoto, ma si potrebbe estendere
            configs = []
        
        # Applica filtri di ricerca locali
        if title:
            configs = [c for c in configs if title.lower() in c.get("title", "").lower()]
        if tags:
            configs = [c for c in configs if any(tag.lower() in [t.lower() for t in c.get("tags", [])] for tag in tags)]
        
        # Conta totale
        total = len(configs)
        
        # Applica paginazione
        paginated_configs = configs[offset:offset + limit]
        
        # Arricchisci ogni configurazione con valutazioni e commenti
        enriched_configs = []
        for config in paginated_configs:
            try:
                enriched_config = enrich_configuration(config)
                enriched_configs.append(enriched_config)
            except Exception:
                continue
        
        # Ordina i risultati
        if sort_field == SortField.AVERAGE_RATING:
            enriched_configs.sort(
                key=lambda x: x.average_rating or 0, 
                reverse=(sort_order_enum == SortOrder.DESC)
            )
        elif sort_field == SortField.POPULARITY:
            enriched_configs.sort(
                key=lambda x: x.likes_count, 
                reverse=(sort_order_enum == SortOrder.DESC)
            )
        
        has_more = (offset + limit) < total
        
        return SearchConfigsResponse(
            configs=enriched_configs,
            total=total,
            limit=limit,
            offset=offset,
            has_more=has_more
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nella ricerca: {str(e)}")

@router.get("/game/{game_name}", response_model=GameConfigurationsView)
def get_game_configurations(
    game_name: str,
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("created_at", regex="^(created_at|average_rating|title|likes_count)$"),
    order: str = Query("desc", regex="^(asc|desc)$")
):
    """
    Visualizza tutte le configurazioni di un determinato gioco.
    Per ogni configurazione mostra: descrizione, parametri, autore, data, valutazione media, commenti, likes.
    """
    # Ottieni configurazioni dal servizio configs
    configs = get_configurations_by_game(game_name)
    
    if not configs:
        return GameConfigurationsView(
            game=game_name,
            total_configurations=0,
            configurations=[]
        )
    
    # Arricchisci le configurazioni con valutazioni e commenti
    enriched_configs = []
    for config in configs:
        try:
            enriched_config = enrich_configuration(config)
            enriched_configs.append(enriched_config)
        except Exception as e:
            # Log error e continua con la prossima configurazione
            continue
    
    # Ordina le configurazioni
    reverse = order == "desc"
    if sort_by == "average_rating":
        enriched_configs.sort(
            key=lambda x: x.average_rating or 0, 
            reverse=reverse
        )
    elif sort_by == "title":
        enriched_configs.sort(
            key=lambda x: x.title.lower(), 
            reverse=reverse
        )
    elif sort_by == "likes_count":
        enriched_configs.sort(
            key=lambda x: x.likes_count, 
            reverse=reverse
        )
    else:  # created_at
        enriched_configs.sort(
            key=lambda x: x.created_at, 
            reverse=reverse
        )
    
    # Applica paginazione
    total = len(enriched_configs)
    paginated_configs = enriched_configs[offset:offset + limit]
    
    return GameConfigurationsView(
        game=game_name,
        total_configurations=total,
        configurations=paginated_configs
    )

@router.get("/configs/{config_id}", response_model=ConfigurationDetails)
def get_configuration_details(config_id: str):
    """
    Visualizza i dettagli completi di una configurazione specifica,
    inclusi tutti i commenti e le valutazioni.
    """
    # Ottieni configurazione dal servizio configs
    config = get_configuration_from_service(config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configurazione non trovata")
    
    # Arricchisci con dati di visualizzazione
    enriched_config = enrich_configuration(config)
    
    # Ottieni commenti
    comments_data = list(comments_collection.find({"config_id": config_id}))
    comments = []
    for comment_data in comments_data:
        user_info = get_user_info(comment_data["user_id"])
        comments.append({
            "id": str(comment_data["_id"]),
            "user_id": comment_data["user_id"],
            "username": user_info.get("username", "Utente sconosciuto"),
            "comment": comment_data["comment"],
            "created_at": comment_data["created_at"]
        })
    
    # Ottieni valutazioni
    ratings_data = list(ratings_collection.find({"config_id": config_id}))
    ratings = []
    for rating_data in ratings_data:
        user_info = get_user_info(rating_data["user_id"])
        ratings.append({
            "id": str(rating_data["_id"]),
            "user_id": rating_data["user_id"],
            "username": user_info.get("username", "Utente sconosciuto"),
            "rating": rating_data["rating"],
            "comment": rating_data.get("comment"),
            "created_at": rating_data["created_at"]
        })
    
    # Ottieni likes
    from .database import db
    likes_collection = db["likes"]
    likes_data = list(likes_collection.find({"config_id": config_id}))
    likes = []
    for like_data in likes_data:
        user_info = get_user_info(like_data["user_id"])
        likes.append({
            "id": str(like_data["_id"]),
            "user_id": like_data["user_id"],
            "username": user_info.get("username", "Utente sconosciuto"),
            "created_at": like_data["created_at"]
        })
    
    return ConfigurationDetails(
        **enriched_config.model_dump(),
        comments=comments,
        ratings=ratings,
        likes=likes
    )

@router.get("/configs/{config_id}/ratings", response_model=List[Rating])
def get_configuration_ratings(config_id: str):
    """Ottieni tutte le valutazioni di una configurazione"""
    ratings_data = list(ratings_collection.find({"config_id": config_id}))
    ratings = []
    
    for rating_data in ratings_data:
        user_info = get_user_info(rating_data["user_id"])
        ratings.append(Rating(
            id=str(rating_data["_id"]),
            config_id=rating_data["config_id"],
            user_id=rating_data["user_id"],
            username=user_info.get("username", "Utente sconosciuto"),
            rating=rating_data["rating"],
            comment=rating_data.get("comment"),
            created_at=rating_data["created_at"]
        ))
    
    return ratings

@router.get("/configs/{config_id}/comments", response_model=List[Comment])
def get_configuration_comments(config_id: str):
    """Ottieni tutti i commenti di una configurazione"""
    comments_data = list(comments_collection.find({"config_id": config_id}))
    comments = []
    
    for comment_data in comments_data:
        user_info = get_user_info(comment_data["user_id"])
        comments.append(Comment(
            id=str(comment_data["_id"]),
            config_id=comment_data["config_id"],
            user_id=comment_data["user_id"],
            username=user_info.get("username", "Utente sconosciuto"),
            comment=comment_data["comment"],
            created_at=comment_data["created_at"]
        ))
    
    return comments

@router.get("/config/{config_id}/likes")
def get_configuration_likes(config_id: str):
    """Ottieni tutti i likes di una configurazione"""
    from .database import db
    likes_collection = db["likes"]
    
    likes_data = list(likes_collection.find({"config_id": config_id}))
    likes = []
    
    for like_data in likes_data:
        user_info = get_user_info(like_data["user_id"])
        likes.append({
            "id": str(like_data["_id"]),
            "user_id": like_data["user_id"],
            "username": user_info.get("username", "Utente sconosciuto"),
            "created_at": like_data["created_at"]
        })
    
    return {
        "config_id": config_id,
        "total_likes": len(likes),
        "likes": likes
    }

# Endpoint di statistiche aggregate
@router.get("/stats/popular-games")
def get_popular_games():
    """Ottieni statistiche sui giochi più popolari basate su likes e ratings"""
    # Aggregazione per ottenere statistiche per gioco
    pipeline = [
        {
            "$lookup": {
                "from": "configurations",
                "localField": "config_id",
                "foreignField": "_id",
                "as": "config"
            }
        },
        {"$unwind": "$config"},
        {
            "$group": {
                "_id": "$config.game",
                "total_ratings": {"$sum": 1},
                "average_rating": {"$avg": "$rating"}
            }
        },
        {"$sort": {"total_ratings": -1}},
        {"$limit": 10}
    ]
    
    try:
        results = list(ratings_collection.aggregate(pipeline))
        return {
            "popular_games": [
                {
                    "game": result["_id"],
                    "total_ratings": result["total_ratings"],
                    "average_rating": round(result["average_rating"], 2) if result["average_rating"] else 0
                }
                for result in results
            ]
        }
    except Exception as e:
        return {"popular_games": [], "error": "Could not retrieve statistics"}

@router.get("/stats/top-configurations")
def get_top_configurations(limit: int = Query(10, ge=1, le=50)):
    """Ottieni le configurazioni con rating più alto"""
    pipeline = [
        {
            "$group": {
                "_id": "$config_id",
                "average_rating": {"$avg": "$rating"},
                "total_ratings": {"$sum": 1}
            }
        },
        {"$match": {"total_ratings": {"$gte": 3}}},  # Almeno 3 ratings
        {"$sort": {"average_rating": -1, "total_ratings": -1}},
        {"$limit": limit}
    ]
    
    try:
        results = list(ratings_collection.aggregate(pipeline))
        
        top_configs = []
        for result in results:
            # Ottieni dettagli configurazione
            config = get_configuration_from_service(result["_id"])
            if config:
                enriched = enrich_configuration(config)
                top_configs.append(enriched)
        
        return {
            "top_configurations": top_configs
        }
    except Exception as e:
        return {"top_configurations": [], "error": "Could not retrieve top configurations"}
