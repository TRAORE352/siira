"use client";

import { useMemo, useRef, useState } from "react";
import type { Creneau } from "@/lib/types";

const HEURES = Array.from({ length: 12 }, (_, i) => 7 + i); // 7h à 18h

/** Lundi de la semaine qui contient la date donnée. */
function lundiDeLaSemaine(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const jour = date.getDay();
  date.setDate(date.getDate() + (jour === 0 ? -6 : 1 - jour));
  return date;
}

function cleJour(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function semaineIso(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const jour = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - jour);
  const debutAn = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - debutAn.getTime()) / 86400000 + 1) / 7);
}

function formatHeure(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function jourSemaine(d: Date): string {
  const l = d.toLocaleDateString("fr-FR", { weekday: "short" });
  return l.charAt(0).toUpperCase() + l.slice(1);
}

function libelleMois(m: Date): string {
  const l = m.toLocaleDateString("fr-FR", { month: "short" });
  return `${l.charAt(0).toUpperCase()}${l.slice(1)} ${m.getFullYear()}`;
}

function estAujourdhui(d: Date): boolean {
  const auj = new Date();
  return (
    d.getFullYear() === auj.getFullYear() &&
    d.getMonth() === auj.getMonth() &&
    d.getDate() === auj.getDate()
  );
}

/**
 * Agenda hebdomadaire : mois défilants en haut, numéro de semaine, jours du
 * lundi au vendredi, puis la grille des heures (7h à 18h) avec les rendez-vous.
 */
export function AgendaSemaine({
  creneaux,
  onBasculer,
}: {
  creneaux: Creneau[];
  onBasculer: (creneauId: string, libre: boolean) => void;
}) {
  const [lundi, setLundi] = useState(() => lundiDeLaSemaine(new Date()));
  const carrousel = useRef<HTMLDivElement>(null);

  const jours = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(lundi);
      d.setDate(lundi.getDate() + i);
      return d;
    });
  }, [lundi]);

  const creneauxParCellule = useMemo(() => {
    const map = new Map<string, Creneau[]>();
    const cles = new Set(jours.map(cleJour));
    for (const c of creneaux) {
      const d = new Date(c.debut);
      const cle = cleJour(d);
      if (!cles.has(cle)) continue;
      const h = d.getHours();
      if (h < 7 || h > 18) continue;
      const cleCellule = `${cle}|${h}`;
      const liste = map.get(cleCellule) ?? [];
      liste.push(c);
      map.set(cleCellule, liste);
    }
    return map;
  }, [creneaux, jours]);

  const mois = useMemo(() => {
    let min = new Date();
    let max = new Date();
    for (const c of creneaux) {
      const d = new Date(c.debut);
      if (d < min) min = d;
      if (d > max) max = d;
    }
    const liste: Date[] = [];
    const curseur = new Date(min.getFullYear(), min.getMonth() - 1, 1);
    const fin = new Date(max.getFullYear(), max.getMonth() + 2, 0);
    while (curseur <= fin) {
      liste.push(new Date(curseur));
      curseur.setMonth(curseur.getMonth() + 1);
    }
    return liste;
  }, [creneaux]);

  const moisActif = `${lundi.getFullYear()}-${lundi.getMonth()}`;

  function allerAuMois(m: Date) {
    setLundi(lundiDeLaSemaine(new Date(m.getFullYear(), m.getMonth(), 1)));
  }

  function decalerSemaine(n: number) {
    const d = new Date(lundi);
    d.setDate(d.getDate() + n * 7);
    setLundi(d);
  }

  function defiler(direction: number) {
    carrousel.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  }

  return (
    <div>
      {/* Bandeau des mois (défilant) */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => defiler(-1)}
          aria-label="Mois précédents"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sable-300 text-lg text-sable-600 hover:bg-sable-100"
        >
          ‹
        </button>
        <div ref={carrousel} className="flex flex-1 gap-2 overflow-x-auto pb-1">
          {mois.map((m) => {
            const actif = `${m.getFullYear()}-${m.getMonth()}` === moisActif;
            return (
              <button
                key={m.toISOString()}
                type="button"
                onClick={() => allerAuMois(m)}
                aria-pressed={actif}
                className={`flex min-h-[var(--spacing-cible)] shrink-0 items-center rounded-full border px-3.5 text-sm transition-colors ${
                  actif
                    ? "border-rose-600 bg-rose-600 font-medium text-white"
                    : "border-sable-300 bg-white text-prune-800 hover:bg-sable-100"
                }`}
              >
                {libelleMois(m)}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => defiler(1)}
          aria-label="Mois suivants"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sable-300 text-lg text-sable-600 hover:bg-sable-100"
        >
          ›
        </button>
      </div>

      {/* Ligne des semaines */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => decalerSemaine(-1)}
          aria-label="Semaine précédente"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-sable-300 text-sable-600 hover:bg-sable-100"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-prune-800">Semaine {semaineIso(lundi)}</span>
        <button
          type="button"
          onClick={() => decalerSemaine(1)}
          aria-label="Semaine suivante"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-sable-300 text-sable-600 hover:bg-sable-100"
        >
          ›
        </button>
      </div>

      {/* Jours en en-tête */}
      <div className="grid grid-cols-[4.5rem_repeat(5,1fr)]">
        <div />
        {jours.map((j) => {
          const aujourdhui = estAujourdhui(j);
          return (
            <div
              key={j.toISOString()}
              className={`border-b px-2 py-2 text-center ${
                aujourdhui ? "border-rose-200 bg-rose-50" : "border-sable-200 bg-sable-50"
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  aujourdhui ? "text-rose-700" : "text-sable-600"
                }`}
              >
                {aujourdhui ? "Aujourd'hui" : jourSemaine(j)}
              </p>
              <p className="font-[family-name:var(--font-titre)] text-xl leading-none text-prune-900">
                {j.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Grille des heures */}
      <div className="overflow-hidden rounded-[var(--radius-grand)] border border-sable-200">
        {HEURES.map((h) => (
          <div
            key={h}
            className="grid grid-cols-[4.5rem_repeat(5,1fr)] border-t border-sable-100 first:border-t-0"
          >
            <div className="border-r border-sable-100 px-2 py-2 text-right text-xs text-sable-500">
              {String(h).padStart(2, "0")}h00
            </div>
            {jours.map((j) => {
              const cell = creneauxParCellule.get(`${cleJour(j)}|${h}`) ?? [];
              return (
                <div
                  key={j.toISOString()}
                  className="min-h-[3.25rem] border-r border-sable-100 p-1 last:border-r-0"
                >
                  <div className="flex flex-col gap-1">
                    {cell.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onBasculer(c.id, !c.libre)}
                        className={`flex items-center justify-between gap-1 rounded-[var(--radius-petit)] border px-2 py-1 text-left transition-colors ${
                          c.libre
                            ? "border-vert-bord bg-vert-bg hover:border-vert-fort"
                            : "border-sable-300 bg-sable-100 hover:bg-sable-200"
                        }`}
                      >
                        <span className="text-xs text-prune-800">{formatHeure(c.debut)}</span>
                        <span
                          className={`text-xs font-medium ${
                            c.libre ? "text-vert-texte" : "text-sable-700"
                          }`}
                        >
                          {c.libre ? "Libre" : "Pris"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
