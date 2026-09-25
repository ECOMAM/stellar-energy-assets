#!/bin/bash
# deploy.sh — Despliega el contrato de NIKO SUN en Stellar TESTNET.
#
# Uso:
#   ./scripts/deploy.sh [testnet]
#
# Variables opcionales:
#   DEPLOYER_ALIAS  alias del Stellar CLI que firma el deploy y queda como admin
#                   (por defecto: niko-admin; se genera y fondea con friendbot si no existe)
#   ADMIN_ADDRESS   direccion G... del admin, si debe ser distinta del deployer
#
# Este proyecto solo opera en testnet (bases de Stellar Odyssey, regla 8.5):
# el script rechaza cualquier otra red.

set -euo pipefail

NETWORK=${1:-testnet}
CONTRACT_NAME="niko_project"
WASM_PATH="target/wasm32v1-none/release/${CONTRACT_NAME}.wasm"
DEPLOYER=${DEPLOYER_ALIAS:-niko-admin}

echo "🌞 NIKO SUN — Despliegue del contrato"
echo "====================================="
echo "Red: $NETWORK"
echo ""

if [ "$NETWORK" != "testnet" ]; then
    echo "❌ Solo se permite testnet. Este proyecto no opera en mainnet."
    exit 1
fi

if ! command -v stellar &> /dev/null; then
    echo "❌ No se encontró el Stellar CLI. Instálalo con:"
    echo "   cargo install --locked stellar-cli"
    exit 1
fi

# Compilar siempre: nunca desplegar un wasm viejo
echo "📦 Compilando el contrato..."
stellar contract build

if [ ! -f "$WASM_PATH" ]; then
    echo "❌ No se encontró el WASM en $WASM_PATH"
    exit 1
fi

# Hash del WASM: permite verificar que lo desplegado sale de este commit (SEP-0055)
if command -v sha256sum &> /dev/null; then
    WASM_SHA256=$(sha256sum "$WASM_PATH" | cut -d' ' -f1)
else
    WASM_SHA256=$(shasum -a 256 "$WASM_PATH" | cut -d' ' -f1)
fi
echo "🔎 SHA-256 del WASM: $WASM_SHA256"
echo "   Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'desconocido')"

# Identidad del deployer: vive en el keystore del CLI, la clave nunca se imprime
if ! stellar keys address "$DEPLOYER" &> /dev/null; then
    echo "🔑 Generando y fondeando el alias $DEPLOYER en testnet..."
    stellar keys generate "$DEPLOYER" --network "$NETWORK" --fund
fi

DEPLOYER_ADDR=$(stellar keys address "$DEPLOYER")
ADMIN_ADDR=${ADMIN_ADDRESS:-$DEPLOYER_ADDR}
echo "📋 Deployer: $DEPLOYER_ADDR"
echo "📋 Admin:    $ADMIN_ADDR"

# El constructor (CAP-0058) recibe el admin y el token de pago: el SAC de XLM nativo
NATIVE_TOKEN=$(stellar contract id asset --asset native --network "$NETWORK")
echo "📋 Token de pago (SAC XLM): $NATIVE_TOKEN"

echo ""
echo "🚀 Desplegando $CONTRACT_NAME..."
CONTRACT_ID=$(stellar contract deploy \
    --wasm "$WASM_PATH" \
    --source-account "$DEPLOYER" \
    --network "$NETWORK" \
    --alias niko_sun \
    -- \
    --admin "$ADMIN_ADDR" \
    --token "$NATIVE_TOKEN")

echo ""
echo "✅ Contrato desplegado e inicializado por el constructor"
echo "   Contract ID: $CONTRACT_ID"
echo "   Explorer:    https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
echo ""
echo "💡 Configura el frontend (frontend/.env.local):"
echo "   NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "💡 Siguiente paso: ciclo completo on-chain"
echo "   CONTRACT_ID=$CONTRACT_ID ./scripts/demo-cycle.sh"
