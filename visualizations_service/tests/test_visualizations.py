import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Visualizations Service attivo"}

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_get_game_configurations():
    # Test con un gioco che potrebbe non esistere
    response = client.get("/visualizations/game/test-game")
    assert response.status_code == 200
    data = response.json()
    assert "game" in data
    assert "total_configurations" in data
    assert "configurations" in data
    assert data["game"] == "test-game"

def test_get_configuration_details_not_found():
    # Test con un ID configurazione che non esiste
    response = client.get("/visualizations/config/507f1f77bcf86cd799439011")
    # Potrebbe restituire 404 o 503 a seconda della disponibilità del servizio configs
    assert response.status_code in [404, 503]

# Test per verificare che gli endpoint richiedano autenticazione quando necessario
def test_add_rating_requires_auth():
    response = client.post("/visualizations/rating", json={
        "config_id": "507f1f77bcf86cd799439011",
        "rating": 5
    })
    assert response.status_code == 401

def test_add_comment_requires_auth():
    response = client.post("/visualizations/comment", json={
        "config_id": "507f1f77bcf86cd799439011",
        "comment": "Test comment"
    })
    assert response.status_code == 401
