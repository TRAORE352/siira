import { LIBELLE_NIVEAU } from "@/lib/libelles";

const CLASSES: Record<string, string> = {
  rouge: "bg-niveau-rouge-fond text-niveau-rouge-texte",
  orange: "bg-niveau-orange-fond text-niveau-orange-texte",
  vert: "bg-niveau-vert-fond text-niveau-vert-texte",
};

/** Badge de niveau d'urgence (couleur ET mot, exigence d'accessibilité 12). */
export default function NiveauBadge({ niveau }: { niveau: string | null }) {
  if (!niveau) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        CLASSES[niveau] ?? "bg-rose-clair text-texte-secondaire"
      }`}
    >
      {LIBELLE_NIVEAU[niveau] ?? niveau}
    </span>
  );
}
