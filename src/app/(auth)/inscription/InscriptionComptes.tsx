"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bouton } from "@/components/Bouton";
import { Champ, Liste } from "@/components/Champs";
import { MessageErreur } from "@/components/Interface";
import { listerCentres } from "@/lib/data";
import { ESPACE_ACTIF, mentionEspace, roleAutorise } from "@/lib/espaces";
import {
  ACCUEIL_PAR_ROLE,
  creerCompteCentre,
  fermerSession,
  lireSession,
  ouvrirSession,
  trouverCompteInscrit,
} from "@/lib/session";

const SPECIALITES = [
  "Gynécologue",
  "Radiologue",
  "Sage-femme",
  "Médecin généraliste",
  "Infirmier·ère",
  "Oncologue",
  "Autre",
];

const OPTIONS_SEXE = [
  { valeur: "femme", libelle: "Femme" },
  { valeur: "homme", libelle: "Homme" },
];

/**
 * Inscription d'un membre de centre spécialisé.
 * Crée un compte (matricule + mot de passe à 6 chiffres) et ouvre l'espace.
 */
export function InscriptionComptes() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [sexe, setSexe] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [centreId, setCentreId] = useState("");
  const [matricule, setMatricule] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  /* Déjà connecté : on renvoie vers son espace. */
  useEffect(() => {
    const profil = lireSession();
    if (!profil) return;
    if (!roleAutorise(ESPACE_ACTIF, profil.role)) {
      fermerSession();
      return;
    }
    router.replace(ACCUEIL_PAR_ROLE[profil.role]);
  }, [router]);

  const centres = listerCentres();
  const mention = mentionEspace(ESPACE_ACTIF);

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    const fautes: Record<string, string> = {};
    if (!nom.trim()) fautes.nom = "Indiquez votre nom.";
    if (!prenoms.trim()) fautes.prenoms = "Indiquez vos prénoms.";
    if (!sexe) fautes.sexe = "Choisissez votre sexe.";
    if (!specialite) fautes.specialite = "Choisissez votre spécialité.";
    if (!centreId) fautes.centre = "Choisissez votre centre.";
    if (!matricule.trim()) fautes.matricule = "Indiquez votre numéro matricule.";
    if (!/^\d{6}$/.test(motDePasse)) {
      fautes.motDePasse = "Le mot de passe doit comporter 6 chiffres.";
    }
    if (confirmation !== motDePasse) {
      fautes.confirmation = "Les mots de passe ne correspondent pas.";
    }
    setErreurs(fautes);
    if (Object.keys(fautes).length > 0) return;

    if (trouverCompteInscrit(matricule.trim())) {
      setErreur("Ce numéro matricule est déjà utilisé.");
      return;
    }

    const profil = creerCompteCentre({
      nom: nom.trim(),
      prenoms: prenoms.trim(),
      sexe: sexe as "femme" | "homme",
      specialite,
      centreId,
      matricule: matricule.trim(),
      motDePasse,
    });
    setEnvoi(true);
    ouvrirSession(profil.id);
    router.replace(ACCUEIL_PAR_ROLE[profil.role]);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau de marque */}
      <aside className="fond-marque flex flex-col justify-between px-6 py-6 lg:sticky lg:top-0 lg:h-screen lg:px-14 lg:py-16">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/icon-512.png"
            alt=""
            width={44}
            height={44}
            priority
            className="rounded-[0.85rem] bg-white/95 p-1.5"
            style={{ width: 44, height: 44 }}
          />
          <span className="font-[family-name:var(--font-titre)] text-2xl text-white">
            S<span className="text-rose-400">ii</span>ra
          </span>
        </div>

        <div className="hidden lg:block lg:max-w-md">
          {mention ? (
            <p className="text-sm font-medium tracking-wide text-rose-300 uppercase">
              {mention}
            </p>
          ) : null}
          <h1 className="mt-3 text-3xl leading-tight text-white lg:text-[2.5rem]">
            Créer un compte
          </h1>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-rose-100/75">
            Rejoignez votre centre spécialisé pour recevoir les dossiers et suivre les soins.
          </p>
        </div>

        <p className="hidden text-xs leading-relaxed text-rose-100/50 lg:block">
          Siira ne pose pas de diagnostic.
        </p>
      </aside>

      {/* Formulaire */}
      <main className="flex items-start justify-center bg-sable-50 px-6 py-10 lg:items-center lg:py-16">
        <div className="w-full max-w-md">
          <h2 className="text-3xl lg:hidden">Créer un compte</h2>
          <p className="mt-2 text-prune-700">
            Remplissez ces informations pour créer votre compte.
          </p>

          <form onSubmit={soumettre} noValidate className="mt-6 flex flex-col gap-4">
            {erreur ? <MessageErreur titre="Inscription impossible" texte={erreur} /> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Champ
                label="Nom"
                type="text"
                autoComplete="family-name"
                obligatoire
                value={nom}
                erreur={erreurs.nom}
                onChange={(e) => setNom(e.target.value)}
              />
              <Champ
                label="Prénoms"
                type="text"
                autoComplete="given-name"
                obligatoire
                value={prenoms}
                erreur={erreurs.prenoms}
                onChange={(e) => setPrenoms(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Liste
                label="Sexe"
                obligatoire
                placeholder="Choisir"
                options={OPTIONS_SEXE}
                value={sexe}
                erreur={erreurs.sexe}
                onChange={(e) => setSexe(e.target.value)}
              />
              <Liste
                label="Spécialité"
                obligatoire
                placeholder="Choisir"
                options={SPECIALITES.map((s) => ({ valeur: s, libelle: s }))}
                value={specialite}
                erreur={erreurs.specialite}
                onChange={(e) => setSpecialite(e.target.value)}
              />
            </div>

            <Liste
              label="Centre"
              obligatoire
              placeholder="Choisir votre centre"
              options={centres.map((c) => ({ valeur: c.id, libelle: c.nom }))}
              value={centreId}
              erreur={erreurs.centre}
              onChange={(e) => setCentreId(e.target.value)}
            />

            <Champ
              label="Numéro matricule"
              type="text"
              autoComplete="username"
              obligatoire
              value={matricule}
              erreur={erreurs.matricule}
              onChange={(e) => setMatricule(e.target.value)}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Champ
                label="Mot de passe (6 chiffres)"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                obligatoire
                value={motDePasse}
                erreur={erreurs.motDePasse}
                onChange={(e) => setMotDePasse(e.target.value.replace(/\D/g, ""))}
              />
              <Champ
                label="Confirmation"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                obligatoire
                value={confirmation}
                erreur={erreurs.confirmation}
                onChange={(e) => setConfirmation(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <Bouton
              type="submit"
              taille="grand"
              chargement={envoi}
              className="w-full shadow-[var(--shadow-action)]"
            >
              Créer mon compte
            </Bouton>
          </form>

          <p className="mt-6 text-center text-sm">
            Déjà un compte ?{" "}
            <Link
              href="/connexion"
              className="inline-flex min-h-[var(--spacing-cible)] items-center px-2 font-medium text-rose-700 underline-offset-4 hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
