from pymongo import MongoClient
import os

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client.gamesetuphub

# Collections
configurations_collection = db.configs
ratings_collection = db.ratings
comments_collection = db.comments
users_collection = db.users
