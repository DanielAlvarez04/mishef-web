import { HardDriveIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { StorageUsage } from "@/lib/storage"

/** Tamaño legible: MB con un decimal hasta 1 GB, después GB. */
function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024

  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`
  }

  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

/**
 * Consumo de almacenamiento del negocio.
 *
 * El límite es de 250 MB por sucursal y lo comprueba la API al firmar cada
 * subida: al llegar al tope se rechazan las imágenes nuevas, pero nunca se
 * borra nada de lo que ya existe.
 */
export function StorageCard({ storage }: { storage: StorageUsage | null }) {
  if (!storage) return null

  const percent = Math.max(0, Math.min(100, storage.percent))
  const tone =
    percent >= 95
      ? "bg-destructive"
      : percent >= 80
        ? "bg-amber-500"
        : "bg-primary"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDriveIcon className="size-4" /> Almacenamiento
        </CardTitle>
        <CardDescription>
          Fotos de catálogo y de merma, ya optimizadas. Cada sucursal suma{" "}
          {formatBytes(storage.perBranch)}.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          aria-label="Almacenamiento usado"
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className={`h-full rounded-full transition-[width] ${tone}`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">
            {formatBytes(storage.used)} de {formatBytes(storage.limit)}
          </span>
          <span className="text-muted-foreground">
            {storage.branches === 1
              ? "1 sucursal"
              : `${storage.branches} sucursales`}
          </span>
        </div>

        {percent >= 95 ? (
          <p className="text-sm text-destructive">
            Alcanzaste el límite: las imágenes nuevas se rechazan hasta que
            liberes espacio o agregues otra sucursal.
          </p>
        ) : percent >= 80 ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Te queda poco espacio. Elimina imágenes que no uses o agrega una
            sucursal para ampliar el límite.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
