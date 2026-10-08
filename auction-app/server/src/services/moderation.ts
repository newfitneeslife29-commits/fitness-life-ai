// Automatic first-pass moderation (guide §17). Anything matched is rejected with
// a reason; borderline categories would go to a human review queue.

const PROHIBITED: Array<[RegExp, string]> = [
  [/\b(pistola|rev[oó]lver|rifle|escopeta|munici[oó]n|arma de fuego)\b/i, 'Armas y munición'],
  [/\b(r[eé]plica|imitaci[oó]n|fake|falsificad[oa])\b/i, 'Falsificaciones o réplicas'],
  [/\b(medicamento|receta m[eé]dica|opi[aá]ceo|esteroides?)\b/i, 'Medicamentos'],
  [/\b(marfil|caparaz[oó]n de tortuga|cuerno de rinoceronte)\b/i, 'Especies protegidas'],
  [/\b(droga|coca[ií]na|marihuana)\b/i, 'Drogas'],
];

/** Contact details push deals outside the platform, where there is no protection. */
const CONTACT = /(\b[\w.+-]+@[\w-]+\.[\w.]+\b)|(\+?\d[\d\s-]{8,}\d)|(whats\s?app)/i;

export function moderateListing(title: string, description: string): string | null {
  const text = `${title}\n${description}`;
  for (const [pattern, reason] of PROHIBITED) {
    if (pattern.test(text)) return `Artículo no permitido: ${reason}`;
  }
  if (CONTACT.test(text)) return 'No incluyas datos de contacto en el anuncio; usa las preguntas de la plataforma';
  return null;
}

export function containsContactDetails(text: string): boolean {
  return CONTACT.test(text);
}
