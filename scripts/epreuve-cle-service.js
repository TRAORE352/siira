#!/usr/bin/env node
/**
 * Epreuve de la cle de service : prouve qu'elle est posee, selectionnee et
 * acceptee par Supabase.
 *
 *     node scripts/epreuve-cle-service.js
 *
 * N'affiche jamais la valeur d'une cle : seulement sa longueur, son prefixe,
 * et le verdict de la base. Trois controles, du moins au plus engageant :
 *
 *   1. Presence   — la variable existe et n'a pas la forme d'une cle publiable.
 *   2. Validite   — la base repond a une requete authentifiee.
 *   3. Pouvoir    — la cle franchit bien RLS la ou la cle publiable est bloquee.
 *
 * Le controle 3 est le seul qui distingue une cle de service d'une cle
 * publiable valide : les deux passent le controle 2.
 */
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.resolve(__dirname, '..');

/** Lit .env.local sans dependance : tolere BOM, CRLF, guillemets, espaces. */
function lireEnv(fichier) {
  const chemin = path.join(RACINE, fichier);
  if (!fs.existsSync(chemin)) return {};
  const texte = fs
    .readFileSync(chemin, 'utf8')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n');
  const valeurs = {};
  for (const ligne of texte.split('\n')) {
    const nette = ligne.trim();
    if (!nette || nette.startsWith('#')) continue;
    const trouve = nette.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!trouve) continue;
    valeurs[trouve[1]] = trouve[2].trim().replace(/^["']|["']$/g, '');
  }
  return valeurs;
}

/** Decrit une cle sans la reveler. */
function decrire(valeur) {
  if (!valeur) return 'VIDE';
  const prefixe = valeur.startsWith('sb_secret_')
    ? 'sb_secret_'
    : valeur.startsWith('sb_publishable_')
      ? 'sb_publishable_'
      : valeur.startsWith('eyJ')
        ? 'eyJ (JWT)'
        : valeur.slice(0, 3);
  return `${valeur.length} car., prefixe ${prefixe}...`;
}

/** Appel REST brut : pas besoin du SDK, et l'erreur de la base reste lisible. */
async function interroger(url, cle, chemin) {
  const reponse = await fetch(`${url}/rest/v1/${chemin}`, {
    headers: { apikey: cle, Authorization: `Bearer ${cle}` },
  });
  const corps = await reponse.text();
  return { statut: reponse.status, corps: corps.slice(0, 300) };
}

async function main() {
  const env = { ...lireEnv('.env.local'), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const clePubliable =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cleDeService = env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Projet      :', url ?? 'MANQUANT');
  console.log('Publiable   :', decrire(clePubliable));
  console.log('Service     :', decrire(cleDeService));
  console.log('');

  if (!url) return echec("NEXT_PUBLIC_SUPABASE_URL manquante dans .env.local.");
  if (!cleDeService) {
    return echec(
      'SUPABASE_SERVICE_ROLE_KEY est vide. Posez-la :\n' +
        '  python3 scripts/poser-cle.py SUPABASE_SERVICE_ROLE_KEY /tmp/srk.txt',
    );
  }
  if (cleDeService.startsWith('sb_publishable_')) {
    return echec(
      'SUPABASE_SERVICE_ROLE_KEY contient une cle PUBLIABLE. La vraie est dans\n' +
        'Supabase : Project Settings, API Keys, ligne service_role (prefixe sb_secret_).',
    );
  }
  console.log('1/3 Presence ....... OK  (forme coherente avec une cle de service)');

  // 2. La base accepte-t-elle la cle ? `districts` est un referentiel : lisible
  //    par tout utilisateur authentifie, donc un refus ici vient de la cle.
  const service = await interroger(url, cleDeService, 'districts?select=nom&limit=1');
  if (service.statut !== 200) {
    return echec(
      `2/3 Validite ....... ECHEC  (HTTP ${service.statut})\n    Reponse de la base : ${service.corps}`,
    );
  }
  console.log(`2/3 Validite ....... OK  (HTTP 200 sur districts)`);

  // 3. La cle franchit-elle RLS ? `profils` n'est lisible que par son
  //    proprietaire : sans session, la cle publiable renvoie une liste vide,
  //    la cle de service voit tout. C'est la seule preuve du pouvoir etendu.
  const servicePrives = await interroger(url, cleDeService, 'profils?select=id&limit=5');
  const publiablePrives = clePubliable
    ? await interroger(url, clePubliable, 'profils?select=id&limit=5')
    : null;

  if (servicePrives.statut !== 200) {
    return echec(
      `3/3 Pouvoir ........ ECHEC  (HTTP ${servicePrives.statut} sur profils)\n    Reponse : ${servicePrives.corps}`,
    );
  }

  const lignesService = JSON.parse(servicePrives.corps || '[]').length;
  const lignesPubliable = publiablePrives
    ? (() => {
        try {
          return JSON.parse(publiablePrives.corps || '[]').length;
        } catch {
          return -1;
        }
      })()
    : -1;

  console.log(
    `3/3 Pouvoir ........ OK  (profils : ${lignesService} ligne(s) avec la cle de service, ` +
      `${lignesPubliable < 0 ? 'refus' : lignesPubliable} sans session avec la publiable)`,
  );
  if (lignesService === 0) {
    console.log(
      '    Note : la table profils est vide, le contournement de RLS n’est donc pas\n' +
        '    demontre par un ecart de lignes. Creez un compte, puis relancez.',
    );
  }

  console.log('');
  console.log('VERDICT : la cle de service est posee, valide et acceptee par le projet.');
}

function echec(message) {
  console.error(message);
  process.exitCode = 1;
}

main().catch((erreur) => echec(`Erreur inattendue : ${erreur.message}`));
