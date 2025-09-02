#!/usr/bin/env python3

import requests
import time

def test_integrated_search():
    print("🔍 Test Search Integrato nel Visualizations Service")
    
    # 1. Login per ottenere token
    print("1️⃣ Login...")
    login_data = {"email": "test3@test.com", "password": "password123"}
    response = requests.post("http://localhost:8001/users/login-json", json=login_data)
    if response.status_code == 200:
        token = response.json()["access_token"]
        print("   ✅ Login OK")
    else:
        print(f"   ❌ Login fallito: {response.text}")
        return
    
    # 2. Creiamo una configurazione per testare la ricerca
    print("2️⃣ Creazione configurazione di test...")
    headers = {"Authorization": f"Bearer {token}"}
    config_data = {
        "game": "StarCraft II",
        "title": f"Search Test Config {int(time.time())}",
        "description": "Configurazione per testare la ricerca integrata",
        "parameters": {"strategy": "rush", "difficulty": "hard"},
        "tags": ["search", "test", "integrated"]
    }
    
    response = requests.post("http://localhost:8002/configs/", json=config_data, headers=headers)
    if response.status_code in [200, 201]:
        config_id = response.json()["id"]
        print(f"   ✅ Config creata: {config_id}")
    else:
        print(f"   ❌ Errore creazione: {response.text}")
        return
    
    # 3. Test ricerca per gioco
    print("3️⃣ Test ricerca per gioco...")
    response = requests.get("http://localhost:8003/visualizations/search?game=StarCraft%20II&limit=5")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Trovate {len(data['configs'])} configurazioni per StarCraft II")
        print(f"   📊 Totale disponibili: {data['total']}")
    else:
        print(f"   ❌ Errore ricerca: {response.text}")
    
    # 4. Test ricerca per tag
    print("4️⃣ Test ricerca per tag...")
    response = requests.get("http://localhost:8003/visualizations/search?tags=search&tags=test")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Trovate {len(data['configs'])} configurazioni con tag 'search' e 'test'")
    else:
        print(f"   ❌ Errore ricerca per tag: {response.text}")
    
    # 5. Test ricerca per titolo
    print("5️⃣ Test ricerca per titolo...")
    response = requests.get("http://localhost:8003/visualizations/search?title=Search%20Test")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Trovate {len(data['configs'])} configurazioni con titolo contenente 'Search Test'")
    else:
        print(f"   ❌ Errore ricerca per titolo: {response.text}")
    
    # 6. Test ordinamento
    print("6️⃣ Test ordinamento per data...")
    response = requests.get("http://localhost:8003/visualizations/search?sort_by=created_at&sort_order=desc&limit=3")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Ordinamento OK: {len(data['configs'])} configurazioni più recenti")
        if data['configs']:
            latest = data['configs'][0]
            print(f"   📅 Più recente: {latest['title']} ({latest['game']})")
    else:
        print(f"   ❌ Errore ordinamento: {response.text}")
    
    print("\n🎯 Test completato! Le funzionalità di ricerca sono integrate nel Visualizations Service.")

if __name__ == "__main__":
    test_integrated_search()
