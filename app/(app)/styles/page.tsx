import { StyleLab } from "@/components/design/style-lab"
import { canEditStyles, normalizeDesignTokens } from "@/lib/design"
import { readApi } from "@/lib/server-api"
import { requireUser } from "@/lib/session"

export default async function StylesPage() {
  const user = await requireUser()

  const result = await readApi<{ applied: unknown; draft: unknown }>("/design")
  const applied = result.ok
    ? normalizeDesignTokens(result.data?.applied)
    : null
  const draft = result.ok ? normalizeDesignTokens(result.data?.draft) : null

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Estilos</h1>
        <p className="text-sm text-muted-foreground">
          Prueba colores, bordes y fondos de botones, chips, tabs, sidebar y
          main. Guarda un borrador y publícalo cuando esté listo.
        </p>
      </div>

      <StyleLab applied={applied} draft={draft} canEdit={canEditStyles(user)} />
    </div>
  )
}
