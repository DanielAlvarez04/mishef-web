import { redirect } from "next/navigation"

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { getBranches } from "@/lib/branch-server"
import { isAdmin, requireUser } from "@/lib/session"

export default async function OnboardingPage() {
  const user = await requireUser()

  // Se puede repetir como asistente de configuración; solo los administradores
  // pueden hacerlo.
  if (!isAdmin(user)) {
    redirect("/dashboard")
  }

  const branches = await getBranches()
  const initialBranchName =
    branches.find((branch) => branch.isActive)?.name ?? ""

  return (
    <OnboardingFlow
      initialBusinessName={user.organizationName ?? ""}
      initialName={user.name ?? ""}
      initialUsername={user.username ?? ""}
      initialSlug={user.organizationSlug ?? ""}
      initialOnboarded={user.onboarded}
      initialBranchName={initialBranchName}
      initialCurrency={user.organizationCurrency}
      currentUsername={user.username}
      tenantDomain={
        process.env.NEXT_PUBLIC_TENANT_DOMAIN ?? "mishef.co"
      }
    />
  )
}