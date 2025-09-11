from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
import os
from typing import Optional

# Configurazione JWT
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersegreto123")  # Stessa chiave del Users Service
ALGORITHM = "HS256"

# Bearer token scheme
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verifica il token JWT e restituisce le informazioni dell'utente corrente.
    """
    token = credentials.credentials
    
    try:
        # Decodifica il JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        email: str = payload.get("email")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token non valido",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return {
            "user_id": user_id,
            "email": email
        }
    
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token non valido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    

# Funzione per ottenere l'utente corrente in modo opzionale (per operazioni di lettura)
# Valutare se usarla o meno e se toglierla dal codice
def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    """
    Verifica il token JWT opzionale. Restituisce None se non presente o non valido.
    """
    if not credentials:
        return None
    
    try:
        return get_current_user(credentials)
    except HTTPException:
        return None
