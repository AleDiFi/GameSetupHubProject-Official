from fastapi import Depends, HTTPException, Header
from .utils import verify_user_token
from typing import Optional

def get_current_user(authorization: Optional[str] = Header(None)):
    """Ottiene l'utente corrente dal token di autorizzazione"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Token di autorizzazione richiesto")
    
    try:
        # Estrae il token dal header "Bearer <token>"
        token = authorization.split(" ")[1] if " " in authorization else authorization
        return verify_user_token(token)
    except IndexError:
        raise HTTPException(status_code=401, detail="Formato token non valido")

def get_optional_user(authorization: Optional[str] = Header(None)):
    """Ottiene l'utente corrente se il token è fornito, altrimenti None"""
    if not authorization:
        return None
    
    try:
        token = authorization.split(" ")[1] if " " in authorization else authorization
        return verify_user_token(token)
    except:
        return None
