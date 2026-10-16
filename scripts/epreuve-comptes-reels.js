#!/usr/bin/env node
/**
 * Epreuve des comptes reels : prouve qu'une inscription cree un compte Auth
 * ET son profil, et que les politiques RLS s'appliquent a ce compte.
 *
 *     node scripts/epreuve-comptes-reels.js
 *
 * Cree un agent d'essai, verifie son profil, verifie qu'il ne voit que le
 * sien, puis SUPPRIME le compte (la cascade emporte le profil). La base est
 * rendue intacte. Aucun mot de passe n'est affiche.
 */
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.resolve(__dirname, '..');
const MARQUE = Date.now().toString().slice(-7);
const MATRICULE = `ZZ${MARQUE}`;
// Mot de passe d'essai, jete a la fin du script : il n'ouvre rien de reel.
const CODE = String(MARQUE).padStart(6, '0').slice(0, 6);

function lireEnv() {
  const texte = fs
    .readFileSync(path.join(RACINE, '.env.local'), 'utf8')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n');
  const valeurs = {};
  for (const ligne of texte.split('\n')) {
    const t = ligne.trim().match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (t) valeurs[t[1]] = t[2].trim().replace(/^["']|["']$/g, '');
  }
  return valeurs;
}

const env = lireEnv();
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLIABLE = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

async function appel(chemin, { cle = PUBLIABLE, methode = 'GET', corps, jeton } = {}) {
  const reponse = await fetch(`${URL_BASE}${chemin}`, {
    method: methode,
    headers: {
      apikey: cle,
      Authorization: `Bearer ${jeton ?? cle}`,
      'Content-Type': 'application/json',
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const brut = await reponse.text();
  let json = null;
  try {
    json = JSON.parse(brut);
  } catch {
    /* corps vide ou non-JSON : le statut suffit */
  }
  return { statut: reponse.status, json, brut: brut.slice(0, 200) };
}

function courrielInterne(matricule) {
  return `${matricule.toUpperCase().replace(/[^A-Z0-9]/g, '').toLowerCase()}@agents.siira.local`;
}

let echoue = false;
function dire(libelle, ok, detail = '') {
  if (!ok) echoue = true;
  console.log(`${ok ? 'OK  ' : 'ECHEC'} ${libelle}${detail ? `  — ${detail}` : ''}`);
}

async function main() {
  if (!URL_BASE || !PUBLIABLE || !SERVICE) {
    console.error('Configuration incomplete dans .env.local.');
    process.exitCode = 1;
    return;
  }

  // 0. Le declencheur est-il pose ? Sans lui, rien de ce qui suit ne marche.
  const libre = await appel('/rest/v1/rpc/matricule_est_libre', {
    methode: 'POST',
    corps: { matricule_demande: MATRICULE },
  });
  if (libre.statut === 404 || libre.json?.code === 'PGRST202') {
    console.error(
      "ARRET : la fonction matricule_est_libre n'existe pas.\n" +
        'La migration 0003 n’est pas appliquee. Collez supabase/a-coller-comptes.sql\n' +
        'dans le SQL Editor de Supabase, puis relancez cette epreuve.',
    );
    process.exitCode = 1;
    return;
  }
  dire('0. Migration 0003 appliquee', libre.statut === 200, `matricule libre : ${libre.json}`);
  if (echoue) {
    process.exitCode = 1;
    return;
  }

  // 1. Inscription par l'API publique : exactement ce que fait le navigateur.
  const inscription = await appel('/auth/v1/signup', {
    methode: 'POST',
    corps: {
      email: courrielInterne(MATRICULE),
      password: CODE,
      data: {
        nom: 'ESSAI',
        prenoms: 'Automatique',
        statut: 'infirmier_etat',
        centre_sante: 'CSPS d’essai',
        matricule: MATRICULE,
        role: 'agent',
      },
    },
  });
  const identifiant = inscription.json?.user?.id ?? inscription.json?.id;
  dire('1. Inscription acceptee par Auth', Boolean(identifiant), `HTTP ${inscription.statut}`);
  if (!identifiant) {
    console.error(`   Reponse : ${inscription.brut}`);
    process.exitCode = 1;
    return;
  }

  const jeton = inscription.json?.access_token;

  try {
    // 2. Le declencheur a-t-il cree le profil ? C'est LE point qui manquait.
    const profil = await appel(`/rest/v1/profils?id=eq.${identifiant}&select=*`, { cle: SERVICE });
    const trouve = Array.isArray(profil.json) ? profil.json[0] : null;
    dire('2. Profil cree par le declencheur', Boolean(trouve));
    if (trouve) {
      dire('3. Matricule conserve', trouve.matricule === MATRICULE, trouve.matricule);
      dire('4. Role « agent »', trouve.role === 'agent', trouve.role);
      dire(
        '5. Courriel interne non recopie',
        trouve.email === null,
        `email = ${JSON.stringify(trouve.email)}`,
      );
    }

    // 3. Le compte connecte voit-il son profil, et RIEN d'autre ?
    if (jeton) {
      const vuDeLui = await appel('/rest/v1/profils?select=id,matricule', { jeton });
      const lignes = Array.isArray(vuDeLui.json) ? vuDeLui.json : [];
      dire(
        '6. Il voit son profil',
        lignes.length === 1 && lignes[0].id === identifiant,
        `${lignes.length} ligne(s) visible(s)`,
      );
    } else {
      console.log('     (pas de jeton de session : confirmation de courriel active ?)');
    }

    // 4. L'escalade de role est-elle bloquee ? Un client peut ecrire ce qu'il
    //    veut dans ses metadonnees : « admin » doit retomber sur « agent ».
    const pirate = `ZY${MARQUE}`;
    const tentative = await appel('/auth/v1/signup', {
      methode: 'POST',
      corps: {
        email: courrielInterne(pirate),
        password: CODE,
        data: { nom: 'ESSAI', matricule: pirate, role: 'admin' },
      },
    });
    const idPirate = tentative.json?.user?.id ?? tentative.json?.id;
    if (idPirate) {
      const sonProfil = await appel(`/rest/v1/profils?id=eq.${idPirate}&select=role`, {
        cle: SERVICE,
      });
      const role = Array.isArray(sonProfil.json) ? sonProfil.json[0]?.role : null;
      dire('7. « admin » auto-attribue refuse', role === 'agent', `role obtenu : ${role}`);
      await appel(`/auth/v1/admin/users/${idPirate}`, { cle: SERVICE, methode: 'DELETE' });
    }
  } finally {
    // 5. Menage : la cascade sur auth.users emporte le profil.
    const menage = await appel(`/auth/v1/admin/users/${identifiant}`, {
      cle: SERVICE,
      methode: 'DELETE',
    });
    const reste = await appel(`/rest/v1/profils?id=eq.${identifiant}&select=id`, { cle: SERVICE });
    const vide = Array.isArray(reste.json) && reste.json.length === 0;
    dire('8. Compte et profil supprimes', menage.statut < 300 && vide, 'base intacte');
  }

  console.log('');
  if (echoue) {
    console.log('VERDICT : les comptes reels ne fonctionnent PAS encore.');
    process.exitCode = 1;
  } else {
    console.log(
      'VERDICT : un agent peut creer un compte reel. Compte Auth et profil naissent\n' +
        'ensemble, RLS limite chacun a son profil, et « admin » ne s’auto-attribue pas.',
    );
  }
}

main().catch((erreur) => {
  console.error(`Erreur inattendue : ${erreur.message}`);
  process.exitCode = 1;
});
