#!/usr/bin/env node
/**
 * Preuve du contournement RLS par la cle de service.
 *
 *     node scripts/epreuve-pouvoir-rls.js
 *
 * Le controle de validite (`epreuve-cle-service.js`) ne distingue PAS une cle
 * de service d'une cle publiable valide : les deux lisent les referentiels.
 * Seule une ECRITURE les separe. La politique `referentiels_admin` n'autorise
 * l'ecriture sur `districts` qu'a un compte de role admin ; sans session, la
 * cle publiable doit etre refusee, la cle de service doit passer outre.
 *
 * Le district d'essai est insere puis supprime : la base est rendue intacte.
 */
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.resolve(__dirname, '..');
const TEMOIN = `__essai_rls_${Date.now()}`;

function lireEnv() {
  const texte = fs
    .readFileSync(path.join(RACINE, '.env.local'), 'utf8')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n');
  const valeurs = {};
  for (const ligne of texte.split('\n')) {
    const trouve = ligne.trim().match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (trouve) valeurs[trouve[1]] = trouve[2].trim().replace(/^["']|["']$/g, '');
  }
  return valeurs;
}

async function appeler(url, cle, chemin, options = {}) {
  const reponse = await fetch(`${url}/rest/v1/${chemin}`, {
    method: options.methode ?? 'GET',
    headers: {
      apikey: cle,
      Authorization: `Bearer ${cle}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer ?? 'return=representation',
    },
    body: options.corps ? JSON.stringify(options.corps) : undefined,
  });
  return { statut: reponse.status, corps: (await reponse.text()).slice(0, 200) };
}

async function main() {
  const env = lireEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const publiable =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service || !publiable) {
    console.error('Configuration incomplete dans .env.local.');
    process.exitCode = 1;
    return;
  }

  const district = { nom: TEMOIN, latitude: 12.37, longitude: -1.52 };

  // A. La cle publiable, sans session, doit etre REFUSEE en ecriture.
  const refus = await appeler(url, publiable, 'districts', {
    methode: 'POST',
    corps: district,
  });
  const bienRefuse = refus.statut === 401 || refus.statut === 403;
  console.log(
    `A. Ecriture avec la cle publiable ... HTTP ${refus.statut}  ${bienRefuse ? 'REFUSEE (attendu)' : 'ANOMALIE : acceptee !'}`,
  );
  if (!bienRefuse) {
    console.error(
      '   La base a accepte une ecriture non authentifiee sur un referentiel.\n' +
        '   RLS est mal pose : verifiez que 0002_securite_et_fonctions.sql est bien applique.',
    );
    console.error(`   Reponse : ${refus.corps}`);
  }

  // B. La cle de service doit PASSER OUTRE la meme politique.
  const ecriture = await appeler(url, service, 'districts', {
    methode: 'POST',
    corps: district,
  });
  const passe = ecriture.statut === 201;
  console.log(
    `B. Ecriture avec la cle de service .. HTTP ${ecriture.statut}  ${passe ? 'ACCEPTEE (attendu)' : 'ECHEC'}`,
  );
  if (!passe) {
    console.error(`   Reponse : ${ecriture.corps}`);
    process.exitCode = 1;
    return;
  }

  // C. Nettoyage : la base doit rester telle qu'on l'a trouvee.
  const menage = await appeler(url, service, `districts?nom=eq.${TEMOIN}`, {
    methode: 'DELETE',
    prefer: 'return=minimal',
  });
  const reste = await appeler(url, service, `districts?nom=eq.${TEMOIN}&select=nom`);
  const propre = reste.corps.trim() === '[]';
  console.log(
    `C. Nettoyage du temoin ............. HTTP ${menage.statut}  ${propre ? 'base intacte' : 'ATTENTION : temoin restant'}`,
  );
  if (!propre) {
    console.error(`   Supprimez a la main le district nomme ${TEMOIN}.`);
    process.exitCode = 1;
    return;
  }

  console.log('');
  if (bienRefuse && passe && propre) {
    console.log(
      'VERDICT : la cle de service franchit RLS la ou la cle publiable est refusee.\n' +
        'Le pouvoir etendu est demontre, pas seulement la validite.',
    );
  } else {
    process.exitCode = 1;
  }
}

main().catch((erreur) => {
  console.error(`Erreur inattendue : ${erreur.message}`);
  process.exitCode = 1;
});
