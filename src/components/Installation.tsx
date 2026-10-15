"use client";

import { useEffect, useState } from "react";
import { Bouton } from "./Bouton";
import { Carte } from "./Interface";

/** L'invitation d'installation fournie par le navigateur lui-même. */
interface Invitation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Proposer d'installer Siira sur le téléphone.
 *
 * C'est le navigateur qui décide si l'installation est possible : on ne montre
 * le bouton que lorsqu'il le propose, et on ne le repropose plus si la personne
 * a refusé ou si l'application est déjà installée. Sur iPhone, le navigateur
 * n'offre pas cette invitation : on indique alors la marche à suivre, sans
 * afficher un bouton qui n'existe pas.
 */
export function Installation() {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [installee, setInstallee] = useState(false);
  const [refusee, setRefusee] = useState(false);
  const [iphone, setIphone] = useState(false);

  useEffect(() => {
    const surInvitation = (evenement: Event) => {
      evenement.preventDefault();
      setInvitation(evenement as Invitation);
    };
    const surInstallation = () => {
      setInstallee(true);
      setInvitation(null);
    };

    window.addEventListener("beforeinstallprompt", surInvitation);
    window.addEventListener("appinstalled", surInstallation);

    /*
     * L'état du système (application déjà installée, iPhone) est lu après le
     * montage et non pendant le rendu : le rendu du serveur et le premier rendu
     * du navigateur restent ainsi identiques, sans écart d'hydratation.
     */
    const lecture = window.setTimeout(() => {
      if (window.matchMedia("(display-mode: standalone)").matches) setInstallee(true);
      setIphone(/iPad|iPhone|iPod/.test(navigator.userAgent));
    }, 0);

    return () => {
      window.clearTimeout(lecture);
      window.removeEventListener("beforeinstallprompt", surInvitation);
      window.removeEventListener("appinstalled", surInstallation);
    };
  }, []);

  if (installee || refusee) return null;

  async function installer() {
    if (!invitation) return;
    await invitation.prompt();
    const choix = await invitation.userChoice;
    if (choix.outcome === "accepted") setInstallee(true);
    else setRefusee(true);
    setInvitation(null);
  }

  if (invitation) {
    return (
      <Carte className="mt-6">
        <h2 className="text-lg">Installer Siira sur ce téléphone</h2>
        <p className="mt-1 text-sm text-sable-600">
          L’application s’ouvrira ensuite directement sur vos patientes, sans passer par le
          navigateur.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Bouton onClick={installer}>Installer</Bouton>
          <Bouton variante="second" onClick={() => setRefusee(true)}>
            Plus tard
          </Bouton>
        </div>
      </Carte>
    );
  }

  if (iphone) {
    return (
      <Carte className="mt-6">
        <h2 className="text-lg">Installer Siira sur ce téléphone</h2>
        <p className="mt-1 text-sm text-sable-600">
          Touchez « Partager » en bas de l’écran, puis « Sur l’écran d’accueil ».
        </p>
      </Carte>
    );
  }

  return null;
}
