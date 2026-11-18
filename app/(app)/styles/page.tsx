import { redirect } from "next/navigation"

import { StyleLab } from "@/components/design/style-lab"
import { normalizeDesignTokens } from "@/lib/design"
import { readApi } from "@/lib/server-api"
import { requireUser } from "@/lib/session"

export default async function StylesPage() {
  const user = await requireUser()

  if (!user.isPlatformAdmin) redirect("/dashboard")

  const result = await readApi<{ tokens: unknown }>("/design")
  const tokens = result.ok ? normalizeDesignTokens(result.data?.tokens) : null

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Estilos</h1>
        <p className="text-sm text-muted-foreground">
          Prueba colores, bordes y radios de botones, chips y tabs. Lo que
          guardes se aplica a toda la app.
        </p>
      </div>

      <StyleLab initial={tokens} />
    </div>
  )
}
