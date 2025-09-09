from fastapi import APIRouter, Depends, HTTPException
from app.models import CommentCreate, LikeCreate, ValutationCreate
from app.database import comments_collection, likes_collection, configs_collection, ratings_collection
from app.auth import get_current_user
from datetime import datetime

router = APIRouter()

# Rotte per commenti (Solo POST)
@router.post("/config/{config_id}/comment")
def add_comment(config_id: str, comment: CommentCreate, user=Depends(get_current_user)):
    """Aggiungi un commento a una configurazione"""
    comment_doc = {
        "config_id": config_id,
        "user_id": user["user_id"],
        "comment": comment.comment,
        "created_at": datetime.now()
    }
    result = comments_collection.insert_one(comment_doc)
    return {"message": "Comment added", "id": str(result.inserted_id)}

# Rotte per like (Solo POST)
@router.post("/config/{config_id}/like")
def add_like(config_id: str, like: LikeCreate, user=Depends(get_current_user)):
    """Aggiungi/rimuovi un like a una configurazione (collezione separata)"""
    config_id = str(config_id)
    existing_like = likes_collection.find_one({
        "config_id": config_id,
        "user_id": user["user_id"]
    })
    if existing_like:
        likes_collection.delete_one({"_id": existing_like["_id"]})
        return {"message": "Like removed"}
    else:
        like_doc = {
            "config_id": str(config_id),
            "user_id": user["user_id"],
            "created_at": datetime.now()
        }
        result = likes_collection.insert_one(like_doc)
        return {"message": "Like added", "id": str(result.inserted_id)}

# Rotte per valutazioni (Solo POST)
@router.post("/config/{config_id}/rating")
def add_valutation(config_id: str, valutation: ValutationCreate, user=Depends(get_current_user)):
    """Aggiungi o aggiorna una valutazione per una configurazione (collezione separata)"""
    if not (1 <= valutation.rating <= 5):
        raise HTTPException(status_code=422, detail="Il rating deve essere compreso tra 1 e 5")
    config_id = str(config_id)
    existing_valutation = ratings_collection.find_one({
        "config_id": config_id,
        "user_id": user["user_id"]
    })
    if existing_valutation:
        ratings_collection.update_one(
            {"_id": existing_valutation["_id"]},
            {"$set": {
                "rating": valutation.rating,
                "comment": valutation.comment,
                "updated_at": datetime.now()
            }}
        )
        return {"message": "Rating updated"}
    else:
        valutation_doc = {
            "config_id": str(config_id),
            "user_id": user["user_id"],
            "rating": valutation.rating,
            "comment": valutation.comment,
            "created_at": datetime.now()
        }
        result = ratings_collection.insert_one(valutation_doc)
        return {"message": "Rating added", "id": str(result.inserted_id)}

# Endpoint per eliminare un commento (DELETE operation)
@router.delete("/comment/{comment_id}")
def delete_comment(comment_id: str, user=Depends(get_current_user)):
    """Elimina un commento (solo se sei l'autore)"""
    from bson import ObjectId
    
    # Trova il commento
    comment = comments_collection.find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise HTTPException(status_code=404, detail="Commento non trovato")
    
    # Verifica che l'utente sia l'autore del commento
    if comment["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Non puoi eliminare commenti di altri utenti")
    
    # Elimina il commento
    comments_collection.delete_one({"_id": ObjectId(comment_id)})
    return {"message": "Comment deleted"}


# Endpoint per eliminare una valutazione (DELETE operation)
@router.delete("/config/{config_id}/rating")
def delete_rating(config_id: str, user=Depends(get_current_user)):
    """Elimina la valutazione dell'utente per una configurazione (solo se sei l'autore)"""
    config = configs_collection.find_one({"_id": config_id})
    if not config:
        raise HTTPException(status_code=404, detail="Configurazione non trovata")

    ratings = config.get("ratings", [])
    user_rating = next((r for r in ratings if r["user_id"] == user["user_id"]), None)
    if not user_rating:
        raise HTTPException(status_code=404, detail="Valutazione non trovata")

    # Rimuovi la valutazione dell'utente
    # Rimuovi la valutazione dell'utente
    ratings = [r for r in ratings if r["user_id"] != user["user_id"]]
    avg_rating = round(sum(r["rating"] for r in ratings) / len(ratings), 2) if ratings else 0
    configs_collection.update_one(
        {"_id": config_id},
        {"$set": {"ratings": ratings, "average_rating": avg_rating}}
    )
    return {"message": "Rating deleted", "average_rating": avg_rating}
