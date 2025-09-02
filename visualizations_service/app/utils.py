import requests
from fastapi import HTTPException
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import re
from .models import SearchConfigsRequest, SortField, SortOrder

USERS_SERVICE_URL = "http://user-service:8000"
CONFIGS_SERVICE_URL = "http://configs-service:8000"

def verify_user_token(token: str):
    """Verifica il token utente tramite il servizio users"""
    try:
        response = requests.get(
            f"{USERS_SERVICE_URL}/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=401, detail="Token non valido")
    except requests.exceptions.RequestException:
        raise HTTPException(status_code=503, detail="Servizio utenti non disponibile")

def get_configuration_from_service(config_id: str):
    """Ottiene una configurazione dal servizio configs"""
    try:
        response = requests.get(f"{CONFIGS_SERVICE_URL}/configs/{config_id}")
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404:
            return None
        else:
            raise HTTPException(status_code=503, detail="Servizio configurazioni non disponibile")
    except requests.exceptions.RequestException:
        raise HTTPException(status_code=503, detail="Servizio configurazioni non disponibile")

def get_configurations_by_game(game: str):
    """Ottiene tutte le configurazioni di un gioco dal servizio configs"""
    try:
        response = requests.get(f"{CONFIGS_SERVICE_URL}/configs/", params={"game": game})
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=503, detail="Servizio configurazioni non disponibile")
    except requests.exceptions.RequestException:
        raise HTTPException(status_code=503, detail="Servizio configurazioni non disponibile")

def get_user_info(user_id: str):
    """Ottiene informazioni utente dal servizio users"""
    try:
        response = requests.get(f"{USERS_SERVICE_URL}/users/{user_id}")
        if response.status_code == 200:
            return response.json()
        else:
            return {"username": "Utente sconosciuto"}
    except requests.exceptions.RequestException:
        return {"username": "Utente sconosciuto"}

# Funzioni di ricerca integrate dal Search Service
def build_search_query(search_request: SearchConfigsRequest) -> Dict[str, Any]:
    """Costruisce una query MongoDB per la ricerca"""
    query = {}
    
    # Ricerca per nome del gioco
    if search_request.game and search_request.game.strip():
        escaped_game = re.escape(search_request.game.strip())
        query["game"] = {"$regex": escaped_game, "$options": "i"}
    
    # Ricerca per titolo
    if search_request.title and search_request.title.strip():
        escaped_title = re.escape(search_request.title.strip())
        query["title"] = {"$regex": escaped_title, "$options": "i"}
    
    # Filtro per tag
    if search_request.tags and len(search_request.tags) > 0:
        clean_tags = [tag.strip().lower() for tag in search_request.tags if tag.strip()]
        if clean_tags:
            query["tags"] = {"$in": clean_tags}
    
    return query

def get_sort_criteria(sort_field: SortField, sort_order: SortOrder) -> List[Tuple[str, int]]:
    """Converte i parametri di ordinamento in criteri MongoDB"""
    direction = 1 if sort_order == SortOrder.ASC else -1
    
    # Mappiamo i campi agli equivalenti nel database
    field_mapping = {
        SortField.GAME: "game",
        SortField.TITLE: "title", 
        SortField.POPULARITY: "popularity",
        SortField.CREATED_AT: "created_at",
        SortField.AVERAGE_RATING: "average_rating"
    }
    
    mongo_field = field_mapping.get(sort_field, "created_at")
    return [(mongo_field, direction)]
