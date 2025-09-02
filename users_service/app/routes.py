from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from .models import UserRegister, UserLogin
from .auth import hash_password, verify_password, create_access_token
from .database import users_collection
from jose import jwt, JWTError
from bson import ObjectId

router = APIRouter()

# OAuth2 scheme per l'autenticazione
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    """Verifica il token JWT e restituisce l'utente corrente"""
    try:
        # Usa la stessa SECRET_KEY dell'auth.py
        SECRET_KEY = "supersegreto123"
        ALGORITHM = "HS256"
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        email: str = payload.get("email")
        
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token non valido")
            
        # Verifica che l'utente esista ancora nel database
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
            
        return {
            "user_id": user_id,
            "email": email,
            "username": user["username"]
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Token non valido")

@router.post("/register")
def register(user: UserRegister):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email già registrata")

    hashed_pw = hash_password(user.password)

    user_doc = {
        "username": user.username,
        "email": user.email,
        "hashed_password": hashed_pw,
    }

    users_collection.insert_one(user_doc)
    return {"msg": "Registrazione avvenuta con successo"}

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_collection.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")

    token = create_access_token({"user_id": str(user["_id"]), "email": user["email"]})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login-json")
def login_json(user_data: UserLogin):
    """Endpoint di login che accetta JSON invece di form data"""
    user = users_collection.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")

    token = create_access_token({"user_id": str(user["_id"]), "email": user["email"]})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
def get_me(current_user = Depends(get_current_user)):
    """Endpoint per ottenere le informazioni dell'utente corrente"""
    return current_user

@router.get("/{user_id}")
def get_user_by_id(user_id: str):
    """Endpoint per ottenere informazioni utente tramite ID"""
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="Utente non trovato")
        
        return {
            "user_id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"]
        }
    except Exception:
        raise HTTPException(status_code=404, detail="Utente non trovato")
