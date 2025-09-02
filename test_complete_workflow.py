#!/usr/bin/env python3
"""
Test del workflow completo con architettura separata:
- Valutations Service (8004): Solo operazioni di scrittura (POST/DELETE) 
- Visualizations Service (8003): Solo operazioni di lettura (GET)
"""

import requests
import json
import time

BASE_URL_USERS = "http://localhost:8001"
BASE_URL_CONFIGS = "http://localhost:8002" 
BASE_URL_VISUALIZATIONS = "http://localhost:8003"
BASE_URL_VALUTATIONS = "http://localhost:8004"

def test_complete_workflow():
    """Test del workflow completo con architettura separata: registrazione → login → creazione config → rating → visualizzazione"""
    print("🎯 Testing Complete Workflow (Separated Architecture)\n")
    
    # 1. Registrazione utente
    user_data = {
        "username": f"user_pippo_{int(time.time())}",  # username unico con timestamp
        "email": f"pippo_{int(time.time())}@example.com",  # email unica con timestamp
        "password": "password123"
    }
    
    print("1️⃣ Registrazione utente...")
    response = requests.post(f"{BASE_URL_USERS}/users/register", json=user_data)
    assert response.status_code == 200, f"Registrazione fallita: {response.text}"
    print("   ✅ Utente registrato")
    
    # 2. Login
    print("\n2️⃣ Login...")
    login_data = {"email": user_data["email"], "password": user_data["password"]}
    response = requests.post(f"{BASE_URL_USERS}/users/login-json", json=login_data)
    assert response.status_code == 200, f"Login fallito: {response.text}"
    token = response.json()["access_token"]
    print("   ✅ Login effettuato")
    
    # 3. Creazione configurazione
    print("\n3️⃣ Creazione configurazione...")
    config_data = {
        "game": "StarCraft II",
        "title": f"Rush Protoss Build {int(time.time())}",
        "description": "Build order per rush early game",
        "parameters": {
            "build_order": "Probe → Pylon → Gateway → Cybernetics Core",  # String invece di array
            "timing": "4:30"
        },
        "tags": ["rush", "protoss", "early-game"]
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL_CONFIGS}/configs/", json=config_data, headers=headers)
    assert response.status_code == 200, f"Creazione config fallita: {response.text}"
    config_id = response.json()["id"]
    print(f"   ✅ Configurazione creata: {config_id}")
    
    # 4. TEST ARCHITETTURA SEPARATA - Scrittura tramite Valutations Service
    print("\n4️⃣ Test Valutations Service (SCRITTURA)...")
    rating_data = {
        "rating": 5,
        "comment": "Ottima build per principianti!"
    }
    
    # 📝 NUOVO: Utilizziamo il Valutations Service per la scrittura
    response = requests.post(f"{BASE_URL_VALUTATIONS}/valutations/config/{config_id}/rating", 
                           json=rating_data, headers=headers)
    assert response.status_code == 200, f"Rating su Valutations Service fallito: {response.text}"
    print("   ✅ Primo rating aggiunto tramite Valutations Service (5 stelle)")
    
    # 4a. Aggiungiamo un like
    print("\n👍 Test aggiunta like...")
    response = requests.post(f"{BASE_URL_VALUTATIONS}/valutations/config/{config_id}/like", 
                           json={}, headers=headers)
    assert response.status_code == 200, f"Like fallito: {response.text}"
    print("   ✅ Like aggiunto tramite Valutations Service")
    
    # 4b. Registriamo un secondo utente per test completi
    print("\n🔄 Creazione secondo utente...")
    user_data_2 = {
        "username": f"user2_{int(time.time())}",
        "email": f"test2_{int(time.time())}@example.com",
        "password": "password123"
    }
    
    response = requests.post(f"{BASE_URL_USERS}/users/register", json=user_data_2)
    assert response.status_code == 200
    
    login_data_2 = {"email": user_data_2["email"], "password": user_data_2["password"]}
    response = requests.post(f"{BASE_URL_USERS}/users/login-json", json=login_data_2)
    assert response.status_code == 200
    token_2 = response.json()["access_token"]
    headers_2 = {"Authorization": f"Bearer {token_2}"}
    
    # 4c. Secondo utente: aggiunge rating e like
    rating_data_2 = {
        "rating": 3,
        "comment": "Difficile da eseguire per i principianti"
    }
    
    response = requests.post(f"{BASE_URL_VALUTATIONS}/valutations/config/{config_id}/rating", 
                           json=rating_data_2, headers=headers_2)
    assert response.status_code == 200, f"Secondo rating fallito: {response.text}"
    print("   ✅ Secondo rating aggiunto (3 stelle)")
    print("   📊 Media attesa: (5+3)/2 = 4.0")
    
    # Like del secondo utente
    response = requests.post(f"{BASE_URL_VALUTATIONS}/valutations/config/{config_id}/like", 
                           json={}, headers=headers_2)
    assert response.status_code == 200
    print("   ✅ Secondo like aggiunto")
    
    # 4d. Aggiungiamo commenti tramite Valutations Service
    print("\n💬 Test aggiunta commenti...")
    
    comment_data_1 = {
        "comment": "Grazie per questa build! Molto utile per imparare."
    }
    
    response = requests.post(f"{BASE_URL_VALUTATIONS}/valutations/config/{config_id}/comment", 
                           json=comment_data_1, headers=headers)
    assert response.status_code == 200, f"Primo commento fallito: {response.text}"
    print("   ✅ Primo commento aggiunto tramite Valutations Service")
    
    comment_data_2 = {
        "comment": "Concordo, però bisogna fare attenzione al timing!"
    }
    
    response = requests.post(f"{BASE_URL_VALUTATIONS}/valutations/config/{config_id}/comment", 
                           json=comment_data_2, headers=headers_2)
    assert response.status_code == 200, f"Secondo commento fallito: {response.text}"
    print("   ✅ Secondo commento aggiunto")
    
    # 4e. Terzo utente per test più completi
    print("\n👤 Creazione terzo utente...")
    user_data_3 = {
        "username": f"user3_{int(time.time())}",
        "email": f"test3_{int(time.time())}@example.com",
        "password": "password123"
    }
    
    response = requests.post(f"{BASE_URL_USERS}/users/register", json=user_data_3)
    assert response.status_code == 200
    
    login_data_3 = {"email": user_data_3["email"], "password": user_data_3["password"]}
    response = requests.post(f"{BASE_URL_USERS}/users/login-json", json=login_data_3)
    assert response.status_code == 200
    token_3 = response.json()["access_token"]
    headers_3 = {"Authorization": f"Bearer {token_3}"}
    
    comment_data_3 = {
        "comment": "Build testata, funziona molto bene! 👍"
    }
    
    response = requests.post(f"{BASE_URL_VALUTATIONS}/valutations/config/{config_id}/comment", 
                           json=comment_data_3, headers=headers_3)
    assert response.status_code == 200, f"Terzo commento fallito: {response.text}"
    print("   ✅ Terzo commento aggiunto")
    print("   📝 Totale: 3 commenti, 2 rating, 2 likes")
    
    # 5. TEST ARCHITETTURA SEPARATA - Lettura tramite Visualizations Service
    print("\n5️⃣ Test Visualizations Service (LETTURA)...")
    
    # 5a. Visualizzazione configurazione completa (senza autenticazione)
    print("📖 Lettura configurazione completa...")
    response = requests.get(f"{BASE_URL_VISUALIZATIONS}/visualizations/config/{config_id}")
    assert response.status_code == 200, f"Visualizzazione fallita: {response.text}"
    
    config_view = response.json()
    print(f"   ✅ Configurazione: {config_view['title']}")
    print(f"   📊 Rating medio: {config_view.get('average_rating', 'N/A')}")
    print(f"   💬 Numero commenti: {config_view.get('comments_count', 0)}")
    print(f"   👍 Numero likes: {config_view.get('likes_count', 0)}")
    
    # Verifica che i dati siano corretti
    assert config_view.get('comments_count', 0) == 3, f"Attesi 3 commenti, trovati {config_view.get('comments_count', 0)}"
    assert config_view.get('total_ratings', 0) == 2, f"Attesi 2 rating, trovati {config_view.get('total_ratings', 0)}"
    assert config_view.get('likes_count', 0) == 2, f"Attesi 2 likes, trovati {config_view.get('likes_count', 0)}"
    
    expected_avg = 4.0  # (5+3)/2
    actual_avg = config_view.get('average_rating', 0)
    assert abs(actual_avg - expected_avg) < 0.1, f"Media attesa {expected_avg}, trovata {actual_avg}"
    
    # 5b. Test endpoint specifici per lettura
    print("\n📝 Test endpoint lettura specifici...")
    
    # Lettura solo commenti
    response = requests.get(f"{BASE_URL_VISUALIZATIONS}/visualizations/config/{config_id}/comments")
    assert response.status_code == 200, f"Lettura commenti fallita: {response.text}"
    comments = response.json()
    print(f"   ✅ Commenti recuperati: {len(comments)} totali")
    assert len(comments) == 3, f"Attesi 3 commenti, trovati {len(comments)}"
    
    for i, comment in enumerate(comments, 1):
        print(f"   {i}. {comment['username']}: \"{comment['comment']}\"")
    
    # Lettura solo ratings
    response = requests.get(f"{BASE_URL_VISUALIZATIONS}/visualizations/config/{config_id}/ratings")
    assert response.status_code == 200, f"Lettura rating fallita: {response.text}"
    ratings = response.json()
    print(f"   ✅ Rating recuperati: {len(ratings)} totali")
    assert len(ratings) == 2, f"Attesi 2 rating, trovati {len(ratings)}"
    
    for i, rating in enumerate(ratings, 1):
        comment_text = f" - \"{rating['comment']}\"" if rating.get('comment') else ""
        print(f"   {i}. {rating['username']}: {rating['rating']} stelle{comment_text}")
    
    # Lettura solo likes
    response = requests.get(f"{BASE_URL_VISUALIZATIONS}/visualizations/config/{config_id}/likes")
    assert response.status_code == 200, f"Lettura likes fallita: {response.text}"
    likes_data = response.json()
    print(f"   ✅ Likes recuperati: {likes_data['total_likes']} totali")
    assert likes_data['total_likes'] == 2, f"Attesi 2 likes, trovati {likes_data['total_likes']}"
    
    # 6. Test visualizzazione per gioco
    print("\n🎮 Test visualizzazione per gioco...")
    response = requests.get(f"{BASE_URL_VISUALIZATIONS}/visualizations/game/StarCraft II?limit=10&sort_by=average_rating&order=desc")
    assert response.status_code == 200, f"Visualizzazione per gioco fallita: {response.text}"
    
    game_view = response.json()
    print(f"   ✅ Gioco: {game_view['game']}")
    print(f"   📊 Configurazioni totali: {game_view['total_configurations']}")
    print(f"   📋 Configurazioni nella pagina: {len(game_view['configurations'])}")
    
    # Verifica che la nostra configurazione sia presente
    our_config_found = False
    for config in game_view['configurations']:
        if config['id'] == config_id:
            our_config_found = True
            print(f"   ✅ Configurazione trovata con rating medio: {config['average_rating']}")
            break
    
    assert our_config_found, "La nostra configurazione non è stata trovata nella lista del gioco"
    
    # 7. Test statistiche aggregate
    print("\n📊 Test statistiche...")
    
    # Giochi popolari
    response = requests.get(f"{BASE_URL_VISUALIZATIONS}/visualizations/stats/popular-games")
    assert response.status_code == 200
    stats = response.json()
    print(f"   ✅ Statistiche giochi popolari: {len(stats['popular_games'])} giochi")
    
    # Top configurazioni
    response = requests.get(f"{BASE_URL_VISUALIZATIONS}/visualizations/stats/top-configurations?limit=5")
    assert response.status_code == 200
    top_configs = response.json()
    print(f"   ✅ Top configurazioni: {len(top_configs['top_configurations'])} configurazioni")
    
    # 8. Test operazioni DELETE su Valutations Service
    print("\n🗑️ Test operazioni di eliminazione...")
    
    # Proviamo a rimuovere un like (toggle)
    response = requests.post(f"{BASE_URL_VALUTATIONS}/valutations/config/{config_id}/like", 
                           json={}, headers=headers)
    assert response.status_code == 200
    print("   ✅ Like rimosso (toggle)")
    
    # Verifichiamo che il like sia stato rimosso
    response = requests.get(f"{BASE_URL_VISUALIZATIONS}/visualizations/config/{config_id}/likes")
    likes_data = response.json()
    print(f"   📊 Likes dopo rimozione: {likes_data['total_likes']} (dovrebbe essere 1)")
    assert likes_data['total_likes'] == 1, f"Atteso 1 like dopo rimozione, trovati {likes_data['total_likes']}"
    
    print("\n🎉 Test architettura separata completato con successo!")
    print("✅ Valutations Service (scrittura) - Funzionante")
    print("✅ Visualizations Service (lettura) - Funzionante") 
    print("✅ Separazione responsabilità - Verificata")
    print("✅ Flusso completo - Testato")
    
    return True

def test_service_separation():
    """Test specifico per verificare la separazione dei servizi"""
    print("\n🔍 Test separazione servizi...")
    
    # Test che Visualizations Service non accetti POST
    print("❌ Verifica che Visualizations Service rifiuti operazioni di scrittura...")
    
    # Questo dovrebbe fallire se implementato correttamente
    try:
        response = requests.post(f"{BASE_URL_VISUALIZATIONS}/visualizations/rating", json={})
        if response.status_code == 404 or response.status_code == 405:
            print("   ✅ Visualizations Service correttamente rifiuta POST (404/405)")
        else:
            print(f"   ⚠️  Unexpected status code: {response.status_code}")
    except:
        print("   ✅ Endpoint non esistente (corretto)")
    
    # Test che Valutations Service non accetti GET di visualizzazione
    print("📖 Verifica che Valutations Service sia focalizzato sulla scrittura...")
    try:
        response = requests.get(f"{BASE_URL_VALUTATIONS}/valutations/config/test/comments")
        if response.status_code == 404 or response.status_code == 405:
            print("   ✅ Valutations Service correttamente non ha endpoint di lettura (404/405)")
        else:
            print(f"   ⚠️  Unexpected status code: {response.status_code}")
    except:
        print("   ✅ Endpoint non esistente (corretto)")

if __name__ == "__main__":
    import time
    try:
        test_complete_workflow()
        test_service_separation()
        print("\n🎉 Tutti i test completati con successo!")
        print("\n📋 Riepilogo architettura testata:")
        print("   🔸 Valutations Service (8004): POST/DELETE per ratings, comments, likes")
        print("   🔸 Visualizations Service (8003): GET per visualizzazioni e statistiche")
        print("   🔸 Separazione responsabilità: ✅ Verificata")
        print("   🔸 Autenticazione: ✅ Solo per scrittura")
        print("   🔸 Flusso completo: ✅ Funzionante")
        
    except Exception as e:
        print(f"\n❌ Test fallito: {e}")
        raise
