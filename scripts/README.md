# NIKO SUN — Contract Init

The deployed contract on testnet (`CDVT6PV...6GY4`) needs to be initialized before purchases work.

## How to initialize

1. Open `scripts/init-contract.html` in your browser (or serve the `scripts/` directory)
2. Connect Freighter with the **deployer account** selected
3. Click **Check if initialized**
4. If not initialized: click **Run initialize** → approve the Freighter popup
5. Click **Run create_project** → approve the second Freighter popup
6. Click **Verify** — you should see "Fully initialized!"
7. Done — purchases now work from the frontend

## What it does

- `initialize()` — sets up the contract storage (NEXT_ID, TOTAL_SALES)
- `create_project()` — creates Project #1 "Solar Lima Miraflores" (100K tokens @ 10 XLM each)

Only needs to be run **once** per contract deployment.
