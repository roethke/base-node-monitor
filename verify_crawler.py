#!/usr/bin/env python3
"""
Verify crawler accuracy by manually querying nodes and comparing with database.
"""

import requests
import sqlite3
import sys

def query_node_manually(url):
    """Manually query a node to verify crawler data"""
    try:
        # Get client version
        response = requests.post(
            url,
            json={"jsonrpc": "2.0", "method": "web3_clientVersion", "params": [], "id": 1},
            timeout=10
        )
        client = response.json().get("result") if response.status_code == 200 else None

        # Get block number
        response = requests.post(
            url,
            json={"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1},
            timeout=10
        )
        block_hex = response.json().get("result") if response.status_code == 200 else None
        block = int(block_hex, 16) if block_hex else None

        return {"client": client, "block": block}
    except Exception as e:
        return {"error": str(e)}

def verify():
    """Verify crawler data against manual queries"""
    print("=" * 60)
    print("VERIFYING CRAWLER DATA")
    print("=" * 60)
    print()

    # Get some nodes from database
    conn = sqlite3.connect("base_nodes.db")
    c = conn.cursor()
    c.execute("SELECT url, network, client_version, block_number FROM nodes WHERE online = 1 LIMIT 5")
    db_nodes = c.fetchall()
    conn.close()

    if not db_nodes:
        print("ERROR: No nodes in database. Run the crawler first.")
        sys.exit(1)

    print(f"Verifying {len(db_nodes)} nodes from database...\n")

    matches = 0
    mismatches = 0

    for url, network, db_client, db_block in db_nodes:
        print(f"Checking {url} ({network})...")

        manual = query_node_manually(url)

        if "error" in manual:
            print(f"  WARNING: Could not query: {manual['error']}")
            continue

        # Compare client version
        client_match = manual["client"] == db_client
        print(f"  Client: {manual['client']}")
        print(f"  DB:     {db_client}")
        print(f"  {'MATCH' if client_match else 'MISMATCH'}")

        # Compare block (allow small difference since blocks advance)
        if manual["block"] and db_block:
            block_diff = abs(manual["block"] - db_block)
            block_match = block_diff < 1000  # Allow up to 1000 blocks difference
            print(f"  Block:  {manual['block']}")
            print(f"  DB:     {db_block}")
            print(f"  Diff:   {block_diff} blocks")
            print(f"  {'MATCH' if block_match else 'MISMATCH'}")

            if client_match and block_match:
                matches += 1
            else:
                mismatches += 1
        else:
            if client_match:
                matches += 1
            else:
                mismatches += 1

        print()

    print("=" * 60)
    print("VERIFICATION RESULTS")
    print("=" * 60)
    print(f"Matches: {matches}")
    print(f"Mismatches: {mismatches}")

    if mismatches == 0:
        print("\nSUCCESS: Crawler data is accurate.")
    else:
        print(f"\nWARNING: Found {mismatches} mismatch(es). Data may be stale or nodes changed.")

if __name__ == "__main__":
    verify()
