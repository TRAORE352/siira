/**
 * Chargement des données RÉELLES dans l'état de l'application.
 *
 * Pourquoi ce module existe, et pourquoi il ne réécrit pas les 18 fonctions de
 * lecture : tous les écrans lisent l'état local (`lireEtat`), qui était rempli
 * par la démonstration. Un compte réel se connectait donc correctement puis
 * trouvait des listes vides — « 0 patiente » pour un agent qui en a trois.
 *
 * Deux approches étaient possibles. Réécrire chaque fonction de lecture en
 * asynchrone touchait 18 fonctions et 21 écrans, avec un état de chargement à
 * gérer partout. Remplir l'état local depuis Supabase À L'OUVERTURE DE SESSION
 * ne touche rien : les écrans continuent de lire ce qu'ils lisaient, et c'est
 * la source qui change. C'est la seconde qui est retenue.
 *
 * Conséquence assumée : les données sont celles du moment de la connexion. Un
 * dossier créé par le centre pendant que l'agent est connecté n'apparaît chez
 * lui qu'à la prochaine ouverture. Pour une démonstration de quatre minutes,
 * et vu ce que coûterait le temps réel, c'est le bon compromis — et `rafraichir`
 * permet de le forcer.
 *
 * RLS fait le tri : l'agent ne reçoit que SES patientes, le centre que les
 * dossiers orientés vers LUI. Ce module ne filtre rien lui-même, il ne
 * saurait pas le faire mieux que la base.
 */
import { clientNavigateur } from "./navigateur";
import { supabaseEstConfigure } from "./environnement";
import { remplacerEtat } from "../data/magasin";
import type {
  Centre,
  Consultation,
  Creneau,
  District,
  Orientation,
  Patiente,
  Suivi,
  Tarif,
} from "../types";

/** Vrai si des données réelles ont été chargées au moins une fois. */
let chargeUneFois = false;

export function donneesReellesChargees(): boolean {
  return chargeUneFois;
}

/**
 * Charge dans l'état local tout ce que le compte connecté a le droit de voir.
 *
 * Ne lève pas : un échec de réseau doit laisser l'application utilisable avec
 * la démonstration plutôt que bloquer l'écran sur une erreur. Le retour dit si
 * le chargement a réussi, pour que l'appelant puisse le signaler.
 */
export async function chargerDonneesReelles(): Promise<boolean> {
  if (!supabaseEstConfigure()) return false;

  try {
    const bd = clientNavigateur();

    /*
     * Une seule salve : ces tables ne dépendent pas les unes des autres pour
     * être lues, et les enchaîner multiplierait l'attente sur un réseau lent —
     * celui du terrain.
     */
    const [patientes, consultations, orientations, suivis, creneaux, tarifs, districts, centres] =
      await Promise.all([
        bd.from("patientes").select("*").order("cree_le", { ascending: false }),
        bd.from("consultations").select("*").order("cree_le", { ascending: false }),
        bd.from("orientations").select("*").order("cree_le", { ascending: false }),
        bd.from("suivis").select("*").order("cree_le", { ascending: true }),
        bd.from("creneaux").select("*").order("debut", { ascending: true }),
        bd.from("tarifs").select("*"),
        /* Les referentiels aussi : une patiente reelle porte l'UUID de son
           district, introuvable dans la demonstration. Sans eux, l'ecran
           affiche « District non precise » sur des dossiers pourtant complets,
           et l'orientation ne peut pas calculer de distance. */
        bd.from("districts").select("*").order("nom"),
        bd.from("centres").select("*").order("nom"),
      ]);

    /*
     * Une erreur sur la table des patientes est bloquante : sans elle il n'y a
     * rien à montrer. Sur les autres, on continue avec ce qu'on a — un écran
     * partiel vaut mieux qu'un écran vide.
     */
    if (patientes.error) {
      console.error("Chargement des patientes refusé :", patientes.error.message);
      return false;
    }

    remplacerEtat((e) => ({
      ...e,
      patientes: (patientes.data ?? []) as Patiente[],
      consultations: (consultations.data ?? []) as Consultation[],
      orientations: (orientations.data ?? []) as Orientation[],
      suivis: (suivis.data ?? []) as Suivi[],
      creneaux: (creneaux.data ?? []) as Creneau[],
      tarifs: (tarifs.data ?? []) as Tarif[],
      /* On ne remplace les referentiels que s'ils sont peuples : sinon on
         priverait la demonstration des siens sans rien mettre a la place. */
      districts: districts.data?.length ? (districts.data as District[]) : e.districts,
      centres: centres.data?.length ? (centres.data as Centre[]) : e.centres,
    }));

    chargeUneFois = true;
    return true;
  } catch (e) {
    console.error("Chargement des données réelles impossible :", e);
    return false;
  }
}

/** Recharge depuis la base. Même chose, nommée pour ce qu'elle sert. */
export const rafraichirDonneesReelles = chargerDonneesReelles;
