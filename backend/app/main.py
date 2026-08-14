from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.db.database import init_db
from backend.app.api import investigations, claims, dashboard

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} Backend Foundation (Env: {settings.APP_ENV})...")
    init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down ClaimForge Backend.")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="ClaimForge — Autonomous Pre-Dispute Financial Claim Discovery Backend Foundation",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(dashboard.router)
app.include_router(investigations.router)
app.include_router(claims.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
