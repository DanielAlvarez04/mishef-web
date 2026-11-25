/**
 * Tipos compartidos por el editor de tickets del superadmin.
 *
 * La API valida la plantilla con Zod; estos tipos describen el mismo contrato
 * para la UI.
 */

export type ReceiptAlign = "left" | "center"
export type ReceiptSize = "small" | "normal" | "large"

export interface ReceiptBlockBase {
  id: string
  /** El admin del negocio puede apagar el bloque completo. */
  enabled: boolean
}

export type ReceiptBlock =
  | (ReceiptBlockBase & {
      type: "business"
      showName: boolean
      showBranch: boolean
      showRfc: boolean
      showAddress: boolean
      align: ReceiptAlign
    })
  | (ReceiptBlockBase & {
      type: "ticket"
      showTicket: boolean
      showDate: boolean
      align: ReceiptAlign
    })
  | (ReceiptBlockBase & {
      type: "order"
      fields: Array<"place" | "partySize" | "customer">
      align: ReceiptAlign
    })
  | (ReceiptBlockBase & {
      type: "items"
      showVariant: boolean
      showQuantity: boolean
      showLineTotal: boolean
    })
  | (ReceiptBlockBase & {
      type: "totals"
      fields: Array<
        "subtotal" | "tax" | "discount" | "delivery" | "tip" | "total"
      >
    })
  | (ReceiptBlockBase & {
      type: "payments"
      showTitle: boolean
      showMethod: boolean
      showAmount: boolean
    })
  | (ReceiptBlockBase & { type: "tipSuggestions" })
  | (ReceiptBlockBase & {
      type: "meta"
      showTicketUid: boolean
      showServedBy: boolean
    })
  | (ReceiptBlockBase & {
      type: "text"
      text: string
      align: ReceiptAlign
      size: ReceiptSize
      bold: boolean
    })
  | (ReceiptBlockBase & { type: "divider" })

export interface ReceiptTemplate {
  version: 1 | 2 | 3 | 4 | 5 | 6
  printLogo: boolean
  blocks: ReceiptBlock[]
}

export interface ReceiptTerminal {
  id: string
  name: string | null
  isDefault: boolean
  model: string | null
}

export interface PlatformReceiptBranch {
  id: string
  name: string
  address: string | null
  phone: string | null
  receiptTemplate: ReceiptTemplate | null
  terminals: ReceiptTerminal[]
}

export interface PlatformReceiptOrganization {
  id: string
  name: string
  slug: string
  currency: string
  branches: PlatformReceiptBranch[]
}

export interface PlatformReceiptsData {
  globalTemplate: ReceiptTemplate
  /** Alias de compatibilidad; la plantilla global. */
  defaults: ReceiptTemplate
  organizations: PlatformReceiptOrganization[]
}

export interface OrganizationReceiptsData {
  globalTemplate: ReceiptTemplate
  defaults: ReceiptTemplate
  organization: PlatformReceiptOrganization
}

export interface ReceiptsEditorData {
  globalTemplate: ReceiptTemplate
  organizations: PlatformReceiptOrganization[]
}

export interface ReceiptPreviewResult {
  template: ReceiptTemplate
  content: string
  html: string
  warnings: string[]
  logoUrl: string | null
}

/** Escenario de la vista previa: cuenta de mesa o ticket pagado. */
export type ReceiptPreviewScenario = "table" | "paid"

export interface ReceiptTestResult {
  terminalId: string
  logo: { printed: boolean; error?: string } | null
  ticket: { actionId: string; status: string }
  warnings: string[]
}
