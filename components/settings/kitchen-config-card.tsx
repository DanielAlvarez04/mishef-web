"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRightIcon,
  ChefHatIcon,
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  createKitchenPosition,
  createKitchenRouting,
  createKitchenStation,
  deactivateKitchenPosition,
  deleteKitchenRouting,
  saveKitchenAssignment,
  saveKitchenMode,
  seedKitchenPositions,
  updateKitchenStation,
} from "@/lib/kitchen-config-actions"
import {
  KITCHEN_MODE_LABELS,
  KITCHEN_POSITION_LEVEL_LABELS,
  KITCHEN_STATION_TYPE_LABELS,
  KITCHEN_STATION_TYPES,
  type KitchenConfig,
  type KitchenMember,
  type KitchenMode,
  type KitchenPosition,
  type KitchenPositionLevel,
  type KitchenRoutingRule,
  type KitchenStation,
  type KitchenStationType,
} from "@/lib/kitchen-config"
import type { ActionResult } from "@/lib/server-api"

interface Option {
  id: string
  name: string
}

/**
 * Configuración de cocina: modo General / Avanzado, estaciones, brigada,
 * asignaciones y ruteo de artículos.
 *
 * En modo General la tarjeta solo permite activar el modo; el resto de la
 * configuración se oculta para no abrumar a los negocios pequeños.
 */
export function KitchenConfigCard({
  config,
  items,
  categories,
  menus,
  canManage,
}: {
  config: KitchenConfig
  items: Option[]
  categories: Option[]
  menus: Option[]
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  function run(
    action: () => Promise<ActionResult<unknown>>,
    success: string
  ) {
    startTransition(async () => {
      const result = await action()

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo guardar la configuración")
        return
      }

      toast.success(success)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHatIcon className="size-4" />
            Operación de cocina
          </CardTitle>
          <CardDescription>
            General usa el tablero simple de tres columnas. Avanzado divide las
            comandas por estación, asigna puestos de brigada y rutea cada
            artículo a su partida.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label htmlFor="kitchen-mode">Modo de la sucursal</Label>
            <Select
              value={config.mode}
              onValueChange={(value) =>
                run(
                  () => saveKitchenMode(value as KitchenMode),
                  "Modo de cocina actualizado"
                )
              }
              items={Object.entries(KITCHEN_MODE_LABELS).map(
                ([value, label]) => ({ value, label })
              )}
              disabled={!canManage || pending}
            >
              <SelectTrigger id="kitchen-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KITCHEN_MODE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {config.mode === "GENERAL" ? (
            <p className="text-sm text-muted-foreground">
              El modo General no requiere configuración. Al activar Avanzado se
              crean los puestos preset de la brigada y una estación inicial; la
              cocina seguirá funcionando igual hasta que configures el ruteo.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {config.mode === "ADVANCED" ? (
        <>
          <StationsCard
            stations={config.stations}
            canManage={canManage}
            pending={pending}
            run={run}
          />
          <PositionsCard
            positions={config.positions}
            canManage={canManage}
            pending={pending}
            run={run}
          />
          <TeamCard
            members={config.members}
            stations={config.stations}
            positions={config.positions}
            canManage={canManage}
            pending={pending}
            run={run}
          />
          <RoutingCard
            routing={config.routing}
            stations={config.stations}
            items={items}
            categories={categories}
            menus={menus}
            canManage={canManage}
            pending={pending}
            run={run}
          />
        </>
      ) : null}
    </div>
  )
}

function StationsCard({
  stations,
  canManage,
  pending,
  run,
}: {
  stations: KitchenStation[]
  canManage: boolean
  pending: boolean
  run: (
    action: () => Promise<ActionResult<unknown>>,
    success: string
  ) => void
}) {
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<KitchenStationType>("CUSTOM")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estaciones</CardTitle>
        <CardDescription>
          Partidas de la cocina. Cada comanda se divide en tickets por estación.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <span className="text-sm font-medium">Nueva estación</span>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Parrilla"
              maxLength={60}
            />
            <Select
              value={type}
              onValueChange={(value) =>
                setType(value as KitchenStationType)
              }
              items={KITCHEN_STATION_TYPES.map((value) => ({
                value,
                label: KITCHEN_STATION_TYPE_LABELS[value],
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KITCHEN_STATION_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {KITCHEN_STATION_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              disabled={!canManage || pending || name.trim().length < 2}
              onClick={() =>
                run(async () => {
                  const result = await createKitchenStation({
                    name: name.trim(),
                    type,
                  })
                  if (result.ok) setName("")
                  return result
                }, "Estación creada")
              }
            >
              {pending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <PlusIcon />
              )}
              Agregar
            </Button>
          </div>
        </div>

        {stations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin estaciones todavía.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {stations.map((station) => (
              <li
                key={station.id}
                className="flex flex-wrap items-center gap-3 px-3 py-2.5"
              >
                <span
                  aria-hidden
                  className="size-3 rounded-full border"
                  style={{ backgroundColor: station.color ?? undefined }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {station.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {station.code} ·{" "}
                    {KITCHEN_STATION_TYPE_LABELS[station.type]}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {station.isActive ? "Activa" : "Inactiva"}
                </span>
                <Switch
                  checked={station.isActive}
                  disabled={!canManage || pending}
                  onCheckedChange={(checked) =>
                    run(
                      () =>
                        updateKitchenStation(station.id, {
                          name: station.name,
                          isActive: checked,
                        }),
                      checked ? "Estación activada" : "Estación desactivada"
                    )
                  }
                  aria-label={`Activar ${station.name}`}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function PositionsCard({
  positions,
  canManage,
  pending,
  run,
}: {
  positions: KitchenPosition[]
  canManage: boolean
  pending: boolean
  run: (
    action: () => Promise<ActionResult<unknown>>,
    success: string
  ) => void
}) {
  const [name, setName] = React.useState("")
  const [level, setLevel] =
    React.useState<KitchenPositionLevel>("COOK")
  const [deleting, setDeleting] = React.useState<KitchenPosition | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brigada</CardTitle>
        <CardDescription>
          Puestos de cocina y permisos. Los presets cubren la brigada clásica;
          puedes crear puestos propios.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!canManage || pending}
            onClick={() =>
              run(seedKitchenPositions, "Puestos preset creados")
            }
          >
            <SparklesIcon />
            Crear presets de brigada
          </Button>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <span className="text-sm font-medium">Nuevo puesto</span>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Saucier"
              maxLength={60}
            />
            <Select
              value={level}
              onValueChange={(value) =>
                setLevel(value as KitchenPositionLevel)
              }
              items={Object.entries(KITCHEN_POSITION_LEVEL_LABELS).map(
                ([value, label]) => ({ value, label })
              )}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KITCHEN_POSITION_LEVEL_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Button
              type="button"
              disabled={!canManage || pending || name.trim().length < 2}
              onClick={() =>
                run(async () => {
                  const result = await createKitchenPosition({
                    name: name.trim(),
                    level,
                  })
                  if (result.ok) setName("")
                  return result
                }, "Puesto creado")
              }
            >
              <PlusIcon />
              Agregar
            </Button>
          </div>
        </div>

        {positions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin puestos. Crea los presets o agrega uno.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {positions.map((position) => (
              <li
                key={position.id}
                className="flex flex-wrap items-center gap-2 px-3 py-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {position.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {position.code} ·{" "}
                    {KITCHEN_POSITION_LEVEL_LABELS[position.level]}
                  </span>
                </span>
                {position.isSystemPreset ? (
                  <Badge variant="outline">Preset</Badge>
                ) : null}
                {!position.isActive ? (
                  <Badge variant="outline">Inactivo</Badge>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Desactivar ${position.name}`}
                  disabled={!canManage || pending || !position.isActive}
                  onClick={() => setDeleting(position)}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Desactivar puesto?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `“${deleting.name}” dejará de estar disponible. Si tiene miembros asignados, primero reasígnalos.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleting) return
                run(
                  () => deactivateKitchenPosition(deleting.id),
                  "Puesto desactivado"
                )
                setDeleting(null)
              }}
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function TeamCard({
  members,
  stations,
  positions,
  canManage,
  pending,
  run,
}: {
  members: KitchenMember[]
  stations: KitchenStation[]
  positions: KitchenPosition[]
  canManage: boolean
  pending: boolean
  run: (
    action: () => Promise<ActionResult<unknown>>,
    success: string
  ) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipo y estaciones</CardTitle>
        <CardDescription>
          Asigna a cada miembro su puesto de brigada y las estaciones que puede
          ver y operar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin miembros activos.
          </p>
        ) : (
          members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              stations={stations}
              positions={positions}
              canManage={canManage}
              pending={pending}
              run={run}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function MemberRow({
  member,
  stations,
  positions,
  canManage,
  pending,
  run,
}: {
  member: KitchenMember
  stations: KitchenStation[]
  positions: KitchenPosition[]
  canManage: boolean
  pending: boolean
  run: (
    action: () => Promise<ActionResult<unknown>>,
    success: string
  ) => void
}) {
  const [positionId, setPositionId] = React.useState(
    member.kitchenPositionId ?? "none"
  )
  const [stationIds, setStationIds] = React.useState<string[]>(
    member.stationIds
  )

  const dirty =
    positionId !== (member.kitchenPositionId ?? "none") ||
    stationIds.length !== member.stationIds.length ||
    stationIds.some((id) => !member.stationIds.includes(id))

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <UsersIcon className="size-4 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {member.name ?? member.username ?? member.email ?? "Miembro"}
          </span>
          <span className="block text-xs text-muted-foreground">
            {member.username ?? member.email ?? member.roles.join(", ")}
          </span>
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)_auto] md:items-end">
        <div className="flex flex-col gap-1.5">
          <Label>Puesto</Label>
          <Select
            value={positionId}
            onValueChange={(value) => setPositionId(value ?? "none")}
            items={[
              { value: "none", label: "Sin puesto" },
              ...positions
                .filter((position) => position.isActive)
                .map((position) => ({
                  value: position.id,
                  label: position.name,
                })),
            ]}
            disabled={!canManage || pending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin puesto</SelectItem>
              {positions
                .filter((position) => position.isActive)
                .map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Estaciones</Label>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {stations.filter((station) => station.isActive).length === 0 ? (
              <span className="text-xs text-muted-foreground">
                Crea una estación primero.
              </span>
            ) : (
              stations
                .filter((station) => station.isActive)
                .map((station) => (
                  <label
                    key={station.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={stationIds.includes(station.id)}
                      onCheckedChange={(checked) =>
                        setStationIds((current) =>
                          checked
                            ? [...new Set([...current, station.id])]
                            : current.filter((id) => id !== station.id)
                        )
                      }
                      disabled={!canManage || pending}
                    />
                    {station.name}
                  </label>
                ))
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={!canManage || pending || !dirty}
          onClick={() =>
            run(
              () =>
                saveKitchenAssignment(member.id, {
                  kitchenPositionId:
                    positionId === "none" ? null : positionId,
                  stationIds,
                }),
              "Asignación guardada"
            )
          }
        >
          Guardar
        </Button>
      </div>
    </div>
  )
}

function RoutingCard({
  routing,
  stations,
  items,
  categories,
  menus,
  canManage,
  pending,
  run,
}: {
  routing: KitchenRoutingRule[]
  stations: KitchenStation[]
  items: Option[]
  categories: Option[]
  menus: Option[]
  canManage: boolean
  pending: boolean
  run: (
    action: () => Promise<ActionResult<unknown>>,
    success: string
  ) => void
}) {
  const [targetType, setTargetType] = React.useState<"item" | "category" | "menu">(
    "item"
  )
  const [targetId, setTargetId] = React.useState("")
  const [stationId, setStationId] = React.useState("")
  const [deleting, setDeleting] = React.useState<KitchenRoutingRule | null>(
    null
  )

  const options =
    targetType === "item"
      ? items
      : targetType === "category"
        ? categories
        : menus

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ruteo a estaciones</CardTitle>
        <CardDescription>
          Define a qué estación va cada artículo, categoría o menú. El artículo
          tiene prioridad sobre la categoría y el menú.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Select
            value={targetType}
            onValueChange={(value) => {
              setTargetType(value as "item" | "category" | "menu")
              setTargetId("")
            }}
            items={[
              { value: "item", label: "Artículo" },
              { value: "category", label: "Categoría" },
              { value: "menu", label: "Menú" },
            ]}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="item">Artículo</SelectItem>
              <SelectItem value="category">Categoría</SelectItem>
              <SelectItem value="menu">Menú</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={targetId}
            onValueChange={(value) => setTargetId(value ?? "")}
            items={options.map((option) => ({
              value: option.id,
              label: option.name,
            }))}
            disabled={options.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Elegir" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={stationId}
            onValueChange={(value) => setStationId(value ?? "")}
            items={stations
              .filter((station) => station.isActive)
              .map((station) => ({
                value: station.id,
                label: station.name,
              }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estación" />
            </SelectTrigger>
            <SelectContent>
              {stations
                .filter((station) => station.isActive)
                .map((station) => (
                  <SelectItem key={station.id} value={station.id}>
                    {station.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            disabled={
              !canManage || pending || !targetId || !stationId
            }
            onClick={() =>
              run(async () => {
                const result = await createKitchenRouting({
                  stationId,
                  ...(targetType === "item" ? { itemId: targetId } : {}),
                  ...(targetType === "category"
                    ? { categoryId: targetId }
                    : {}),
                  ...(targetType === "menu" ? { menuId: targetId } : {}),
                })
                if (result.ok) {
                  setTargetId("")
                  setStationId("")
                }
                return result
              }, "Regla de ruteo creada")
            }
          >
            <PlusIcon />
            Agregar
          </Button>
        </div>

        {routing.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin reglas. Los artículos sin ruta caen en la estación inicial.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {routing.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  {rule.item?.name ??
                    rule.category?.name ??
                    rule.menu?.name ??
                    "Regla"}
                </span>
                <ArrowRightIcon className="size-4 text-muted-foreground" />
                <span className="font-medium">{rule.station.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Eliminar regla"
                  disabled={!canManage || pending}
                  onClick={() => setDeleting(rule)}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Eliminar regla de ruteo?</AlertDialogTitle>
            <AlertDialogDescription>
              El artículo, categoría o menú volverá a la regla siguiente o a la
              estación inicial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleting) return
                run(
                  () => deleteKitchenRouting(deleting.id),
                  "Regla eliminada"
                )
                setDeleting(null)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
