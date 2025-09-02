from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router as user_router

app = FastAPI(
    title="Users Service",
    description="Servizio per la gestione degli utenti",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity; adjust as needed
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
) 

app.include_router(user_router, prefix="/users")

@app.get("/")
def read_root():
    return {"message": "Users Service attivo"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "users"}
