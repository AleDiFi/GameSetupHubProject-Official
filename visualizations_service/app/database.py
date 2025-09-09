from pymongo import MongoClient
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client.gamesetuphub

comments_collection = db.comments
ratings_collection = db.ratings
likes_collection = db.likes
