/** Cuota de almacenamiento de una organización (la calcula la API). */
export interface StorageUsage {
  /** Bytes ocupados en R2. */
  used: number
  /** Límite total del plan; `null` = sin límite. */
  limit: number | null
  /** Sucursales activas; sin sucursales cuenta como una. */
  branches: number
  remaining: number | null
  /** 0–100; `null` si no hay límite. */
  percent: number | null
  /** Límite por sucursal (250 MB) cuando el plan no define otro. */
  perBranch: number
}
