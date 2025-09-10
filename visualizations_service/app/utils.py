import requests
from fastapi import HTTPException
from typing import Optional, Any

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
