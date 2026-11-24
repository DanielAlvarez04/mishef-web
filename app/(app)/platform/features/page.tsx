import { redirect } from "next/navigation"

import { FeaturesMatrix } from "@/components/platform/features-matrix"
import { Card, CardContent } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import type { PlatformFeatureOrganization } from "@/lib/features"
import { requireUser } from "@/lib/session"

export default async function PlatformFeaturesPage() {
  const user = await requireUser()

  if (!user.isPlatformAdmin) redirect("/dashboard")

  const response = await apiFetch("/platform/features")
  let organizations: PlatformFeatureOrganization[] | null = null

  if (response.ok) {
    const text = await response.text()
    const payload = text.trim()
      ? (JSON.parse(text) as {
          organizations?: PlatformFeatureOrganization[]
        })
      : null

    organizations = payload?.organizations ?? []
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Funciones por negocio
        </h1>
        <p className="text-sm text-muted-foreground">
          Activa o desactiva páginas y módulos. Todos los negocios parten de los
          mismos defaults; estos son overrides por organización.
        </p>
      </div>

      {!organizations ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No pudimos cargar los negocios. Recarga la página e inténtalo de
            nuevo.
          </CardContent>
        </Card>
      ) : (
        <FeaturesMatrix
          organizations={organizations.filter(
            (organization) => organization.slug !== "mishef-platform"
          )}
        />
      )}
    </div>
  )
}
