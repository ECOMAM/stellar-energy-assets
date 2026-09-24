#!/bin/bash
# demo-cycle.sh — Corre el ciclo completo de NIKO SUN contra Stellar TESTNET y
# deja registro de cada transaccion (hash y enlace al explorador).
#
# Uso:
#   CONTRACT_ID=C... ./scripts/demo-cycle.sh
#   LOG_FILE=docs/ciclo.md       archivo del registro (por defecto demo-cycle-<fecha>.md)
#   RESUME_PROJECT_ID=1          reanuda desde el deposito de ingresos si un corte de red
#                                interrumpio el ciclo (sin repetir aprobaciones ni compras)
#
# Requiere el Stellar CLI y cuatro alias de testnet en su keystore. Si no
# existen, se generan y se fondean con friendbot.
#   ADMIN_ALIAS        (por defecto niko-admin)        aprueba emisores y participantes, y pausa
#   ISSUER_ALIAS       (por defecto niko-issuer)       crea el proyecto, registra energia e ingresos, retira ventas
#   PARTICIPANT_ALIAS  (por defecto niko-participant)  adquiere 30 participaciones
#   PARTICIPANT2_ALIAS (por defecto niko-participant2) adquiere 10 participaciones
#
# Solo testnet, con XLM de prueba: no hay fondos reales (bases, regla 8.5).

set -euo pipefail

NETWORK="testnet"
CONTRACT_ID="${CONTRACT_ID:?Define CONTRACT_ID con el id del contrato desplegado}"
ADMIN="${ADMIN_ALIAS:-niko-admin}"
ISSUER="${ISSUER_ALIAS:-niko-issuer}"
P1="${PARTICIPANT_ALIAS:-niko-participant}"
P2="${PARTICIPANT2_ALIAS:-niko-participant2}"
EXPLORER="https://stellar.expert/explorer/testnet"
LOG="${LOG_FILE:-demo-cycle-$(date -u +%Y%m%dT%H%M%SZ).md}"

STROOPS_PER_XLM=10000000   # XLM tiene 7 decimales
PRICE=$((10 * STROOPS_PER_XLM))        # 10 XLM por participacion
REVENUE=$((40 * STROOPS_PER_XLM))      # 40 XLM de ingresos registrados
WITHDRAW=$((200 * STROOPS_PER_XLM))    # el emisor retira 200 XLM de ventas

ensure_alias() {
    if ! stellar keys address "$1" &> /dev/null; then
        echo "🔑 Generando y fondeando $1 en testnet..." >&2
        stellar keys generate "$1" --network "$NETWORK" --fund
    fi
    stellar keys address "$1"
}

RPC_URL="https://soroban-testnet.stellar.org"

# Errores de red de la RPC. Antes de reintentar se verifica por hash que la
# transaccion firmada NO haya entrado al ledger, asi nunca se duplica una operacion.
TRANSIENT='error \((Connect|SendRequest)\)|dns error|connection (refused|reset|closed)|tls handshake|timed out'

# tx_status <hash>: SUCCESS | FAILED | NOT_FOUND (segun getTransaction de la RPC)
tx_status() {
    curl -s -m 20 -X POST "$RPC_URL" -H 'Content-Type: application/json' \
        -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getTransaction\",\"params\":{\"hash\":\"$1\"}}" \
        | grep -oE '"status":"[A-Z_]+"' | head -1 | cut -d'"' -f4
}

# invoke <alias> <etiqueta> <funcion> [--arg valor ...]
# Envia la transaccion, registra el hash en el log y devuelve el valor de retorno.
invoke() {
    local src="$1" label="$2"; shift 2
    local err out hash attempt st i landed
    err="$(mktemp)"
    for attempt in 1 2 3 4; do
        if out="$(stellar contract invoke --id "$CONTRACT_ID" --source-account "$src" \
                --network "$NETWORK" --send=yes -- "$@" 2>"$err")"; then
            break
        fi
        if [ "$attempt" -lt 4 ] && grep -q -i -E "$TRANSIENT" "$err"; then
            hash="$(grep -oE '[0-9a-f]{64}' "$err" | head -1 || true)"
            landed=""
            if [ -n "$hash" ]; then
                # La tx llego a firmarse: esperar a saber si entro al ledger
                for i in 1 2 3 4 5 6 7 8; do
                    st="$(tx_status "$hash" || true)"
                    if [ "$st" = "SUCCESS" ]; then landed="yes"; break; fi
                    if [ "$st" = "FAILED" ]; then break; fi
                    sleep 5
                done
            fi
            if [ "$landed" = "yes" ]; then
                echo "✔ $label: la tx ${hash:0:12}… sí entró al ledger pese al error de red" >&2
                out=""
                break
            fi
            echo "↻ $label: error de red con la RPC (la tx no entró), reintento $attempt/3..." >&2
            sleep $((attempt * 5))
            continue
        fi
        echo "❌ $label" >&2
        cat "$err" >&2
        rm -f "$err"
        exit 1
    done
    hash="$(grep -oE '[0-9a-f]{64}' "$err" | head -1 || true)"
    rm -f "$err"
    printf '| %s | `%s` | [%s](%s/tx/%s) |\n' "$label" "${out:-()}" "${hash:0:12}" "$EXPLORER" "$hash" >> "$LOG"
    echo "✅ $label → ${out:-()}  tx ${hash:0:12}…" >&2
    printf '%s' "$out"
}

# view <funcion> [--arg valor ...]: simulacion de solo lectura, sin firmar ni enviar
view() {
    local attempt
    for attempt in 1 2 3 4; do
        if stellar contract invoke --id "$CONTRACT_ID" --source-account "$ADMIN" \
                --network "$NETWORK" --send=no -- "$@" 2>/dev/null; then
            return 0
        fi
        sleep $((attempt * 3))
    done
    return 1
}

echo "🌞 NIKO SUN — Ciclo completo en testnet"
echo "Contrato: $EXPLORER/contract/$CONTRACT_ID"

ADMIN_ADDR=$(ensure_alias "$ADMIN")
ISSUER_ADDR=$(ensure_alias "$ISSUER")
P1_ADDR=$(ensure_alias "$P1")
P2_ADDR=$(ensure_alias "$P2")

if [ -n "${RESUME_PROJECT_ID:-}" ]; then
    # Reanudar tras un corte de red: el proyecto ya tiene compras y energia,
    # se continua desde el deposito de ingresos y se agrega al mismo registro.
    PID="$RESUME_PROJECT_ID"
    echo "↪ Reanudando el proyecto $PID desde el depósito de ingresos (registro: $LOG)" >&2
else

{
    echo "# Ciclo on-chain de NIKO SUN (testnet)"
    echo ""
    echo "- Contrato: [$CONTRACT_ID]($EXPLORER/contract/$CONTRACT_ID)"
    echo "- Fecha (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "- Admin: \`$ADMIN_ADDR\` · Emisor: \`$ISSUER_ADDR\`"
    echo "- Participante 1: \`$P1_ADDR\` · Participante 2: \`$P2_ADDR\`"
    echo ""
    echo "| Paso | Resultado | Transacción |"
    echo "|---|---|---|"
} > "$LOG"

# 1. Compliance: el admin verifica al emisor y aprueba a los participantes (KYC simulado)
invoke "$ADMIN" "Emisor verificado" set_issuer --admin "$ADMIN_ADDR" --account "$ISSUER_ADDR" --verified true > /dev/null
invoke "$ADMIN" "Participante 1 aprobado" set_participant --admin "$ADMIN_ADDR" --account "$P1_ADDR" --approved true > /dev/null
invoke "$ADMIN" "Participante 2 aprobado" set_participant --admin "$ADMIN_ADDR" --account "$P2_ADDR" --approved true > /dev/null

# 2. El emisor registra el proyecto: 1000 participaciones a 10 XLM, minimo 1
PID=$(invoke "$ISSUER" "Proyecto creado" create_project --creator "$ISSUER_ADDR" \
    --name '"Parque Solar Demo Arequipa"' --total_supply 1000 --price "$PRICE" --min_purchase 1)
PID="${PID//\"/}"
if ! [[ "$PID" =~ ^[0-9]+$ ]]; then
    # La tx entro pero el valor de retorno se perdio por un error de red: el proyecto es el ultimo creado
    PID=$(( $(view next_project_id | tr -d '"') - 1 ))
fi

# 3. Los participantes adquieren participaciones: el XLM pasa al contrato via el SAC
invoke "$P1" "Participante 1 adquiere 30 (300 XLM)" purchase_tokens --buyer "$P1_ADDR" --project_id "$PID" --amount 30 > /dev/null
invoke "$P2" "Participante 2 adquiere 10 (100 XLM)" purchase_tokens --buyer "$P2_ADDR" --project_id "$PID" --amount 10 > /dev/null

# 4. Telemetria anclada: energia generada informada por el emisor
invoke "$ISSUER" "Energía registrada: +1250 kWh" update_energy --caller "$ISSUER_ADDR" --project_id "$PID" --energy_delta 1250 > /dev/null

fi

# 5. El emisor deposita 40 XLM de ingresos de energia, a repartir en proporcion
invoke "$ISSUER" "Ingresos depositados: 40 XLM" deposit_revenue --depositor "$ISSUER_ADDR" \
    --project_id "$PID" --amount "$REVENUE" --energy_kwh_delta 0 > /dev/null

C1=$(view get_claimable --investor "$P1_ADDR" --project_id "$PID")
C2=$(view get_claimable --investor "$P2_ADDR" --project_id "$PID")
echo "ℹ️  Reclamable: participante 1 = $C1 stroops, participante 2 = $C2 stroops (esperado 300000000 y 100000000)"

# 6. Cada participante reclama su parte (modelo pull)
invoke "$P1" "Participante 1 reclama su parte" claim_revenue --investor "$P1_ADDR" --project_id "$PID" > /dev/null
invoke "$P2" "Participante 2 reclama su parte" claim_revenue --investor "$P2_ADDR" --project_id "$PID" > /dev/null

# 7. El emisor retira parte de las ventas
invoke "$ISSUER" "Emisor retira 200 XLM de ventas" withdraw_sales --caller "$ISSUER_ADDR" --project_id "$PID" --amount "$WITHDRAW" > /dev/null

# 8. Pausa global: bloquea entradas de XLM; se verifica con una simulacion que falla con Paused (#5)
invoke "$ADMIN" "Pausa global activada" set_paused --admin "$ADMIN_ADDR" --paused true > /dev/null
if stellar contract invoke --id "$CONTRACT_ID" --source-account "$P1" --network "$NETWORK" --send=no \
        -- purchase_tokens --buyer "$P1_ADDR" --project_id "$PID" --amount 1 > /dev/null 2>/tmp/niko_pause.err; then
    echo "❌ La compra NO fue rechazada durante la pausa" >&2
    exit 1
fi
if grep -q -E 'Error\(Contract, #5\)' /tmp/niko_pause.err; then
    echo "| Compra durante la pausa | rechazada con \`Paused (#5)\` (simulación) | — |" >> "$LOG"
    echo "✅ Compra rechazada durante la pausa (Paused #5)" >&2
else
    echo "⚠️  La compra falló, pero no con Paused (#5):" >&2
    cat /tmp/niko_pause.err >&2
fi
rm -f /tmp/niko_pause.err
invoke "$ADMIN" "Pausa global desactivada" set_paused --admin "$ADMIN_ADDR" --paused false > /dev/null

echo ""
echo "📄 Registro con hashes: $LOG"
echo "🔗 Proyecto $PID: $EXPLORER/contract/$CONTRACT_ID"
