import os
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str):
    return pwd_context.verify(plain, hashed)

# JWT
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersegreto123")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = None):
    """Verifica il token JWT e restituisce l'utente corrente.

    This helper mirrors the previous implementation that lived in routes.py.
    It accepts a token string (dependency injection will pass the OAuth2 scheme in routes).
    """
    from fastapi import HTTPException
    from jose import JWTError
    from .database import users_collection
    from bson import ObjectId

    try:
        if token is None:
            raise HTTPException(status_code=401, detail="Token non fornito")

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        email: str = payload.get("email")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Token non valido")

        # Verify user still exists
        try:
            user = users_collection.find_one({"_id": ObjectId(user_id)})
        except Exception:
            user = users_collection.find_one({"_id": user_id})

        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")

        return {
            "user_id": user_id,
            "email": email,
            "username": user.get("username") or user.get("email") or ""
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Token non valido")
