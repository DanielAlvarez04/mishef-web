/**
 * Datos legales del responsable del tratamiento.
 *
 * Un solo lugar para que el aviso de privacidad, los términos y el
 * consentimiento del registro digan exactamente lo mismo.
 *
 * TODO(legal): confirmar la razón social exacta que aparece en la constancia
 * de situación fiscal. Aquí se usa el nombre comercial y el RFC, que son los
 * datos con los que opera hoy el negocio.
 */
export const LEGAL = {
  brand: "Mishef",
  entity: "Mishef",
  rfc: "AAUD941004CV0",
  address:
    "20 de Noviembre Mz. 9, Lt. 13, San Pedro Atzompa, Tecámac, Estado de México",
  email: "hola@mishef.co",
  website: "https://mishef.co",
  updatedAt: "16 de noviembre de 2026",
} as const;

/** Correo de contacto con asunto prellenado. */
export function legalMailto(subject: string) {
  return `mailto:${LEGAL.email}?subject=${encodeURIComponent(subject)}`;
}
