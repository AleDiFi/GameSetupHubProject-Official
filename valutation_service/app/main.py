from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router

app = FastAPI(
    title="Valutations Service",
    description="Microservizio per la scrittura di valutazioni, commenti e likes (solo POST)",
    version="1.0.0"
)

# Configurazione CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In produzione, specificare i domini autorizzati
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include tutte le API definite in routes.py
app.include_router(router, prefix="/valutations", tags=["valutations"])

@app.get("/")
def read_root():
    return {"message": "Valutations Service attivo - Solo operazioni di scrittura"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
