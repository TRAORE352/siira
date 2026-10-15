#!/bin/sh
# Libere les ports de Siira avant de relancer un serveur.
#
# Pourquoi ce script existe : `fuser`, `lsof` et `ss` ne sont pas presents
# partout. Sans eux, un ancien serveur continue de repondre, sert un melange de
# deux constructions et rend des erreurs 500 sur des fichiers javascript
# disparus. La verification de l'application devient alors fausse.
#
# La recherche passe donc par /proc uniquement, et vise precisement le
# processus qui ecoute sur le port demande : rien d'autre n'est arrete.
#
# Usage : sh scripts/liberer-ports.sh 3100 3101 3102 3103
set -u

# Identifiants des processus en ecoute sur un port. Ecrit un identifiant par ligne.
pids_du_port() {
  port_a_liberer="$1"
  hex=$(printf '%04X' "$port_a_liberer")
  inodes=""
  for table in /proc/net/tcp /proc/net/tcp6; do
    [ -r "$table" ] || continue
    trouves=$(awk -v suffixe=":$hex" '
      NR > 1 && $4 == "0A" {
        adresse = $2
        if (substr(adresse, length(adresse) - length(suffixe) + 1) == suffixe) print $10
      }' "$table" 2>/dev/null)
    inodes="$inodes $trouves"
  done

  for inode in $inodes; do
    for lien in /proc/[0-9]*/fd/*; do
      cible=$(readlink "$lien" 2>/dev/null) || continue
      if [ "$cible" = "socket:[$inode]" ]; then
        identifiant=${lien#/proc/}
        echo "${identifiant%%/*}"
      fi
    done
  done
}

for port in "$@"; do
  for pid in $(pids_du_port "$port" | sort -u); do
    echo "Port $port occupe : arret du processus $pid"
    kill "$pid" 2>/dev/null || true
  done
done

# Attendre que chaque port cesse reellement de repondre.
for port in "$@"; do
  libre="non"
  for _ in $(seq 1 40); do
    if ! curl -s -o /dev/null --max-time 1 "http://localhost:$port/"; then
      libre="oui"
      break
    fi
    sleep 0.5
  done
  if [ "$libre" = "non" ]; then
    echo "ATTENTION : le port $port repond encore apres l'arret."
    exit 1
  fi
done
