#!/usr/bin/env bash
# Regtest stack for two METEVO phones, each backed by its own RLN node.
set -euo pipefail

cd "$(dirname "$0")"

ENV_FILE=.env
SECRETS_DIR=.secrets
NODES=(alice bob)
INITIAL_BLOCKS=103
WAIT_TIMEOUT_S=120

die() { echo "ERR: $*" >&2; exit 1; }
log() { echo "==> $*"; }

ensure_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    log "creating $ENV_FILE with generated secrets"
    cp .env.example "$ENV_FILE"
    while grep -q '=GENERATE$' "$ENV_FILE"; do
      sed -i "0,/=GENERATE$/s//=$(openssl rand -hex 16)/" "$ENV_FILE"
    done
    chmod 600 "$ENV_FILE"
  fi
  load_env_file
  if [ -z "${BITCOIND_RPCAUTH:-}" ]; then
    echo "BITCOIND_RPCAUTH='$(derive_rpcauth)'" >>"$ENV_FILE"
    load_env_file
  fi
}

load_env_file() {
  set -a
  # shellcheck disable=SC1090
  . "./$ENV_FILE"
  set +a
}

# bitcoind rpcauth line: user:salt$HMAC-SHA256(key=salt, msg=password).
derive_rpcauth() {
  local salt hash
  salt=$(openssl rand -hex 16)
  hash=$(printf '%s' "$BITCOIND_RPC_PASSWORD" | openssl dgst -sha256 -hmac "$salt" | awk '{print $NF}')
  echo "${BITCOIND_RPC_USER}:${salt}\$${hash}"
}

compose() { docker compose --env-file "$ENV_FILE" "$@"; }

bitcoin_cli() { compose exec -T -u blits bitcoind bitcoin-cli -regtest "$@"; }

node_url() {
  case "$1" in
    alice) echo "http://127.0.0.1:${ALICE_API_HOST_PORT}" ;;
    bob) echo "http://127.0.0.1:${BOB_API_HOST_PORT}" ;;
    *) die "unknown node: $1 (expected alice or bob)" ;;
  esac
}

# rln <node> <METHOD> <path> [json-body]: prints the body, fails on HTTP errors.
rln() {
  local node=$1 method=$2 path=$3 body=${4:-}
  local args=(-sS -m 60 -X "$method" -w '\n%{http_code}')
  [ -n "$body" ] && args+=(-H 'Content-Type: application/json' -d "$body")
  local response status
  response=$(curl "${args[@]}" "$(node_url "$node")$path")
  status=${response##*$'\n'}
  response=${response%$'\n'*}
  if [ "$status" -ge 400 ]; then
    echo "$response"
    return 1
  fi
  echo "$response"
}

wait_until() {
  local description=$1; shift
  local started
  started=$(date +%s)
  until "$@" >/dev/null 2>&1; do
    [ $(( $(date +%s) - started )) -gt "$WAIT_TIMEOUT_S" ] && die "timed out waiting for $description"
    sleep 2
  done
}

mine() {
  local blocks=${1:-1}
  local address
  address=$(bitcoin_cli -rpcwallet=miner getnewaddress)
  bitcoin_cli generatetoaddress "$blocks" "$address" >/dev/null
}

electrs_ready() { compose logs electrs | grep -q 'finished full compaction'; }
node_api_up() { curl -s -m 5 -o /dev/null "$(node_url "$1")/nodeinfo"; }
node_unlocked() { rln "$1" GET /nodeinfo; }

init_node() {
  local node=$1 response
  if response=$(rln "$node" POST /init "$(jq -nc --arg p "$RLN_NODE_PASSWORD" '{password: $p}')"); then
    mkdir -p "$SECRETS_DIR" && chmod 700 "$SECRETS_DIR"
    (umask 077 && jq -r '.mnemonic' <<<"$response" >"$SECRETS_DIR/$node.mnemonic")
    log "$node initialized (mnemonic saved to infra/regtest/$SECRETS_DIR/$node.mnemonic)"
  elif [[ "$(jq -r '.name' <<<"$response")" =~ ^(AlreadyInitialized|UnlockedNode)$ ]]; then
    log "$node already initialized"
  else
    die "$node /init failed: $response"
  fi
}

unlock_node() {
  local node=$1 response body
  body=$(jq -nc \
    --arg password "$RLN_NODE_PASSWORD" \
    --arg user "$BITCOIND_RPC_USER" \
    --arg rpcpass "$BITCOIND_RPC_PASSWORD" \
    '{password: $password,
      ldk_chain_sync: {mode: "BlockSync", config: {
        bitcoind_rpc_username: $user, bitcoind_rpc_password: $rpcpass,
        bitcoind_rpc_host: "bitcoind", bitcoind_rpc_port: 18443}},
      indexer_url: "electrs:50001",
      proxy_endpoint: "rpc://proxy:3000/json-rpc",
      announce_addresses: [], announce_alias: null}')
  if response=$(rln "$node" POST /unlock "$body"); then
    log "$node unlocked"
  elif [ "$(jq -r '.name' <<<"$response")" = "AlreadyUnlocked" ]; then
    log "$node already unlocked"
  else
    die "$node /unlock failed: $response"
  fi
}

fund_node() {
  local node=$1 address spendable
  spendable=$(rln "$node" POST /btcbalance '{"skip_sync":false}' | jq -r '.vanilla.spendable')
  if [ "$spendable" -ge 50000000 ]; then
    log "$node already funded ($spendable sat)"
    return
  fi
  address=$(rln "$node" POST /address | jq -r '.address')
  bitcoin_cli -rpcwallet=miner sendtoaddress "$address" 1 >/dev/null
  log "sent 1 BTC to $node"
}

create_utxos() {
  local node=$1 response
  if ! response=$(rln "$node" POST /createutxos '{"up_to":true,"num":10,"size":32000,"fee_rate":2,"skip_sync":false}'); then
    [ "$(jq -r '.name' <<<"$response")" = "AllocationsAlreadyAvailable" ] || die "$node /createutxos failed: $response"
  fi
}

pubkey_of() { rln "$1" GET /nodeinfo | jq -r '.pubkey'; }

usdm_asset_id() {
  rln alice POST /listassets '{"filter_asset_schemas":["Nia"]}' |
    jq -r --arg t "$USDM_TICKER" '[.nia[]? | select(.ticker == $t)][0].asset_id // empty'
}

issue_usdm() {
  local asset_id
  asset_id=$(usdm_asset_id)
  if [ -n "$asset_id" ]; then
    log "$USDM_TICKER already issued: $asset_id"
    return
  fi
  asset_id=$(rln alice POST /issueassetnia "$(jq -nc \
    --arg ticker "$USDM_TICKER" --arg name "$USDM_NAME" \
    --argjson precision "$USDM_PRECISION" --argjson amount "$USDM_ISSUE_AMOUNT" \
    '{amounts: [$amount], ticker: $ticker, name: $name, precision: $precision}')" | jq -r '.asset.asset_id')
  log "issued $USDM_TICKER on alice: $asset_id"
}

channel_usable() {
  rln alice GET /listchannels | jq -e --arg asset "$1" '[.channels[] | select(.is_usable and .asset_id == $asset)] | length > 0'
}

open_channel() {
  local asset_id=$1 bob_pubkey
  if channel_usable "$asset_id" >/dev/null 2>&1; then
    log "alice -> bob $USDM_TICKER channel already usable"
    return
  fi
  bob_pubkey=$(pubkey_of bob)
  rln alice POST /connectpeer "$(jq -nc --arg p "$bob_pubkey@rln-bob:9735" '{peer_pubkey_and_addr: $p}')" >/dev/null
  rln alice POST /openchannel "$(jq -nc \
    --arg peer "$bob_pubkey@rln-bob:9735" --arg asset "$asset_id" \
    --argjson capacity "$CHANNEL_CAPACITY_SAT" --argjson push "$CHANNEL_PUSH_MSAT" \
    --argjson amount "$CHANNEL_ASSET_AMOUNT" --argjson pushAsset "$CHANNEL_PUSH_ASSET_AMOUNT" \
    '{peer_pubkey_and_opt_addr: $peer, capacity_sat: $capacity, push_msat: $push,
      asset_id: $asset, asset_amount: $amount, push_asset_amount: $pushAsset,
      public: false, with_anchors: true}')" >/dev/null
  log "opening alice -> bob channel"
  local attempt
  for attempt in $(seq 1 30); do
    mine 1
    channel_usable "$asset_id" >/dev/null 2>&1 && { log "channel usable"; return; }
    sleep 2
  done
  die "channel did not become usable"
}

cmd_up() {
  ensure_env_file
  compose up -d
  wait_until "bitcoind" bitcoin_cli getblockchaininfo
  bitcoin_cli -named createwallet wallet_name=miner load_on_startup=true >/dev/null 2>&1 ||
    bitcoin_cli loadwallet miner >/dev/null 2>&1 || true
  if [ "$(bitcoin_cli getblockcount)" -lt "$INITIAL_BLOCKS" ]; then
    mine "$INITIAL_BLOCKS"
  fi
  wait_until "electrs" electrs_ready
  for node in "${NODES[@]}"; do wait_until "$node API" node_api_up "$node"; done
  log "stack up; next: ./regtest.sh bootstrap (first run) or ./regtest.sh unlock (restart)"
}

# Nodes come back locked after every container restart.
cmd_unlock() {
  ensure_env_file
  for node in "${NODES[@]}"; do
    unlock_node "$node"
    wait_until "$node unlocked" node_unlocked "$node"
  done
}

cmd_bootstrap() {
  ensure_env_file
  for node in "${NODES[@]}"; do
    init_node "$node"
    unlock_node "$node"
    wait_until "$node unlocked" node_unlocked "$node"
    fund_node "$node"
  done
  mine 6
  for node in "${NODES[@]}"; do create_utxos "$node"; done
  mine 6
  issue_usdm
  local asset_id
  asset_id=$(usdm_asset_id)
  open_channel "$asset_id"
  cmd_status
}

cmd_status() {
  ensure_env_file
  local asset_id
  asset_id=$(usdm_asset_id)
  echo
  for node in "${NODES[@]}"; do
    local info
    info=$(rln "$node" GET /nodeinfo) || { echo "$node: locked or down"; continue; }
    echo "$node  api=$(node_url "$node")  pubkey=$(jq -r '.pubkey' <<<"$info")"
    echo "       btc=$(rln "$node" POST /btcbalance '{"skip_sync":false}' | jq -c '.vanilla')"
    [ -n "$asset_id" ] && echo "       $USDM_TICKER=$(rln "$node" POST /assetbalance "$(jq -nc --arg a "$asset_id" '{asset_id: $a}')" | jq -c .)"
    echo "       channels=$(rln "$node" GET /listchannels | jq -c '[.channels[] | {usable: .is_usable, asset_local: .asset_local_amount, asset_remote: .asset_remote_amount}]')"
  done
  echo
  echo "USDM asset id: ${asset_id:-not issued yet}"
  echo "Phone wiring (each phone talks to http://localhost:3001):"
  echo "  adb -s <ALICE_SERIAL> reverse tcp:3001 tcp:${ALICE_API_HOST_PORT}"
  echo "  adb -s <BOB_SERIAL>   reverse tcp:3001 tcp:${BOB_API_HOST_PORT}"
  echo "  adb -s <SERIAL> reverse tcp:8080 tcp:8080   # invoice relay (./regtest.sh lsp)"
}

cmd_invoice() {
  ensure_env_file
  local node=${1:?usage: invoice <alice|bob> <asset_amount>} amount=${2:?usage: invoice <node> <asset_amount>}
  local min_msat
  min_msat=$(rln "$node" GET /nodeinfo | jq -r '.rgb_htlc_min_msat')
  rln "$node" POST /lninvoice "$(jq -nc --arg a "$(usdm_asset_id)" --argjson amt "$amount" --argjson msat "$min_msat" \
    '{amt_msat: $msat, expiry_sec: 3600, asset_id: $a, asset_amount: $amt}')" | jq -r '.invoice'
}

cmd_pay() {
  ensure_env_file
  local node=${1:?usage: pay <alice|bob> <invoice>} invoice=${2:?usage: pay <node> <invoice>}
  rln "$node" POST /sendpayment "$(jq -nc --arg i "$invoice" '{invoice: $i}')" | jq .
}

# --- invoice relay (LSP) -------------------------------------------------
# The relay lets a payer ask a recipient's node for an invoice through the
# LSP. Bob's side of the demo runs here, from the shell.
LSP_CONTAINER=metevo-invoice-relay
LSP_VOLUME=metevo-invoice-relay-data
LSP_NETWORK=metevo-regtest_default

lsp_url() { echo "${LSP_URL:-http://127.0.0.1:8080}"; }

lsp_token() {
  local token=${LSP_TOKEN:-${METEVO_LSP_APAY_TOKEN:-}}
  if [ -z "$token" ] && [ -f ../../scripts/device-wallet-config.json ]; then
    token=$(jq -r '.lspBearerToken // empty' ../../scripts/device-wallet-config.json)
  fi
  [ -n "$token" ] || die "set LSP_TOKEN or METEVO_LSP_APAY_TOKEN (must match the phone's lspBearerToken)"
  echo "$token"
}

relay_call() {
  local method=$1 path=$2 body=${3:-}
  local args=(-sS -m 20 -X "$method" -w '\n%{http_code}' -H "Authorization: Bearer $(lsp_token)")
  [ -n "$body" ] && args+=(-H 'Content-Type: application/json' -d "$body")
  local response status
  response=$(curl "${args[@]}" "$(lsp_url)$path") || return 1
  status=${response##*$'\n'}
  response=${response%$'\n'*}
  if [ "$status" -ge 400 ]; then
    echo "relay $method $path -> HTTP $status: $response" >&2
    return 1
  fi
  echo "$response"
}

cmd_lsp_build() {
  [ -d ../../../utexo-lsp ] || die "../../../utexo-lsp not found; build the LSP image where the source lives"
  docker build -t "${LSP_IMAGE:-utexo-lsp:latest}" ../../../utexo-lsp
}

cmd_lsp() {
  ensure_env_file
  local image=${LSP_IMAGE:-utexo-lsp:latest} attempt
  docker rm -f "$LSP_CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$LSP_CONTAINER" --network "$LSP_NETWORK" -p 8080:8080 \
    -e SERVER_ADDR=:8080 \
    -e DATABASE_DRIVER=sqlite \
    -e DATABASE_URL=/data/relay.db \
    -e APAY_BEARER_TOKEN="$(lsp_token)" \
    -e LSP_BASE_URL=http://rln-alice:3001 \
    -e RGB_NODE_BASE_URL=http://rln-alice:3001 \
    -e LIGHTNING_ADDRESS_DOMAIN_URL=http://127.0.0.1:8080 \
    -e METEVO_INVOICE_EXPIRY=10m \
    -v "$LSP_VOLUME:/data" \
    "$image" >/dev/null
  for attempt in $(seq 1 40); do
    curl -fsS -m 2 "$(lsp_url)/health" >/dev/null 2>&1 && {
      log "invoice relay up on $(lsp_url); rebuild with ./regtest.sh lsp-build after LSP changes"
      return
    }
    sleep 0.5
  done
  docker logs "$LSP_CONTAINER" 2>&1 | tail -20
  die "invoice relay did not become healthy"
}

cmd_relay_inbox() {
  ensure_env_file
  local node=${1:?usage: relay-inbox <alice|bob>}
  relay_call GET "/metevo/invoice-inbox?pubkey=$(pubkey_of "$node")" | jq .
}

cmd_relay_request() {
  ensure_env_file
  local recipient=${1:?usage: relay-request <alice|bob> <amount_usd> [sender]} usd=${2:?usage: relay-request <recipient> <amount_usd> [sender]}
  local sender=${3:-}
  [ -n "$sender" ] || { [ "$recipient" = alice ] && sender=bob || sender=alice; }
  relay_call POST /metevo/invoice-request "$(jq -nc \
    --arg recipient "$(pubkey_of "$recipient")" \
    --arg sender "$(pubkey_of "$sender")" \
    --argjson usd "$usd" \
    '{recipient_pubkey: $recipient, sender_pubkey: $sender, amount_usd: $usd}')" | jq .
}

# Bob's side: create the real USDm invoice on that node, then answer.
cmd_relay_answer() {
  ensure_env_file
  local node=${1:?usage: relay-answer <alice|bob> [request_id]} only=${2:-}
  local pubkey answer_count=0 request_id usd amount invoice
  pubkey=$(pubkey_of "$node")
  while IFS=$'\t' read -r request_id usd; do
    if [ -n "$only" ] && [ "$request_id" != "$only" ]; then
      continue
    fi
    amount=$(jq -n --argjson usd "$usd" '$usd * 100000000')
    invoice=$(cmd_invoice "$node" "$amount")
    relay_call POST /metevo/invoice-answer "$(jq -nc \
      --arg request "$request_id" --arg pubkey "$pubkey" --arg invoice "$invoice" \
      '{request_id: $request, recipient_pubkey: $pubkey, invoice: $invoice}')" >/dev/null
    echo "$request_id  $usd USDm  invoice=${invoice:0:28}…"
    answer_count=$((answer_count + 1))
  done < <(relay_call GET "/metevo/invoice-inbox?pubkey=$pubkey" | jq -r '.requests[] | [.request_id, .amount_usd] | @tsv')
  if [ "$answer_count" -eq 0 ]; then
    log "no pending request for $node"
  fi
}

# The payer's side after the recipient app confirms: print the invoice.
cmd_relay_await() {
  ensure_env_file
  local request_id=${1:?usage: relay-await <request_id> [timeout_s]} timeout=${2:-120}
  local started=$SECONDS response status
  while :; do
    response=$(relay_call POST /metevo/invoice-response \
      "$(jq -nc --arg request "$request_id" '{request_id: $request}')")
    status=$(jq -r '.status' <<<"$response")
    [ "$status" = pending ] || break
    [ $((SECONDS - started)) -lt "$timeout" ] || die "no answer after ${timeout}s"
    sleep 1
  done
  jq . <<<"$response"
  [ "$status" = delivered ]
}

usage() {
  local USDM_TICKER=${USDM_TICKER:-USDM}
  cat <<EOF
usage: ./regtest.sh <command>
  up                         start bitcoind, electrs, proxy and the alice/bob nodes
  bootstrap                  init/unlock/fund both nodes, issue $USDM_TICKER, open alice->bob channel
  unlock                     unlock both nodes after a restart
  status                     balances, channels and the adb reverse lines
  mine [blocks]              mine blocks (default 1)
  invoice <node> <amount>    create a $USDM_TICKER lightning invoice (base units)
  pay <node> <invoice>       pay an invoice from a node
  lsp-build                  build the relay LSP image from ../../../utexo-lsp
  lsp                        start the invoice-relay LSP on :8080
  relay-request <node> <usd> [sender]
                             ask a node for a $USDM_TICKER invoice over the relay
  relay-inbox <node>         list the relay requests waiting for that node
  relay-answer <node> [id]   create the invoice and answer each pending request
  relay-await <request_id>   print the invoice the recipient delivered
  down                       stop the stack, keep data
  reset                      stop the stack and delete all chain and node data
EOF
}

main() {
  local command=${1:-}
  shift || true
  case "$command" in
    up) cmd_up ;;
    bootstrap) cmd_bootstrap ;;
    unlock) cmd_unlock ;;
    status) cmd_status ;;
    mine) ensure_env_file; mine "${1:-1}" ;;
    invoice) cmd_invoice "$@" ;;
    pay) cmd_pay "$@" ;;
    lsp-build) cmd_lsp_build ;;
    lsp) cmd_lsp ;;
    relay-request) cmd_relay_request "$@" ;;
    relay-inbox) cmd_relay_inbox "$@" ;;
    relay-answer) cmd_relay_answer "$@" ;;
    relay-await) cmd_relay_await "$@" ;;
    down) ensure_env_file; docker rm -f "$LSP_CONTAINER" >/dev/null 2>&1 || true; compose down ;;
    reset)
      ensure_env_file
      docker rm -f "$LSP_CONTAINER" >/dev/null 2>&1 || true
      docker volume rm "$LSP_VOLUME" >/dev/null 2>&1 || true
      compose down -v
      rm -rf "$SECRETS_DIR"
      ;;
    *) usage; [ -z "$command" ] || exit 1 ;;
  esac
}

main "$@"
