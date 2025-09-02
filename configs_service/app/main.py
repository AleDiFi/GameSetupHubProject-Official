from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router as config_router
from fastapi.middleware.cors import CORSMiddleware  

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity; adjust as needed
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

app.include_router(config_router, prefix="/configs")
