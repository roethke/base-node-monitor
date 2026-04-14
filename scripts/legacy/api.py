"""
FastAPI server for Base Node Monitor.
Provides REST API endpoints for node monitoring data.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
import uvicorn

from database import NodeDatabase
from crawler import NodeCrawler, NETWORKS


# Initialize FastAPI app
app = FastAPI(
    title="Base Node Monitor API",
    description="API for monitoring Base network node client versions and distribution",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and crawler
db = NodeDatabase()
crawler = NodeCrawler(db)

# Track crawl status
crawl_status = {
    "is_crawling": False,
    "last_crawl": None,
    "last_crawl_result": None
}


# Pydantic models for API responses
class Node(BaseModel):
    id: int
    url: str
    network: str
    client_version: Optional[str]
    block_number: Optional[int]
    syncing: Optional[bool]
    peers_count: Optional[int]
    online: bool
    last_seen: str


class NetworkStats(BaseModel):
    network: str
    total_endpoints: int
    online_nodes: int
    offline_nodes: int
    clients: Dict[str, int]
    versions: Dict[str, int]
    last_updated: Optional[str]


class ClientDistribution(BaseModel):
    client: str
    count: int
    percentage: float


class VersionDistribution(BaseModel):
    version: str
    count: int
    percentage: float


class CrawlResult(BaseModel):
    network: str
    name: str
    endpoints_queried: int
    nodes_online: int
    nodes_offline: int
    timestamp: str


class NetworkInfo(BaseModel):
    id: str
    name: str
    endpoint_count: int


# API Endpoints

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Base Node Monitor API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "networks": "/api/networks",
            "nodes": "/api/networks/{network}/nodes",
            "stats": "/api/networks/{network}/stats",
            "distribution": "/api/networks/{network}/distribution",
            "crawl": "/api/crawl",
            "health": "/api/health"
        }
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "connected",
        "is_crawling": crawl_status["is_crawling"],
        "last_crawl": crawl_status["last_crawl"]
    }


@app.get("/api/networks", response_model=List[NetworkInfo])
async def get_networks():
    """Get list of all monitored networks."""
    networks_info = []
    for network_id, config in NETWORKS.items():
        networks_info.append({
            "id": network_id,
            "name": config["name"],
            "endpoint_count": len(config["rpc_endpoints"])
        })
    return networks_info


@app.get("/api/networks/{network}/nodes")
async def get_network_nodes(network: str, online_only: bool = False):
    """Get all nodes for a specific network."""
    if network not in NETWORKS:
        raise HTTPException(status_code=404, detail=f"Network {network} not found")

    nodes = db.get_nodes(network=network, online_only=online_only)
    return {
        "network": network,
        "node_count": len(nodes),
        "nodes": nodes
    }


@app.get("/api/networks/{network}/stats", response_model=NetworkStats)
async def get_network_stats(network: str):
    """Get statistics for a specific network."""
    if network not in NETWORKS:
        raise HTTPException(status_code=404, detail=f"Network {network} not found")

    stats = db.get_network_stats(network)
    return stats


@app.get("/api/networks/{network}/distribution/clients", response_model=List[ClientDistribution])
async def get_client_distribution(network: str):
    """Get client distribution for a specific network."""
    if network not in NETWORKS:
        raise HTTPException(status_code=404, detail=f"Network {network} not found")

    distribution = db.get_client_distribution(network)
    return distribution


@app.get("/api/networks/{network}/distribution/versions", response_model=List[VersionDistribution])
async def get_version_distribution(network: str):
    """Get version distribution for a specific network."""
    if network not in NETWORKS:
        raise HTTPException(status_code=404, detail=f"Network {network} not found")

    distribution = db.get_version_distribution(network)
    return distribution


@app.get("/api/networks/{network}/distribution")
async def get_all_distributions(network: str):
    """Get both client and version distributions for a network."""
    if network not in NETWORKS:
        raise HTTPException(status_code=404, detail=f"Network {network} not found")

    return {
        "network": network,
        "clients": db.get_client_distribution(network),
        "versions": db.get_version_distribution(network)
    }


async def run_crawl(network: Optional[str] = None):
    """Background task to run crawler."""
    global crawl_status

    crawl_status["is_crawling"] = True
    try:
        if network:
            result = crawler.crawl_network(network)
        else:
            result = crawler.crawl_all_networks()

        crawl_status["last_crawl"] = datetime.now().isoformat()
        crawl_status["last_crawl_result"] = result
    finally:
        crawl_status["is_crawling"] = False


@app.post("/api/crawl")
async def trigger_crawl(
    background_tasks: BackgroundTasks,
    network: Optional[str] = None
):
    """Trigger a manual crawl of networks."""
    if crawl_status["is_crawling"]:
        raise HTTPException(status_code=409, detail="Crawl already in progress")

    if network and network not in NETWORKS:
        raise HTTPException(status_code=404, detail=f"Network {network} not found")

    background_tasks.add_task(run_crawl, network)

    return {
        "status": "started",
        "message": f"Crawl initiated for {network if network else 'all networks'}",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/crawl/status")
async def get_crawl_status():
    """Get current crawl status."""
    return {
        "is_crawling": crawl_status["is_crawling"],
        "last_crawl": crawl_status["last_crawl"],
        "last_crawl_result": crawl_status["last_crawl_result"]
    }


# Error handlers

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": "Resource not found", "detail": str(exc)}
    )


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )


if __name__ == "__main__":
    print("Starting Base Node Monitor API...")
    print("API Documentation: http://localhost:8000/docs")
    print("Health Check: http://localhost:8000/api/health")
    uvicorn.run(app, host="0.0.0.0", port=8000)
