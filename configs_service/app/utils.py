from bson import ObjectId
from datetime import datetime
from fastapi import Request
from pymongo import ReturnDocument
from .database import configs_collection


def get_config_by_id(config_id: str, increment: bool = True, request: Request = None):
    """Retrieve a configuration by id, handling both ObjectId and string ids.

    If `increment` is True, atomically increments the views counter.
    Returns the normalized config dict (with `_id` as string and `views` as int) or None.
    """
    try:
        obj_id = ObjectId(config_id)
        if increment:
            config = configs_collection.find_one_and_update(
                {"_id": obj_id},
                {"$inc": {"views": 1}},
                return_document=ReturnDocument.AFTER
            )
        else:
            config = configs_collection.find_one({"_id": obj_id})
    except Exception:
        if increment:
            config = configs_collection.find_one_and_update(
                {"_id": config_id},
                {"$inc": {"views": 1}},
                return_document=ReturnDocument.AFTER
            )
        else:
            config = configs_collection.find_one({"_id": config_id})

    # Diagnostic logging (kept here for now)
    try:
        client_addr = request.client.host if request and request.client else 'unknown'
    except Exception:
        client_addr = 'unknown'
    print(f"[DEBUG configs-service] get_config_by_id {config_id} increment={increment} client={client_addr}")

    if not config:
        return None

    config["_id"] = str(config["_id"])
    config["views"] = int(config.get("views", 0))
    return config
