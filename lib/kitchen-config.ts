/** Tipos compartidos de la configuración de cocina (modo General / Avanzado). */

export type KitchenMode = "GENERAL" | "ADVANCED"

export type KitchenStationType =
  | "GARDE_MANGER"
  | "ENTREMETIER"
  | "SAUCIER"
  | "GRILL"
  | "FRY"
  | "FISH"
  | "PASTRY"
  | "BUTCHERY"
  | "EXPO"
  | "CUSTOM"

export type KitchenPositionLevel =
  | "MANAGEMENT"
  | "CHEF_DE_PARTIE"
  | "COOK"
  | "ASSISTANT"
  | "EXPO"

export interface KitchenStation {
  id: string
  organizationId: string
  branchId: string | null
  name: string
  code: string
  type: KitchenStationType
  color: string | null
  sortOrder: number
  /** Minutos objetivo de preparación; `null` = usa el estimado de la ronda. */
  slaMinutes: number | null
  isActive: boolean
}

export interface KitchenPosition {
  id: string
  name: string
  code: string
  level: KitchenPositionLevel
  permissions: string[]
  isSystemPreset: boolean
  isActive: boolean
}

export interface KitchenMember {
  id: string
  username: string | null
  name: string | null
  email: string | null
  roles: string[]
  kitchenPositionId: string | null
  stationIds: string[]
}

export interface KitchenCourse {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface KitchenRoutingRule {
  id: string
  stationId: string
  itemId: string | null
  categoryId: string | null
  menuId: string | null
  priority: number
  station: { id: string; name: string; code: string; color: string | null }
  item: { id: string; name: string } | null
  category: { id: string; name: string } | null
  menu: { id: string; name: string } | null
}

export interface KitchenConfig {
  mode: KitchenMode
  branch: { id: string; name: string } | null
  stations: KitchenStation[]
  positions: KitchenPosition[]
  members: KitchenMember[]
  routing: KitchenRoutingRule[]
  courses: KitchenCourse[]
}

export const KITCHEN_MODE_LABELS: Record<KitchenMode, string> = {
  GENERAL: "General",
  ADVANCED: "Avanzado",
}

export const KITCHEN_STATION_TYPE_LABELS: Record<KitchenStationType, string> = {
  GARDE_MANGER: "Garde manger / fríos",
  ENTREMETIER: "Entremetier / entrantes",
  SAUCIER: "Saucier / salsas",
  GRILL: "Parrilla / asados",
  FRY: "Frituras",
  FISH: "Pescados y mariscos",
  PASTRY: "Pastelería",
  BUTCHERY: "Carnicería",
  EXPO: "Pase / expo",
  CUSTOM: "Personalizada",
}

export const KITCHEN_POSITION_LEVEL_LABELS: Record<
  KitchenPositionLevel,
  string
> = {
  MANAGEMENT: "Dirección",
  CHEF_DE_PARTIE: "Chef de partie",
  COOK: "Cocina",
  ASSISTANT: "Asistente",
  EXPO: "Pase",
}

export const KITCHEN_PERMISSION_LABELS: Record<string, string> = {
  "kitchen.view.all": "Ver todas las estaciones",
  "kitchen.view.station": "Ver estaciones asignadas",
  "kitchen.transition.start": "Iniciar preparación",
  "kitchen.transition.ready": "Marcar listo",
  "kitchen.expo": "Validar en pase",
  "kitchen.pickup": "Recoger (mesero)",
  "kitchen.deliver": "Entregar (mesero)",
  "kitchen.void": "Anular",
  "kitchen.refire": "Rehacer",
  "kitchen.assign": "Asignar personal",
  "kitchen.settings": "Configurar cocina",
  "kitchen.reports": "Ver reportes",
}

export const KITCHEN_STATION_TYPES = Object.keys(
  KITCHEN_STATION_TYPE_LABELS
) as KitchenStationType[]

export const KITCHEN_PERMISSIONS = Object.keys(KITCHEN_PERMISSION_LABELS)
