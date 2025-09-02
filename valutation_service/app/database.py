from pymongo import MongoClient
import os

def get_database():
    # Legge la variabile MONGO_URL se esiste, altrimenti usa l'indirizzo standard Docker
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo-db:27017")

    # Connessione al database
    client = MongoClient(MONGO_URL)

    # Ritorna il database chiamato "gamesetuphub"
    return client["gamesetuphub"]
