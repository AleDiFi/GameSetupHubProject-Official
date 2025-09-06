from fastapi import APIRouter, Depends, HTTPException
from app.models import CommentCreate, LikeCreate, ValutationCreate
from app.database import get_database
from app.auth import get_current_user
from datetime import datetime

router = APIRouter()
db = get_database()

# Collection per commenti, like e valutazioni
comments_collection = db["comments"]
likes_collection = db["likes"]
valutations_collection = db["valutations"]
ratings_collection = db["ratings"]

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
    """Aggiungi/rimuovi un like a una configurazione"""
    # Verifica se l'utente ha già messo like
    existing_like = likes_collection.find_one({
        "config_id": config_id,
        "user_id": user["user_id"]
    })
    
    if existing_like:
        # Rimuovi il like esistente
        likes_collection.delete_one({"_id": existing_like["_id"]})
        return {"message": "Like removed"}
    else:
        # Aggiungi nuovo like
        like_doc = {
            "config_id": config_id,
            "user_id": user["user_id"],
            "created_at": datetime.now()
        }
        result = likes_collection.insert_one(like_doc)
        return {"message": "Like added", "id": str(result.inserted_id)}

# Rotte per valutazioni (Solo POST)
@router.post("/config/{config_id}/rating")
def add_valutation(config_id: str, valutation: ValutationCreate, user=Depends(get_current_user)):
    """Aggiungi o aggiorna una valutazione per una configurazione"""
    # Validazione rating
    if not (1 <= valutation.rating <= 5):
        raise HTTPException(status_code=422, detail="Il rating deve essere compreso tra 1 e 5")
    
    # Verifica se l'utente ha già valutato questa configurazione
    existing_valutation = valutations_collection.find_one({
    "config_id": config_id,
    "user_id": user["user_id"]
    })

    if existing_valutation:
        # update legacy
        valutations_collection.update_one(
            {"_id": existing_valutation["_id"]},
            {"$set": {
                "rating": valutation.rating,
                "comment": valutation.comment,
                "updated_at": datetime.now()
            }}
        )
        # update canonical; if missing, insert
        upd_result = ratings_collection.update_one(
            {"config_id": config_id, "user_id": user["user_id"]},
            {"$set": {
                "rating": valutation.rating,
                "comment": valutation.comment,
                "updated_at": datetime.now()
            }}
        )
        if upd_result.matched_count == 0:
            ratings_collection.insert_one({
                "config_id": config_id,
                "user_id": user["user_id"],
                "rating": valutation.rating,
                "comment": valutation.comment,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            })
        return {"message": "Rating updated"}
    else:
        # insert legacy
        valutation_doc = {
            "config_id": config_id,
            "user_id": user["user_id"],
            "rating": valutation.rating,
            "comment": valutation.comment,
            "created_at": datetime.now()
        }
        result = valutations_collection.insert_one(valutation_doc)
        # insert canonical
        ratings_collection.insert_one({
            "config_id": config_id,
            "user_id": user["user_id"],
            "rating": valutation.rating,
            "comment": valutation.comment,
            "created_at": datetime.now()
        })
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
@router.delete("/rating/{rating_id}")
def delete_rating(rating_id: str, user=Depends(get_current_user)):
    """Elimina una valutazione (solo se sei l'autore)"""
    from bson import ObjectId
    
    # Trova la valutazione
    rating = valutations_collection.find_one({"_id": ObjectId(rating_id)})
    if not rating:
        raise HTTPException(status_code=404, detail="Valutazione non trovata")
    
    # Verifica che l'utente sia l'autore della valutazione
    if rating["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Non puoi eliminare valutazioni di altri utenti")
    
    # Elimina la valutazione
    valutations_collection.delete_one({"_id": ObjectId(rating_id)})
    # also remove any matching doc in canonical ratings_collection
    ratings_collection.delete_one({"config_id": rating.get("config_id"), "user_id": rating.get("user_id")})
    return {"message": "Rating deleted"}
