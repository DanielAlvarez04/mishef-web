import { redirect } from "next/navigation"

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { isAdmin, requireUser } from "@/lib/session"

export default async function OnboardingPage() {
  const user = await requireUser()

  // Se puede repetir como asistente de configuración; solo los administradores
  // pueden hacerlo.
  if (!isAdmin(user)) {
    redirect("/dashboard")
  }

  return (
    <OnboardingFlow
      initialBusinessName={user.organizationName ?? ""}
      initialName={user.name ?? ""}
      initialUsername={user.username ?? ""}
      initialSlug={user.organizationSlug ?? ""}
      initialOnboarded={user.onboarded}
      initialCurrency={user.organizationCurrency}
      currentUsername={user.username}
      tenantDomain={
        process.env.NEXT_PUBLIC_TENANT_DOMAIN ?? "mishef.co"
      }
    />
  )
}