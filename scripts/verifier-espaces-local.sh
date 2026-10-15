#!/bin/sh
# Verifie les trois adresses possibles de Siira, en local.
#
# Pour chaque espace : construction avec la variable correspondante, demarrage
# sur son port, controle par scripts/verifier-espaces.js, puis arret.
# L'espace agent est controle en plus dans un vrai navigateur, pour verifier
# que l'installation sur le telephone est reellement proposee.
#
# Les ports sont liberes avant chaque demarrage : un serveur reste en place
# servirait une construction melangee a la nouvelle.
set -u
cd "$(dirname "$0")/.."

for combo in "agent:3101" "centre:3102" "complet:3100"; do
  espace=${combo%%:*}
  port=${combo##*:}

  echo "=================== espace $espace (port $port) ==================="
  sh scripts/liberer-ports.sh "$port" || exit 1

  if [ "$espace" = "complet" ]; then
    npm run build >"/tmp/build-$espace.log" 2>&1 || { echo "ECHEC DE CONSTRUCTION"; tail -15 "/tmp/build-$espace.log"; exit 1; }
  else
    NEXT_PUBLIC_ESPACE="$espace" npm run build >"/tmp/build-$espace.log" 2>&1 || { echo "ECHEC DE CONSTRUCTION"; tail -15 "/tmp/build-$espace.log"; exit 1; }
  fi

  npx next start -p "$port" >"/tmp/start-$espace.log" 2>&1 &

  # Le serveur doit etre celui qu'on vient de lancer : sinon la verification
  # porterait sur une autre construction.
  sleep 2
  if grep -q "EADDRINUSE" "/tmp/start-$espace.log" 2>/dev/null; then
    echo "ECHEC : le port $port etait deja occupe, le serveur n'a pas demarre."
    exit 1
  fi

  for _ in $(seq 1 60); do
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/" || true)
    [ "$code" = "200" ] && break
    sleep 0.5
  done

  if [ "$espace" = "agent" ]; then
    node scripts/verifier-espaces.js --base "http://localhost:$port" --espace "$espace" --pwa
  else
    node scripts/verifier-espaces.js --base "http://localhost:$port" --espace "$espace"
  fi
  resultat=$?

  sh scripts/liberer-ports.sh "$port" || true
  sleep 1

  if [ "$resultat" -ne 0 ]; then
    echo "ARRET : l'espace $espace n'est pas conforme."
    exit 1
  fi
done

echo
echo "LES QUATRE ESPACES SONT CONFORMES."
