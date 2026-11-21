"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import { requireUser } from "@/lib/session"

const PATHS = ["/settings"]

/** Reenvía el correo de verificación (para el banner y Ajustes). */
export async function resendVerification(): Promise<ActionResult> {
  await requireUser()
  return mutateApi("/auth/resend-verification", "POST", undefined, PATHS)
}

/** Acción de formulario: ignora el resultado, el banner se refresca solo. */
export async function resendVerificationForm(): Promise<void> {
  await resendVerification()
}

/** Inicia la activación de 2FA; envía el código al correo. */
export async function startTwoFactor(): Promise<
  ActionResult<{ challengeId: string }>
> {
  await requireUser()
  return mutateApi("/auth/2fa/enable", "POST", undefined, PATHS)
}

/** Confirma el código y activa 2FA. */
export async function confirmTwoFactor(
  challengeId: string,
  code: string
): Promise<
  ActionResult<{ twoFactorEnabled: boolean; recoveryCodes?: string[] }>
> {
  await requireUser()
  return mutateApi("/auth/2fa/enable/confirm", "POST", { challengeId, code }, PATHS)
}

/** Genera el secreto TOTP para la app autenticadora. */
export async function startTotpSetup(): Promise<
  ActionResult<{ secret: string; otpauthUrl: string }>
> {
  await requireUser()
  return mutateApi("/auth/2fa/totp/setup", "POST", undefined, PATHS)
}

/** Confirma el primer código TOTP y activa la app. */
export async function confirmTotpSetup(
  code: string
): Promise<
  ActionResult<{ twoFactorEnabled: boolean; recoveryCodes?: string[] }>
> {
  await requireUser()
  return mutateApi("/auth/2fa/totp/confirm", "POST", { code }, PATHS)
}

/** Desactiva 2FA pidiendo la contraseña actual. */
export async function disableTwoFactor(
  password: string
): Promise<ActionResult<{ twoFactorEnabled: boolean }>> {
  await requireUser()
  return mutateApi("/auth/2fa/disable", "POST", { password }, PATHS)
}

/** Revoca una sesión concreta de la cuenta. */
export async function revokeSession(sessionId: string): Promise<ActionResult> {
  await requireUser()
  return mutateApi(
    `/auth/sessions/${encodeURIComponent(sessionId)}`,
    "DELETE",
    undefined,
    PATHS
  )
}

/** Cambia la contraseña; la API revoca las sesiones y borra las cookies. */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  await requireUser()
  return mutateApi(
    "/auth/change-password",
    "POST",
    { currentPassword, newPassword },
    PATHS
  )
}
