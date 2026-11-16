/** Cuota de almacenamiento de una organización (la calcula la API). */
export interface StorageUsage {
  /** Bytes ocupados en R2. */
  used: number
  /** Límite total, según las sucursales activas. */
  limit: number
  /** Sucursales activas; sin sucursales cuenta como una. */
  branches: number
  remaining: number
  /** 0–100. */
  percent: number
  /** Límite por sucursal (250 MB). */
  perBranch: number
}
