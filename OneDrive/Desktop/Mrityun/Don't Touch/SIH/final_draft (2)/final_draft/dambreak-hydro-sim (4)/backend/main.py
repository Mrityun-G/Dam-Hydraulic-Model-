"""
DAMBREAK HYDRO-SIM: FastAPI Main Application Entry Point
High-Performance Python Backend for Dam Break Flood Inundation Modelling and Decision Support.
"""

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

# Load local environment files (.env.local / .env)
for _fname in [".env.local", ".env"]:
    _candidate = Path(__file__).resolve().parent.parent / _fname
    if _candidate.exists():
        try:
            for _line in _candidate.read_text(encoding="utf-8").splitlines():
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    _k = _k.strip()
                    _v = _v.strip().strip('"').strip("'")
                    if _k and _k not in os.environ:
                        os.environ[_k] = _v
        except Exception:
            pass

from .api.dams import router as dams_router
from .api.simulation import router as simulation_router
from .api.analysis import router as analysis_router
from .api.gee import router as gee_router
from .api.export import router as export_router

app = FastAPI(
    title="DAMBREAK HYDRO-SIM India Backend API",
    description="Generalized Hydrodynamic Dam Break / River Blockage Decision Support System (SPH & Delft3D)",
    version="2.4.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for React frontend connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all modular API routers
app.include_router(dams_router)
app.include_router(simulation_router)
app.include_router(analysis_router)
app.include_router(gee_router)
app.include_router(export_router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "DAMBREAK HYDRO-SIM FastAPI Server",
        "version": "2.4.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "availableSolvers": [
            "2D_SWE_FiniteVolume",
            "3D_SPH_DualSPHysics",
            "Delft3D_FM_2D",
            "SPH_vs_Delft3D_Comparison",
            "ML_Surrogate_FloodUNet",
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
