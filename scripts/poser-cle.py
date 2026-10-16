#!/usr/bin/env python3
"""Pose une cle secrete dans .env.local sans jamais afficher sa valeur.

Usage :
    python3 scripts/poser-cle.py SUPABASE_SERVICE_ROLE_KEY /tmp/srk.txt

Lit le fichier source (tolere BOM, CRLF, guillemets, espaces autour du `=`,
et une ligne de la forme `NOM=valeur`), ecrit la valeur dans .env.local,
met le fichier en 0600, puis efface la source.
N'affiche que le nom, la longueur et le prefixe de la cle.
"""
from __future__ import annotations

import os
import pathlib
import re
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
ENV = RACINE / ".env.local"


def extraire(nom: str, brut: str) -> str:
    """Isole la valeur, que le fichier contienne `NOM=valeur` ou la valeur seule."""
    texte = brut.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n")
    for ligne in texte.split("\n"):
        ligne = ligne.strip()
        if not ligne or ligne.startswith("#"):
            continue
        correspondance = re.match(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$", ligne)
        if correspondance and correspondance.group(1) == nom:
            valeur = correspondance.group(2)
        elif correspondance:
            continue
        else:
            valeur = ligne
        return valeur.strip().strip('"').strip("'").strip()
    return ""


def poser(nom: str, valeur: str) -> None:
    texte = ENV.read_text(encoding="utf-8") if ENV.exists() else ""
    texte = texte.replace("\r\n", "\n")
    motif = re.compile(rf"^\s*{re.escape(nom)}\s*=.*$", re.M)
    if motif.search(texte):
        texte = motif.sub(f"{nom}={valeur}", texte)
    else:
        if texte and not texte.endswith("\n"):
            texte += "\n"
        texte += f"{nom}={valeur}\n"
    ENV.write_text(texte, encoding="utf-8")
    os.chmod(ENV, 0o600)


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    nom, source = sys.argv[1], pathlib.Path(sys.argv[2])
    if not source.exists():
        print(f"ERREUR : fichier source introuvable : {source}")
        return 1

    valeur = extraire(nom, source.read_text(encoding="utf-8", errors="replace"))
    if not valeur:
        print(f"ERREUR : aucune valeur lisible dans {source}")
        return 1

    poser(nom, valeur)
    prefixe = valeur[:11] if valeur.startswith(("sb_secret_", "sb_publishable_", "eyJ")) else valeur[:3]
    print(f"OK  {nom} posee dans .env.local  ({len(valeur)} car., prefixe {prefixe}...)")
    if valeur.startswith("sb_publishable_") or valeur.startswith("NEXT_PUBLIC"):
        print("ALERTE : cette valeur ressemble a une cle PUBLIABLE, pas a une cle de service.")
    if valeur.startswith(("sb_secret_", "eyJ")):
        print("Forme coherente avec une cle de service.")
    print(f"Permissions .env.local : {oct(ENV.stat().st_mode)[-3:]}")

    try:
        source.unlink()
        print(f"Source effacee : {source}")
    except OSError as erreur:
        print(f"ATTENTION : source non effacee ({erreur}) — a supprimer a la main.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
