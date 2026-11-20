/** Tipos de la integración con Mercado Pago Point (respuesta de la API). */

export interface MercadoPagoConnection {
  mpUserId: string
  /** Correo de la cuenta autorizada, si Mercado Pago lo expone. */
  mpEmail: string | null
  /** Apodo de la cuenta autorizada, si Mercado Pago lo expone. */
  mpNickname: string | null
  status: string
  expiresAt: string
  connectedAt: string
  lastRefreshedAt: string | null
  terminalsSyncedAt: string | null
  needsReconnect: boolean
}

export type MercadoPagoTerminalModel = "SMART_1" | "SMART_2" | "AIR_2"

export interface MercadoPagoTerminal {
  id: string
  terminalId: string
  name: string | null
  branchId: string | null
  operatingMode: string | null
  model: MercadoPagoTerminalModel | null
  storeId: string | null
  posId: string | null
  externalPosId: string | null
  isDefault: boolean
  isActive: boolean
  lastSyncedAt: string | null
}

export interface MercadoPagoStatus {
  configured: boolean
  connected: boolean
  connection: MercadoPagoConnection | null
  terminals: MercadoPagoTerminal[]
}

/** Configuración mínima que el POS necesita para cobrar en terminal o link. */
export interface MercadoPagoPointConfig {
  enabled: boolean
  /** La cuenta está conectada y puede generar links de Checkout Pro. */
  linkEnabled: boolean
  terminals: Array<{
    id: string
    name: string | null
    branchId: string | null
    isDefault: boolean
    model: MercadoPagoTerminalModel | null
    operatingMode: string | null
    /** `null` = modelo sin configurar; no se puede prometer propina. */
    supportsTips: boolean | null
  }>
}

export const MERCADO_PAGO_OPERATING_MODES: Record<string, string> = {
  PDV: "Punto de venta (PDV)",
  SELF_SERVICE: "Autoservicio",
  STANDALONE: "Independiente",
  UNDEFINED: "Modo desconocido",
}

export const MERCADO_PAGO_TERMINAL_MODELS: Record<
  MercadoPagoTerminalModel,
  string
> = {
  SMART_1: "Point Smart 1",
  SMART_2: "Point Smart 2",
  AIR_2: "Point Air 2",
}

export const MERCADO_PAGO_TERMINAL_MODEL_OPTIONS = [
  { value: "none", label: "Sin especificar" },
  ...Object.entries(MERCADO_PAGO_TERMINAL_MODELS).map(([value, label]) => ({
    value,
    label,
  })),
]

/** Compatibilidad de propina según el modelo elegido por el negocio. */
export function supportsTerminalTips(
  model: string | null | undefined
): boolean | null {
  if (model === "SMART_2") return true
  if (model === "SMART_1" || model === "AIR_2") return false

  return null
}

/** Air 2 solo opera en autoservicio; no se ofrece en el POS asistido. */
export function isPdvTerminal(terminal: {
  model: string | null
  operatingMode: string | null
}): boolean {
  return terminal.operatingMode === "PDV" && terminal.model !== "AIR_2"
}
