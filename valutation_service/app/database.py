from pymongo import MongoClient
import os

def get_database():
    # Legge prima la variabile MONGO_URI (usata in docker-compose), altrimenti MONGO_URL,
    # altrimenti usa l'indirizzo standard Docker 'mongo'.
    MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGO_URL") or "mongodb://mongo:27017"

    # Connessione al database
    client = MongoClient(MONGO_URI)

    # Ritorna il database chiamato "gamesetuphub"
    return client["gamesetuphub"]
