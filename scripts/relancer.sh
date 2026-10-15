#!/bin/sh
# Reconstruit et relance Siira en production sur le port 3100.
# Attend que le port soit reellement libre avant de demarrer : sans cela, un
# ancien serveur continue de servir la construction precedente.
set -e
cd "$(dirname "$0")/.."

PORT=3100

# Arreter tout serveur en place et attendre que le port reponde vraiment plus.
sh scripts/liberer-ports.sh "$PORT"

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

echo "ECHEC du demarrage :"
tail -20 /tmp/siira-prod.log
exit 1
