#!/usr/bin/env python3

import requests
import json
import time

def test_quick():
    print("🚀 Test Quick Architecture")
    
    # 1. Login con utente esistente
    login_data = {"email": "test3@test.com", "password": "password123"}
    response = requests.post("http://localhost:8001/users/login-json", json=login_data)
    
    if response.status_code != 200:
        print(f"❌ Login fallito: {response.text}")
        return
    
    token = response.json()["access_token"]
    print("✅ Login OK")
    
    # 2. Creiamo una configurazione
    headers = {"Authorization": f"Bearer {token}"}
    config_data = {
        "game": "Test Game",
        "title": f"Test Config {int(time.time())}",
        "description": "Test configuration",
        "parameters": {"test": "value"},
        "tags": ["test", "quick"]
    }
    
    response = requests.post("http://localhost:8002/configs/", json=config_data, headers=headers)
    if response.status_code not in [200, 201]:
        print(f"❌ Creazione config fallita: {response.text}")
        return
    
    print(f"Config response: {response.text}")  # Debug
    response_data = response.json()
    
    # Proviamo diversi possibili nomi di campo
    if "id" in response_data:
        config_id = response_data["id"]
    elif "_id" in response_data:
        config_id = response_data["_id"]
    elif "config_id" in response_data:
        config_id = response_data["config_id"]
    else:
        print(f"❌ Non riesco a trovare l'ID nella risposta: {response_data}")
        return
    print(f"✅ Configurazione creata: {config_id}")
    
    # 3. Test Valutations Service con timeout corto
    rating_data = {"rating": 5, "comment": "Ottima configurazione!"}
    
    try:
        response = requests.post(
            f"http://localhost:8004/valutations/config/{config_id}/rating",
            json=rating_data,
            headers=headers,
            timeout=10  # Timeout di 10 secondi
        )
        
        print(f"Valutations Response: {response.status_code}")
        if response.status_code in [200, 201]:
            print("✅ AUTENTICAZIONE FUNZIONA!")
            print(f"Response: {response.text}")
        else:
            print(f"❌ Errore: {response.text}")
            
    except requests.exceptions.Timeout:
        print("⏰ Timeout - il servizio potrebbe essere bloccato")
    except Exception as e:
        print(f"❌ Errore di connessione: {e}")
    
    # 4. Test Visualizations Service
    try:
        response = requests.get(f"http://localhost:8003/visualizations/search?game=Test%20Game&limit=1", timeout=5)
        print(f"Visualizations Response: {response.status_code}")
        if response.status_code == 200:
            print("✅ Visualizations Service funziona!")
        else:
            print(f"❌ Visualizations errore: {response.text}")
    except Exception as e:
        print(f"❌ Visualizations errore: {e}")

if __name__ == "__main__":
    test_quick()
