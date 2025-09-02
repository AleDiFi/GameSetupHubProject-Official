from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router

app = FastAPI(
    title="Visualizations Service",
    description="Servizio per la visualizzazione e lettura delle configurazioni di gioco con valutazioni e commenti (solo GET)",
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

app.include_router(router, prefix="/visualizations", tags=["visualizations"])

@app.get("/")
def read_root():
    return {"message": "Visualizations Service attivo - Solo operazioni di lettura"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
