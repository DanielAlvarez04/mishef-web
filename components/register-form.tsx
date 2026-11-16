"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import Script from "next/script"
import { useEffect, useState } from "react"
import { cn } from "cn"

import { Button, buttonVariants } from "@/components/ui/button"
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
import { GlobeIcon } from "lucide-react"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { API_BASE_URL } from "@/lib/api-base"
import { apiErrorMessage } from "@/lib/http-error"

const GOOGLE_PATH = `${API_BASE_URL}/auth/google`

/**
 * Clave pública de Cloudflare Turnstile. Si está vacía (desarrollo o un
 * despliegue que todavía no la tiene) el widget no se pinta y la API ignora el
 * token: el registro sigue funcionando sin captcha.
 */
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

/** Dirección base de los negocios en Mishef. */
const TENANT_DOMAIN = process.env.NEXT_PUBLIC_TENANT_DOMAIN ?? "mishef.co"

/** Espejo en cliente de `normalizeSlug` del backend. */
function slugifyClient(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
}

export function RegisterForm({ className, ...props }: React.ComponentProps<"form">) {
  const router = useRouter()
  const [businessName, setBusinessName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [checkedStatus, setCheckedStatus] = useState<
    "idle" | "checking" | "free" | "taken" | "invalid"
  >("idle")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const googleHref = businessName.trim()
    ? `${GOOGLE_PATH}?business=${encodeURIComponent(businessName.trim())}`
    : GOOGLE_PATH

  // Sugerencia derivada: mientras el usuario no escriba su propia dirección, se
  // calcula a partir del nombre. Sin efecto ni estado duplicado.
  const effectiveSlug = slugEdited ? slug : slugifyClient(businessName)
  const candidate = effectiveSlug.trim()
  const localStatus =
    candidate.length === 0 ? "idle" : candidate.length < 3 ? "invalid" : null

  // Disponibilidad con debounce: una petición por pausa de tecleo, no por tecla.
  useEffect(() => {
    if (localStatus) return

    let cancelled = false

    const timer = setTimeout(async () => {
      setCheckedStatus("checking")

      try {
        const response = await fetch(
          `${API_BASE_URL}/public/slug-available?slug=${encodeURIComponent(candidate)}`
        )
        const data = (await response.json().catch(() => null)) as
          | { available?: boolean; reason?: string }
          | null

        if (cancelled) return

        if (data?.available) {
          setCheckedStatus("free")
        } else if (data?.reason === "invalid" || data?.reason === "reserved") {
          setCheckedStatus("invalid")
        } else {
          setCheckedStatus("taken")
        }
      } catch {
        if (!cancelled) setCheckedStatus("idle")
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [candidate, localStatus])

  const slugStatus = localStatus ?? checkedStatus

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (slugStatus === "taken") {
      setError("Esa dirección ya está en uso. Prueba con otra.")
      return
    }

    if (slugStatus === "invalid") {
      setError("La dirección debe tener al menos 3 caracteres y solo minúsculas, números y guiones.")
      return
    }

    // Turnstile (modo implícito) deja el token en un input oculto dentro del
    // formulario. Se guarda ahora porque el envío se confirma en un diálogo.
    const formData = new FormData(event.currentTarget)
    const token = formData.get("cf-turnstile-response")

    setTurnstileToken(
      TURNSTILE_SITE_KEY && typeof token === "string" ? token : undefined
    )
    setError(null)
    setConfirmOpen(true)
  }

  async function submitConfirmed() {
    setConfirmOpen(false)
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: businessName.trim(),
          slug: effectiveSlug.trim() || undefined,
          name: name.trim() || undefined,
          email: email.trim(),
          password,
          turnstileToken,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          apiErrorMessage(data, "No pudimos crear tu cuenta")
        )
      }

      router.push("/onboarding")
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pudimos crear tu cuenta"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Crea tu negocio</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Tu cuenta será la administradora del negocio y podrás añadir a tu
            equipo con usuarios internos.
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="businessName">Nombre del negocio</FieldLabel>
          <Input
            id="businessName"
            name="businessName"
            type="text"
            placeholder="Café Central"
            autoComplete="organization"
            maxLength={80}
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="slug">Dirección de tu negocio</FieldLabel>
          <div className="flex items-stretch overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring/50">
            <Input
              id="slug"
              name="slug"
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="mi-cafeteria"
              maxLength={32}
              value={effectiveSlug}
              onChange={(event) => {
                setSlugEdited(true)
                setSlug(slugifyClient(event.target.value))
              }}
              className="rounded-none border-0 shadow-none focus-visible:ring-0"
            />
            <span className="flex items-center border-l border-input bg-muted px-3 text-sm text-muted-foreground">
              .{TENANT_DOMAIN}
            </span>
          </div>
          <FieldDescription>
            {slugStatus === "checking" ? (
              "Comprobando disponibilidad…"
            ) : slugStatus === "taken" ? (
              <span className="text-destructive">
                Esa dirección ya está en uso. Prueba con otra.
              </span>
            ) : slugStatus === "invalid" ? (
              <span className="text-destructive">
                Mínimo 3 caracteres: minúsculas, números y guiones.
              </span>
            ) : slugStatus === "free" ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                Disponible: https://{effectiveSlug}.{TENANT_DOMAIN}
              </span>
            ) : (
              "Así entrarán tu equipo y tus clientes. Puedes cambiarla."
            )}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="name">Tu nombre (opcional)</FieldLabel>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Ana Pérez"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Correo</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="tu@cafeteria.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <FieldDescription>
            Al menos 8 caracteres. La usará el administrador para entrar.
          </FieldDescription>
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {TURNSTILE_SITE_KEY ? (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js"
              strategy="afterInteractive"
            />
            <div
              className="cf-turnstile"
              data-sitekey={TURNSTILE_SITE_KEY}
              data-language="es"
              data-theme="auto"
            />
          </>
        ) : null}
        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta y negocio"}
          </Button>
          <FieldDescription className="text-center text-xs">
            Al crear la cuenta aceptas los{" "}
            <Link
              href="/terminos"
              className="underline underline-offset-4 hover:text-foreground"
            >
              términos y condiciones
            </Link>{" "}
            y el{" "}
            <Link
              href="/privacidad"
              className="underline underline-offset-4 hover:text-foreground"
            >
              aviso de privacidad
            </Link>
            .
          </FieldDescription>
        </Field>
        <FieldSeparator>O continúa con</FieldSeparator>
        <Field>
          {/* Navegación con semántica de enlace; el nombre del negocio viaja en
              la URL para que Google cree la organización con ese nombre. */}
          <a
            href={googleHref}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
                fill="#EA4335"
              />
            </svg>
            Continuar con Google
          </a>
          <FieldDescription className="text-center">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Inicia sesión
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-primary/10 text-primary">
              <GlobeIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Esta será tu dirección</AlertDialogTitle>
            <AlertDialogDescription>
              Tu negocio entrará en{" "}
              <strong>
                {effectiveSlug}.{TENANT_DOMAIN}
              </strong>
              . No podrás cambiarla más adelante, así que revisa que sea la
              correcta antes de continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar</AlertDialogCancel>
            <AlertDialogAction onClick={submitConfirmed}>
              {loading ? "Creando cuenta..." : "Confirmar y crear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
