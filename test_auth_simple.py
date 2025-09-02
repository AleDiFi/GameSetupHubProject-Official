#!/usr/bin/env python3

import requests
import json

def test_auth():
    print("🔑 Test Autenticazione Semplice")
    
    # 1. Registrazione utente
    user_data = {
        "username": "testuser",
        "email": "test@test.com",
        "password": "password123"
    }
    
    print("1️⃣ Registrazione...")
    response = requests.post("http://localhost:8001/users/register", json=user_data)
    if response.status_code in [200, 400]:  # 400 se utente già esiste
        print("   ✅ Registrazione OK")
    else:
        print(f"   ❌ Errore registrazione: {response.text}")
        return
    
    # 2. Login
    print("2️⃣ Login...")
    login_data = {
        "email": "test@test.com",
        "password": "password123"
    }
    response = requests.post("http://localhost:8001/users/login-json", json=login_data)
    if response.status_code == 200:
        data = response.json()
        token = data["access_token"]
        print("   ✅ Login OK")
        print(f"   Token: {token[:50]}...")
    else:
        print(f"   ❌ Errore login: {response.text}")
        return
    
    # 3. Test autenticazione Valutations Service
    print("3️⃣ Test autenticazione Valutations...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Facciamo una richiesta al endpoint che richiede autenticazione
    config_id = "507f1f77bcf86cd799439011"  # ID fittizio per test
    rating_data = {
        "rating": 5,
        "comment": "Test comment"
    }
    
    response = requests.post(
        f"http://localhost:8004/configurations/{config_id}/ratings",
        json=rating_data,
        headers=headers
    )
    
    print(f"   Risposta: {response.status_code}")
    print(f"   Corpo: {response.text}")
    
    if response.status_code in [200, 201]:
        print("   ✅ Autenticazione Valutations funziona!")
    elif response.status_code == 401:
        print("   ❌ Problema autenticazione")
    else:
        print("   ⚠️ Altro errore (normale se config non esiste)")

if __name__ == "__main__":
    test_auth()
