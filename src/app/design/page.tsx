"use client";

import { useState } from "react";
import { BadgeNiveau, BandeauNiveau } from "@/components/BadgeNiveau";
import { Bouton, BoutonLien } from "@/components/Bouton";
import { CaseACocher, Champ, ChoixUnique, Liste, ZoneTexte } from "@/components/Champs";
import {
  Carte,
  Chargement,
  EtatVide,
  Ligne,
  MentionPasDeDiagnostic,
  MessageErreur,
  MessageInfo,
  MessageSucces,
  Squelette,
  TitreSection,
} from "@/components/Interface";
import { Logo, Marque } from "@/components/Logo";

const COULEURS: { nom: string; jeton: string; hex: string; usage: string; contraste?: string }[] = [
  { nom: "Rose 600", jeton: "rose-600", hex: "#D6336C", usage: "Couleur principale, actions", contraste: "5,0 sur blanc" },
  { nom: "Rose 700", jeton: "rose-700", hex: "#B61F56", usage: "Survol, texte sur fond clair", contraste: "7,0 sur blanc" },
  { nom: "Rose 50", jeton: "rose-50", hex: "#FDF2F6", usage: "Fond d'un choix actif" },
  { nom: "Prune 900", jeton: "prune-900", hex: "#2A1A20", usage: "Texte principal", contraste: "15,3 sur sable 50" },
  { nom: "Prune 700", jeton: "prune-700", hex: "#44303B", usage: "Texte secondaire", contraste: "9,6" },
  { nom: "Sable 50", jeton: "sable-50", hex: "#FBFAF9", usage: "Fond de page" },
  { nom: "Sable 200", jeton: "sable-200", hex: "#E9E5E2", usage: "Separateurs" },
  { nom: "Sable 600", jeton: "sable-600", hex: "#5D5650", usage: "Texte d'aide", contraste: "7,2 sur blanc" },
];

const NIVEAUX: { nom: string; fond: string; bord: string; fort: string; texte: string }[] = [
  { nom: "Vert", fond: "#E8F4ED", bord: "#A9D4BD", fort: "#146B4A", texte: "#0E4E36" },
  { nom: "Orange", fond: "#FDF1E2", bord: "#EFC98F", fort: "#9A5B00", texte: "#6F4200" },
  { nom: "Rouge", fond: "#FBE9E9", bord: "#EDA9AC", fort: "#B3121B", texte: "#8A0E15" },
];

function Bloc({ titre, note, children }: { titre: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <TitreSection aide={note}>{titre}</TitreSection>
      {children}
    </section>
  );
}

export default function PageDesign() {
  const [texte, setTexte] = useState("");
  const [choix, setChoix] = useState<string | null>("ne_peut_pas");
  const [coche, setCoche] = useState(false);
  const [charge, setCharge] = useState(false);

  return (
    <div className="min-h-screen bg-sable-50">
      <header className="border-b border-sable-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Logo />
          <span className="text-sm text-sable-600">Systeme de design</span>
        </div>
      </header>

      <main id="contenu" className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-4xl sm:text-5xl">Systeme de design</h1>
        <p className="mt-3 max-w-2xl text-lg text-prune-700">
          Les jetons, les composants et les etats de Siira. Toute couleur affichee ici
          vient de la configuration, aucune n&apos;est ecrite dans un composant.
        </p>

        <div className="mt-12">
          <Bloc titre="Marque" note="Le logo fourni par l'equipe, detoure et decline.">
            <Carte className="flex flex-wrap items-center gap-10">
              <Logo taille="grand" lien={false} />
              <div className="flex items-center gap-4 rounded-[var(--radius-moyen)] bg-prune-900 p-5">
                <Marque taille={56} />
                <Marque taille={36} />
                <Marque taille={24} />
              </div>
            </Carte>
          </Bloc>

          <Bloc titre="Couleurs" note="Contrastes verifies pour le texte courant, minimum 4,5 pour 1.">
            <div className="grid gap-3 sm:grid-cols-2">
              {COULEURS.map((c) => (
                <div key={c.jeton} className="flex items-center gap-4 rounded-[var(--radius-moyen)] border border-sable-200 bg-white p-3">
                  <span
                    className="h-14 w-14 shrink-0 rounded-[var(--radius-petit)] border border-sable-300"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-prune-900">{c.nom}</span>
                    <span className="block text-sm text-sable-600">
                      {c.hex} / {c.usage}
                    </span>
                    {c.contraste ? (
                      <span className="block text-sm text-sable-500">Contraste {c.contraste}</span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          </Bloc>

          <Bloc
            titre="Niveaux d'urgence"
            note="La couleur n'est jamais seule : le mot accompagne toujours la pastille. Les trois couleurs different aussi par la luminosite."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {NIVEAUX.map((n) => (
                <div
                  key={n.nom}
                  className="rounded-[var(--radius-moyen)] border p-4"
                  style={{ backgroundColor: n.fond, borderColor: n.bord, color: n.texte }}
                >
                  <span className="flex items-center gap-2 text-lg font-medium">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: n.fort }} />
                    {n.nom}
                  </span>
                  <p className="mt-2 text-sm">Fond {n.fond}, trait {n.fort}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <BadgeNiveau niveau="vert" taille="petit" />
              <BadgeNiveau niveau="orange" />
              <BadgeNiveau niveau="rouge" taille="grand" />
            </div>
            <div className="mt-6">
              <BandeauNiveau niveau="rouge" delai="Voir un specialiste dans les 7 jours">
                <p className="mt-3 text-[0.95rem]">
                  Regles declenchees : une masse et un signe sur la peau du sein ; une masse
                  depuis 4 semaines ou plus chez une femme de 30 ans ou plus.
                </p>
              </BandeauNiveau>
            </div>
            <MentionPasDeDiagnostic className="mt-4" />
          </Bloc>

          <Bloc titre="Typographie" note="Fraunces pour les titres, Inter pour le texte. Deux familles, trois graisses.">
            <Carte>
              <p className="font-[family-name:var(--font-titre)] text-5xl">Siira, le chemin</p>
              <p className="mt-4 font-[family-name:var(--font-titre)] text-3xl">Nouvelle consultation</p>
              <p className="mt-4 text-xl font-medium">Resultat de l&apos;analyse</p>
              <p className="mt-3 max-w-prose">
                Texte courant, seize pixels, interligne genereuse. Les phrases restent
                courtes. On evite les mots techniques : l&apos;agent lit vite, souvent
                dehors, avec la patiente assise en face de lui.
              </p>
              <p className="mt-3 text-sm text-sable-600">
                Texte d&apos;aide, quatorze pixels, gris chaud lisible.
              </p>
            </Carte>
          </Bloc>

          <Bloc titre="Boutons" note="Hauteur minimale de 44 pixels, toujours un vrai element bouton.">
            <Carte className="flex flex-wrap items-center gap-3">
              <Bouton>Analyser le cas</Bouton>
              <Bouton variante="second">Je corrige</Bouton>
              <Bouton variante="discret">Voir les autres centres</Bouton>
              <Bouton variante="danger">Marquer absente</Bouton>
              <Bouton disabled>Inactif</Bouton>
              <Bouton chargement>Analyse en cours</Bouton>
              <BoutonLien href="#" variante="second">
                Lien d&apos;action
              </BoutonLien>
            </Carte>
            <div className="mt-3">
              <Bouton taille="grand">Envoyer le dossier</Bouton>
            </div>
          </Bloc>

          <Bloc titre="Champs" note="Un libelle visible, une aide avant le champ, une erreur sous le champ.">
            <Carte className="grid gap-5 sm:grid-cols-2">
              <Champ label="Nom de la patiente" obligatoire placeholder="Awa Sawadogo" />
              <Champ
                label="Age"
                obligatoire
                type="number"
                inputMode="numeric"
                aide="Entre 15 et 100 ans"
                defaultValue={41}
              />
              <Champ
                label="Telephone"
                type="tel"
                inputMode="numeric"
                aide="8 chiffres"
                erreur="Le numero doit contenir 8 chiffres"
                defaultValue="7012"
              />
              <Liste
                label="District"
                obligatoire
                placeholder="Choisir un district"
                options={[
                  { valeur: "saaba", libelle: "Saaba" },
                  { valeur: "ziniare", libelle: "Ziniare" },
                  { valeur: "koubri", libelle: "Koubri" },
                ]}
              />
              <div className="sm:col-span-2">
                <ZoneTexte
                  label="Ce que ressent la patiente"
                  obligatoire
                  aide="Ecrivez avec vos mots. Vous pouvez aussi dicter."
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  compteur={{ actuel: texte.length, max: 2000 }}
                  placeholder="Elle a une boule au sein gauche depuis deux mois..."
                />
              </div>
              <div className="sm:col-span-2">
                <ChoixUnique
                  legende="Que peut payer la patiente ?"
                  nom="paiement"
                  valeur={choix}
                  onChange={setChoix}
                  options={[
                    { valeur: "peut_payer", libelle: "Elle peut payer", detail: "Aucune demande de financement" },
                    { valeur: "partielle", libelle: "Elle peut payer en partie", detail: "La moitie est demandee aux ONG" },
                    { valeur: "ne_peut_pas", libelle: "Elle ne peut pas payer", detail: "Tout est demande aux ONG" },
                  ]}
                />
              </div>
              <div className="sm:col-span-2">
                <CaseACocher
                  checked={coche}
                  onChange={setCoche}
                  label="La patiente accepte que ses informations soient enregistrees et transmises au centre de soins."
                />
              </div>
            </Carte>
          </Bloc>

          <Bloc titre="Fiches en lecture" note="Couple libelle et valeur, aligne, sans tableau.">
            <Carte>
              <dl>
                <Ligne libelle="Sein concerne">Gauche</Ligne>
                <Ligne libelle="Masse">Oui</Ligne>
                <Ligne libelle="Depuis">8 semaines</Ligne>
                <Ligne libelle="Peau">Retraction</Ligne>
                <Ligne libelle="Ganglion sous l&apos;aisselle">Non precise</Ligne>
              </dl>
            </Carte>
          </Bloc>

          <Bloc titre="Messages" note="Jamais de code technique visible par l'utilisateur.">
            <div className="grid gap-3">
              <MessageSucces>Le dossier a ete envoye au CHU de Bogodogo.</MessageSucces>
              <MessageInfo titre="Financement">
                La demande est partie a 2 ONG. Vous serez prevenu des qu&apos;une repond.
              </MessageInfo>
              <MessageErreur
                texte="L'analyse prend trop de temps. Vous pouvez remplir la fiche a la main."
                action={<Bouton variante="second">Remplir a la main</Bouton>}
              />
            </div>
          </Bloc>

          <Bloc titre="Chargement et etats vides">
            <div className="grid gap-4">
              <Carte>
                <Chargement texte="Analyse du recit en cours" />
                <div className="mt-4">
                  <Squelette lignes={2} />
                </div>
              </Carte>
              <EtatVide
                titre="Aucune patiente pour le moment"
                texte="Vos consultations apparaitront ici. Commencez par enregistrer une premiere patiente."
                action={<Bouton onClick={() => setCharge(!charge)}>Nouvelle consultation</Bouton>}
              />
            </div>
          </Bloc>
        </div>
      </main>
    </div>
  );
}
