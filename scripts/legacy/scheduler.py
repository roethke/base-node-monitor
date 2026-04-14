"""
Background scheduler for periodic network crawling.
Can be run as a separate process alongside the API server.
"""

import time
import schedule
from datetime import datetime
from database import NodeDatabase
from crawler import NodeCrawler


def run_scheduled_crawl():
    """Run a full network crawl."""
    print(f"[{datetime.now().isoformat()}] Starting scheduled crawl...")

    db = NodeDatabase()
    crawler = NodeCrawler(db)

    try:
        result = crawler.crawl_all_networks()
        print(f"[{datetime.now().isoformat()}] Crawl completed:")
        for network, stats in result.get("networks", {}).items():
            print(f"  {network}: {stats.get('nodes_online', 0)} online / {stats.get('endpoints_queried', 0)} total")
    except Exception as e:
        print(f"[{datetime.now().isoformat()}] Error during crawl: {e}")


def start_scheduler(interval_hours: int = 6):
    """
    Start the background scheduler.

    Args:
        interval_hours: Hours between each crawl (default: 6)
    """
    print(f"Starting scheduler with {interval_hours}-hour interval...")
    print(f"First crawl will run immediately.")

    # Run immediately on startup
    run_scheduled_crawl()

    # Schedule periodic runs
    schedule.every(interval_hours).hours.do(run_scheduled_crawl)

    print(f"Scheduler running. Press Ctrl+C to stop.")

    # Keep running
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute


if __name__ == "__main__":
    import sys

    interval = 6  # Default 6 hours

    if len(sys.argv) > 1:
        try:
            interval = int(sys.argv[1])
        except ValueError:
            print(f"Invalid interval: {sys.argv[1]}. Using default 6 hours.")

    start_scheduler(interval_hours=interval)
