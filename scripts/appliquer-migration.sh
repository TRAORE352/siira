#!/usr/bin/env bash
# Applique un fichier SQL sur la base Supabase, sans jamais afficher le secret.
#
#     sh scripts/appliquer-migration.sh supabase/a-coller-comptes.sql /root/dbpass.txt
#
# Le mot de passe est lu depuis un fichier (jamais un argument : argv est
# visible dans la liste des processus), passe par PGPASSWORD, et le fichier
# source est efface a la fin.
set -eu

FICHIER_SQL="${1:?Usage: appliquer-migration.sh <fichier.sql> <fichier-mot-de-passe>}"
FICHIER_MDP="${2:?Il manque le fichier du mot de passe}"

RACINE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RACINE"

[ -f "$FICHIER_SQL" ]  || { echo "ERREUR : $FICHIER_SQL introuvable"; exit 1; }
[ -f "$FICHIER_MDP" ]  || { echo "ERREUR : $FICHIER_MDP introuvable"; exit 1; }

# Reference du projet : lue depuis l'URL, pas ecrite en dur.
URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)
REF=$(echo "$URL" | sed -E 's#https://([^.]+)\..*#\1#')
[ -n "$REF" ] || { echo "ERREUR : reference du projet illisible dans .env.local"; exit 1; }

# Le mot de passe peut avoir ete saisi avec un retour chariot Windows.
PGPASSWORD=$(tr -d '\r\n' < "$FICHIER_MDP")
export PGPASSWORD
echo "Mot de passe lu : ${#PGPASSWORD} caracteres."

# Le pooler de session (5432) accepte le DDL ; le mode transaction (6543) non.
#
# La region ne se DEDUIT pas de l'URL du projet : `eyjcpq….supabase.co` ne dit
# rien du pooler, et viser la mauvaise region echoue sur
# « FATAL (ENOTFOUND) tenant/user postgres.<ref> not found » — un message qui
# ressemble a un mauvais identifiant alors que seul l'hote est faux. On sonde,
# et on garde la reponse en cache pour les migrations suivantes.
UTILISATEUR="postgres.${REF}"
CACHE_HOTE="$HOME/.siira-pooler-host"

if [ -f "$CACHE_HOTE" ]; then
  HOTE=$(cat "$CACHE_HOTE")
else
  echo "Recherche de la region du pooler..."
  HOTE=""
  for prefixe in aws-0 aws-1; do
    for region in eu-west-1 eu-west-2 eu-west-3 eu-central-1 eu-central-2 \
                  eu-north-1 us-east-1 us-east-2 us-west-1 ap-southeast-1; do
      CANDIDAT="$prefixe-$region.pooler.supabase.com"
      getent hosts "$CANDIDAT" >/dev/null 2>&1 || continue
      SONDE=$(timeout 12 psql \
        "host=$CANDIDAT port=5432 dbname=postgres user=$UTILISATEUR sslmode=require" \
        --no-password -tAc "select 1" 2>&1)
      case "$SONDE" in
        1*) HOTE="$CANDIDAT"; break 2;;
      esac
    done
  done
  [ -n "$HOTE" ] || {
    echo "ERREUR : aucune region du pooler ne repond pour ce projet."
    echo "Verifiez le mot de passe (Project Settings, Database, Database password)."
    unset PGPASSWORD; rm -f "$FICHIER_MDP"; exit 1
  }
  printf '%s' "$HOTE" > "$CACHE_HOTE"
  echo "Region trouvee : $HOTE"
fi

echo "Projet    : $REF"
echo "Fichier   : $FICHIER_SQL"
echo ""

set +e
psql "host=$HOTE port=5432 dbname=postgres user=$UTILISATEUR sslmode=require" \
  --no-password -v ON_ERROR_STOP=1 -f "$FICHIER_SQL"
CODE=$?
set -e

unset PGPASSWORD
rm -f "$FICHIER_MDP"
echo ""
echo "Fichier du mot de passe efface."

if [ "$CODE" -eq 0 ]; then
  echo "MIGRATION APPLIQUEE."
else
  echo "ECHEC (code $CODE) : rien n'a ete applique au-dela de la premiere erreur."
fi
exit "$CODE"
