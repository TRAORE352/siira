/**
 * Inscription et connexion réelles, par Supabase Auth.
 *
 * L'agent s'identifie par son MATRICULE et un code à 6 chiffres. Auth exige un
 * identifiant de type courriel : on en fabrique un, interne, déterministe, et
 * jamais montré à l'agent — le matricule reste la seule chose qu'il tape.
 *
 * Le code à 6 chiffres est court pour un mot de passe, parce que l'agent le
 * saisit au doigt sur un téléphone, souvent dehors. Ce qui le protège n'est
 * donc pas sa longueur mais la limite de tentatives de Supabase Auth, et le
 * fait qu'un matricule ne se devine pas. Ne pas abaisser le minimum de 6.
 */
'use client';

import type { Profil } from '../types';

import { courrielInterne } from './identifiants';
import { clientNavigateur } from './navigateur';

export { courrielInterne, estCourrielInterne } from './identifiants';

/** Ce qu'une inscription d'agent envoie à Auth. */
export interface InscriptionReelle {
  nom: string;
  prenoms?: string;
  statut?: string;
  centre_sante?: string;
  matricule: string;
  motDePasse: string;
  role?: 'agent' | 'centre';
}

/** Échec d'authentification, avec un message que l'agent peut comprendre. */
export class AuthRefusee extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthRefusee';
  }
}

/**
 * Traduit les erreurs de Supabase en langage d'agent. Un message technique
 * sur un écran de terrain n'aide personne, et « Invalid login credentials »
 * ne dit pas s'il faut corriger le matricule ou le code.
 */
function messageLisible(brut: string): string {
  const texte = brut.toLowerCase();
  if (texte.includes('already registered') || texte.includes('already exists')) {
    return 'Ce matricule a déjà un compte. Connectez-vous, ou demandez de l’aide à votre superviseur.';
  }
  if (texte.includes('invalid login credentials')) {
    return 'Matricule ou code incorrect. Vérifiez votre matricule, puis réessayez.';
  }
  if (texte.includes('password') && texte.includes('6')) {
    return 'Le code doit faire 6 chiffres.';
  }
  if (texte.includes('rate limit') || texte.includes('too many')) {
    return 'Trop de tentatives. Attendez une minute, puis réessayez.';
  }
  if (texte.includes('fetch') || texte.includes('network')) {
    return 'Pas de connexion. Vérifiez votre réseau, puis réessayez.';
  }
  return 'La connexion a échoué. Réessayez dans un instant.';
}

/** Vrai si le matricule n'a pas encore de compte. */
export async function matriculeEstLibre(matricule: string): Promise<boolean> {
  const { data, error } = await clientNavigateur().rpc('matricule_est_libre', {
    matricule_demande: matricule,
  });
  // En cas de doute on laisse passer : l'index unique de la base tranchera,
  // et bloquer une inscription sur une panne réseau serait pire.
  if (error) return true;
  return data === true;
}

/**
 * Crée le compte, par la route serveur `/api/inscription`.
 *
 * Pourquoi pas `signUp` directement : derrière un identifiant interne il n'y a
 * aucune boîte, et `signUp` tente d'y envoyer une confirmation — Supabase
 * répond alors `over_email_send_rate_limit` au bout de quelques essais. La
 * route serveur crée le compte avec la clé de service, sans aucun envoi.
 *
 * Le profil, lui, naît du déclencheur `profil_a_l_inscription` côté base :
 * ni l'écran ni la route n'écrivent jamais dans `profils`.
 */
export async function inscrire(donnees: InscriptionReelle): Promise<Profil> {
  let reponse: Response;
  try {
    reponse = await fetch('/api/inscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    });
  } catch {
    throw new AuthRefusee('Pas de connexion. Vérifiez votre réseau, puis réessayez.');
  }

  const charge = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    throw new AuthRefusee(charge.erreur ?? 'La création du compte a échoué.');
  }

  // Le compte existe ; on ouvre tout de suite la session pour que l'agent
  // entre dans son espace sans ressaisir son code.
  await connecter(donnees.matricule, donnees.motDePasse);
  return charge.profil as Profil;
}

/** Connecte par matricule et code. */
export async function connecter(matricule: string, motDePasse: string): Promise<Profil> {
  const { error } = await clientNavigateur().auth.signInWithPassword({
    email: courrielInterne(matricule),
    password: motDePasse,
  });
  if (error) throw new AuthRefusee(messageLisible(error.message));
  return await lireMonProfil();
}

/** Ferme la session. */
export async function deconnecter(): Promise<void> {
  await clientNavigateur().auth.signOut();
}

/**
 * Lit le profil de l'utilisateur connecté.
 *
 * Le déclencheur crée le profil dans la même transaction que le compte, mais
 * la lecture qui suit immédiatement l'inscription peut arriver avant que la
 * session soit posée : on réessaie brièvement plutôt que d'échouer sur une
 * course que l'agent ne comprendrait pas.
 */
export async function lireMonProfil(): Promise<Profil> {
  const client = clientNavigateur();
  for (let essai = 0; essai < 3; essai += 1) {
    const { data: utilisateur } = await client.auth.getUser();
    if (utilisateur.user) {
      const { data: profil } = await client
        .from('profils')
        .select('*')
        .eq('id', utilisateur.user.id)
        .maybeSingle();
      if (profil) return profil as Profil;
    }
    await new Promise((suite) => setTimeout(suite, 150 * (essai + 1)));
  }
  throw new AuthRefusee(
    'Votre compte est créé mais son profil est introuvable. Signalez-le à votre superviseur.',
  );
}

/** Profil courant, ou null si personne n'est connecté. */
export async function profilCourant(): Promise<Profil | null> {
  try {
    const { data } = await clientNavigateur().auth.getSession();
    if (!data.session) return null;
    return await lireMonProfil();
  } catch {
    return null;
  }
}
