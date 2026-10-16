/**
 * Inscription d'un agent — route SERVEUR.
 *
 * Pourquoi passer par le serveur alors que `signUp` existe côté navigateur :
 * l'agent s'identifie par un matricule, donc son courriel est un identifiant
 * interne derrière lequel il n'y a AUCUNE boîte. Un `signUp` ordinaire tente
 * d'envoyer un courriel de confirmation à cette adresse qui n'existe pas, et
 * Supabase répond `over_email_send_rate_limit` au bout de quelques essais :
 * l'inscription marche en démonstration puis casse en série le jour J.
 *
 * La création par la clé de service avec `email_confirm` n'envoie rien, et
 * c'est le seul chemin fiable ici. Le profil, lui, naît du déclencheur
 * `profil_a_l_inscription` : cette route n'écrit jamais dans `profils`.
 */
import { NextResponse } from 'next/server';

import { clientDeService } from '@/lib/supabase/serveur';
import { courrielInterne } from '@/lib/supabase/identifiants';

/** Le code de l'agent : 6 chiffres exactement. */
const SIX_CHIFFRES = /^\d{6}$/;
const MATRICULE = /^[A-Z0-9][A-Z0-9-]{3,11}$/;

export async function POST(requete: Request) {
  let corps: Record<string, unknown>;
  try {
    corps = await requete.json();
  } catch {
    return NextResponse.json({ erreur: 'Requête illisible.' }, { status: 400 });
  }

  const matricule = String(corps.matricule ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  const motDePasse = String(corps.motDePasse ?? '');
  const nom = String(corps.nom ?? '').trim();

  // On revalide côté serveur : l'écran valide déjà, mais un appel direct ne
  // passe pas par l'écran.
  if (!MATRICULE.test(matricule)) {
    return NextResponse.json({ erreur: 'Matricule invalide.' }, { status: 400 });
  }
  if (!SIX_CHIFFRES.test(motDePasse)) {
    return NextResponse.json({ erreur: 'Le code doit faire 6 chiffres.' }, { status: 400 });
  }
  if (nom.length < 2) {
    return NextResponse.json({ erreur: 'Le nom est obligatoire.' }, { status: 400 });
  }

  // Le rôle n'est jamais pris dans la requête : un appel direct demanderait
  // « admin ». Le déclencheur s'en protège aussi, mais ne rien envoyer est
  // plus net que compter sur le filet.
  const role = corps.role === 'centre' ? 'centre' : 'agent';

  const client = clientDeService();

  /*
   * Un spécialiste est rattaché à un centre SPÉCIALISÉ, et la base l'exige
   * (contrainte `profils_centre_coherent`). On le vérifie ici pour deux
   * raisons : rendre un 400 lisible plutôt qu'un 500 de contrainte, et
   * refuser un rattachement à un CSPS — un spécialiste inscrit sur une
   * structure de base recevrait des dossiers qu'il ne peut pas traiter.
   */
  let centreId: string | null = null;
  if (role === 'centre') {
    centreId = String(corps.centre_id ?? '').trim() || null;
    if (!centreId) {
      return NextResponse.json({ erreur: 'Choisissez votre centre.' }, { status: 400 });
    }
    const { data: centre } = await client
      .from('centres')
      .select('id, type, actif')
      .eq('id', centreId)
      .maybeSingle();
    if (!centre || !centre.actif || centre.type !== 'specialise') {
      return NextResponse.json({ erreur: 'Ce centre n’est pas valide.' }, { status: 400 });
    }
  }

  const { data, error } = await client.auth.admin.createUser({
    email: courrielInterne(matricule),
    password: motDePasse,
    email_confirm: true, // aucune boîte derrière : rien à confirmer, rien à envoyer
    user_metadata: {
      nom,
      prenoms: String(corps.prenoms ?? '').trim(),
      statut: String(corps.statut ?? '').trim(),
      centre_sante: String(corps.centre_sante ?? '').trim(),
      matricule,
      role,
      // Propres au spécialiste. Le déclencheur les recopie dans le profil ;
      // `centre_id` est obligatoire côté base pour un rôle « centre ».
      sexe: String(corps.sexe ?? '').trim(),
      specialite: String(corps.specialite ?? '').trim(),
      centre_id: centreId,
    },
  });

  if (error) {
    const texte = error.message.toLowerCase();
    if (texte.includes('already') || texte.includes('exists') || texte.includes('registered')) {
      return NextResponse.json(
        { erreur: 'Ce matricule a déjà un compte. Connectez-vous.' },
        { status: 409 },
      );
    }
    // Le message brut de Supabase reste dans les journaux du serveur, pas sur
    // l'écran de l'agent.
    console.error('Inscription refusée :', error.message);
    return NextResponse.json({ erreur: 'La création du compte a échoué.' }, { status: 500 });
  }

  // Le déclencheur a créé le profil dans la même transaction : on le relit
  // pour que l'écran n'ait pas à le deviner.
  const { data: profil } = await client
    .from('profils')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profil) {
    // Le compte existe sans profil : il ne pourrait rien lire ni écrire.
    // Mieux vaut le retirer que laisser un compte inutilisable derrière soi.
    await client.auth.admin.deleteUser(data.user.id);
    console.error('Profil non créé par le déclencheur — migration 0003 appliquée ?');
    return NextResponse.json(
      { erreur: 'Le compte n’a pas pu être finalisé. Signalez-le à votre superviseur.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ profil }, { status: 201 });
}
