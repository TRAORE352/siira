#!/bin/sh
# Reconstruit et relance Siira en production sur le port 3100.
# Attend que le port soit réellement libre avant de démarrer : sans cela, un
# ancien serveur continue de servir la construction précédente.
set -e
cd "$(dirname "$0")/.."

PORT=3100

# Arrêter tout serveur en place et attendre que le port réponde vraiment plus.
fuser -k "$PORT"/tcp 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
for _ in $(seq 1 30); do
  if ! curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/"; then break; fi
  sleep 0.5
done

NEXT_CPUS=1 npx next build >/tmp/siira-build.log 2>&1 || {
  echo "ECHEC de la construction :"
  tail -20 /tmp/siira-build.log
  exit 1
}

npx next start -p "$PORT" >/tmp/siira-prod.log 2>&1 &

for _ in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/connexion" || true)
  if [ "$code" = "200" ]; then
    echo "Siira est en ligne sur http://localhost:$PORT"
    exit 0
  fi
  sleep 0.5
done

echo "ECHEC du démarrage :"
tail -20 /tmp/siira-prod.log
exit 1
