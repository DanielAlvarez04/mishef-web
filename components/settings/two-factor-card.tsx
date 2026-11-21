"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CopyIcon, KeyRoundIcon, Loader2Icon, ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"

import {
  confirmTotpSetup,
  confirmTwoFactor,
  disableTwoFactor,
  startTotpSetup,
  startTwoFactor,
} from "@/app/(app)/settings/security-actions"
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
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function TwoFactorCard({
  enabled,
  totpEnabled,
  email,
  emailVerified,
}: {
  enabled: boolean
  totpEnabled: boolean
  email: string | null
  emailVerified: boolean
}) {
  const router = useRouter()
  const [challengeId, setChallengeId] = React.useState<string | null>(null)
  const [code, setCode] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[]>([])
  const [totpSecret, setTotpSecret] = React.useState<string | null>(null)
  const [totpUri, setTotpUri] = React.useState<string | null>(null)
  const [totpCode, setTotpCode] = React.useState("")
  const [confirmingDisable, setConfirmingDisable] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  const canActivateEmail = Boolean(email) && emailVerified

  function handleStart() {
    startTransition(async () => {
      const result = await startTwoFactor()

      if (!result.ok || !result.data?.challengeId) {
        toast.error(result.message ?? "No pudimos iniciar la activación")
        return
      }

      setChallengeId(result.data.challengeId)
      setCode("")
      setTotpSecret(null)
      setTotpUri(null)
      setRecoveryCodes([])
      toast.success("Te enviamos un código a tu correo")
    })
  }

  function handleStartTotp() {
    startTransition(async () => {
      const result = await startTotpSetup()

      if (!result.ok || !result.data?.secret) {
        toast.error(result.message ?? "No pudimos generar el secreto TOTP")
        return
      }

      setTotpSecret(result.data.secret)
      setTotpUri(result.data.otpauthUrl)
      setTotpCode("")
      setChallengeId(null)
      setCode("")
      toast.success("Agrega la cuenta a tu app autenticadora")
    })
  }

  function handleConfirmTotp() {
    startTransition(async () => {
      const result = await confirmTotpSetup(totpCode)

      if (!result.ok) {
        toast.error(result.message ?? "El código de la app no es válido")
        return
      }

      setTotpSecret(null)
      setTotpUri(null)
      setTotpCode("")
      setRecoveryCodes(result.data?.recoveryCodes ?? [])
      toast.success("App autenticadora activada")
      router.refresh()
    })
  }

  function handleConfirm() {
    if (!challengeId) return

    startTransition(async () => {
      const result = await confirmTwoFactor(challengeId, code)

      if (!result.ok) {
        toast.error(result.message ?? "El código no es válido")
        return
      }

      setChallengeId(null)
      setCode("")
      setRecoveryCodes(result.data?.recoveryCodes ?? [])
      toast.success("Verificación en dos pasos activada")
      router.refresh()
    })
  }

  function handleDisable() {
    startTransition(async () => {
      const result = await disableTwoFactor(password)

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos desactivar 2FA")
        return
      }

      setConfirmingDisable(false)
      setPassword("")
      setRecoveryCodes([])
      setTotpSecret(null)
      setTotpUri(null)
      setTotpCode("")
      toast.success("Verificación en dos pasos desactivada")
      router.refresh()
    })
  }

  async function copyRecoveryCodes() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"))
      toast.success("Códigos de recuperación copiados")
    } catch {
      toast.error("No pudimos copiar los códigos")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRoundIcon className="size-4" />
          Seguridad
        </CardTitle>
        <CardDescription>Cómo proteges el acceso a tu cuenta.</CardDescription>
        <CardAction>
          {enabled ? (
            <Badge variant="secondary">
              <ShieldCheckIcon data-icon="inline-start" />
              {totpEnabled ? "2FA app" : "2FA correo"}
            </Badge>
          ) : (
            <Badge variant="outline">2FA inactiva</Badge>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
          <KeyRoundIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Verificación en dos pasos</span>
            <span className="text-muted-foreground">
              {totpEnabled
                ? "Cada inicio de sesión pide un código de tu app autenticadora."
                : enabled
                  ? "Cada inicio de sesión pide un código enviado a tu correo."
                  : "Actívala con una app autenticadora o por correo."}
            </span>
          </div>
        </div>

        {!email ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Sin correo puedes activar la app autenticadora, pero no recuperar la
            contraseña por correo. Un administrador puede agregar uno.
          </p>
        ) : !emailVerified ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Verifica tu correo <strong>{email}</strong> desde el aviso superior
            para activar 2FA por correo.
          </p>
        ) : null}

        {challengeId ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
            <p className="text-sm">
              Escribe el código de 6 dígitos que enviamos a{" "}
              <strong>{email}</strong>.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                className="w-36 text-center text-lg tracking-[0.3em]"
              />
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={pending || code.length !== 6}
              >
                {pending ? <Loader2Icon className="animate-spin" /> : null}
                Confirmar correo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setChallengeId(null)
                  setCode("")
                }}
                disabled={pending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        {totpSecret ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-3">
            <p className="text-sm font-medium">
              Agrega esta cuenta a tu app autenticadora
            </p>
            <p className="text-xs text-muted-foreground">
              Escribe el secreto en Google Authenticator, 1Password o Authy.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                {totpSecret}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(totpSecret)
                    toast.success("Secreto copiado")
                  } catch {
                    toast.error("No pudimos copiar el secreto")
                  }
                }}
              >
                <CopyIcon data-icon="inline-start" />
                Copiar
              </Button>
              {totpUri ? (
                <a
                  href={totpUri}
                  className="text-xs underline underline-offset-4"
                >
                  Abrir en la app
                </a>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={totpCode}
                onChange={(event) =>
                  setTotpCode(
                    event.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                className="w-36 text-center text-lg tracking-[0.3em]"
              />
              <Button
                type="button"
                onClick={handleConfirmTotp}
                disabled={pending || totpCode.length !== 6}
              >
                {pending ? <Loader2Icon className="animate-spin" /> : null}
                Confirmar app
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTotpSecret(null)
                  setTotpUri(null)
                  setTotpCode("")
                }}
                disabled={pending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {!totpEnabled ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleStartTotp}
              disabled={pending}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Activar con app
            </Button>
          ) : null}

          {!enabled && canActivateEmail ? (
            <Button
              type="button"
              onClick={handleStart}
              disabled={pending}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Activar por correo
            </Button>
          ) : null}

          {enabled ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmingDisable(true)}
              disabled={pending}
            >
              Desactivar 2FA
            </Button>
          ) : null}
        </div>

        {recoveryCodes.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Guarda estos códigos de recuperación
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Cada uno sirve una sola vez si pierdes acceso a tu correo. No
              volverán a mostrarse.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {recoveryCodes.map((recoveryCode) => (
                <code
                  key={recoveryCode}
                  className="rounded bg-background/60 px-2 py-1"
                >
                  {recoveryCode}
                </code>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={copyRecoveryCodes}
            >
              <CopyIcon data-icon="inline-start" />
              Copiar códigos
            </Button>
          </div>
        ) : null}
      </CardContent>

      <AlertDialog
        open={confirmingDisable}
        onOpenChange={setConfirmingDisable}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <ShieldCheckIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Desactivar la verificación en dos pasos?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu cuenta quedará protegida solo con contraseña. Escribe tu
              contraseña actual para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Contraseña actual"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDisable}
              disabled={pending || !password}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
