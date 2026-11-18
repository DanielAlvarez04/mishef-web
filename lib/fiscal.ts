/** Datos fiscales del negocio para CFDI (fase 0, sin timbrado). */

export interface FiscalProfile {
  id: string
  organizationId: string
  rfc: string
  legalName: string
  taxRegime: string
  zipCode: string
  cfdiUse: string
  email: string | null
  createdAt: string
  updatedAt: string
}

export const TAX_REGIME_OPTIONS = [
  { value: "601", label: "601 · General de Ley Personas Morales" },
  { value: "603", label: "603 · Personas Morales con Fines no Lucrativos" },
  { value: "605", label: "605 · Sueldos y Salarios" },
  { value: "606", label: "606 · Arrendamiento" },
  { value: "607", label: "607 · Enajenación o Adquisición de Bienes" },
  { value: "608", label: "608 · Demás ingresos" },
  { value: "612", label: "612 · Actividades Empresariales y Profesionales" },
  { value: "614", label: "614 · Ingresos por intereses" },
  { value: "616", label: "616 · Sin obligaciones fiscales" },
  { value: "621", label: "621 · Incorporación Fiscal" },
  { value: "626", label: "626 · Régimen Simplificado de Confianza (RESICO)" },
] as const

export const CFDI_USE_OPTIONS = [
  { value: "G03", label: "G03 · Gastos en general" },
  { value: "G01", label: "G01 · Adquisición de mercancías" },
  { value: "I08", label: "I08 · Otra maquinaria y equipo" },
  { value: "D01", label: "D01 · Honorarios médicos y gastos hospitalarios" },
  { value: "P01", label: "P01 · Por definir" },
  { value: "S01", label: "S01 · Sin efectos fiscales" },
  { value: "CP01", label: "CP01 · Pagos" },
] as const

/** RFC mexicano: 3 o 4 letras, fecha y homoclave. */
export const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/

export function normalizeRfc(value: string): string {
  return value.trim().toUpperCase()
}
