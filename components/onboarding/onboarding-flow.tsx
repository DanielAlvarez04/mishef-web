"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ClockIcon, GalleryVerticalEndIcon, SparklesIcon } from "lucide-react"

import {
  checkOnboardingSlug,
  finishOnboarding,
  suggestOnboardingSlug,
  updateOnboardingBusiness,
  updateOnboardingBusinessType,
  updateOnboardingCurrency,
  updateOnboardingGoals,
  updateOnboardingProfile,
  updateOnboardingServiceTypes,
} from "@/app/onboarding/actions"
import { AvailabilityLabel } from "@/components/availability-field"
import {
  useSuggestedUsername,
  useUsernameStatus,
} from "@/components/users/username-field"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useActionForm } from "@/hooks/use-action-form"
import { CURRENCY_OPTIONS } from "@/lib/currency-config"
import { sameText } from "@/lib/diff"
import { normalizeUsername } from "@/lib/username"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Questionnaire,
  QuestionnaireItem,
  QuestionnaireTitle,
  QuestionnaireChoices,
  QuestionnaireChoice,
  QuestionnaireProgress,
  QuestionnaireActions,
  QuestionnairePrevious,
  QuestionnaireNext,
  QuestionnaireSubmit,
  QuestionnaireError,
} from "@/components/ui/questionnaire"

const BUSINESS_TYPES = [
  "restaurante",
  "cafetería",
  "chocolatería",
  "panadería",
  "repostería",
  "pastelería",
  "heladería",
  "bar",
  "comida rápida",
  "taquería",
  "pizzería",
  "cocina económica",
  "negocio de catering",
  "negocio de alimentos por encargo",
  "tienda de alimentos y bebidas",
  "otro",
] as const

const SERVICE_TYPES = [
  "servicio en mesa",
  "mostrador",
  "para llevar",
  "entrega a domicilio propia",
  "entrega mediante plataformas",
  "catering o eventos",
  "venta en línea",
] as const

const GOALS = [
  "control de inventario",
  "cálculo de costos y rentabilidad",
  "compras y proveedores",
  "control de ventas y caja",
  "control de gastos",
  "administración de recetas y producción",
  "reducción de mermas y desperdicios",
  "administración de sucursales",
  "organización del personal",
  "reportes y análisis del negocio",
  "otro",
] as const

const ONBOARDING_ITEMS = [
  { name: "businessType", required: true },
  { name: "business", required: true },
  { name: "address", required: true },
  { name: "currency", required: true },
  { name: "profile", required: true },
  { name: "serviceTypes", required: false },
  { name: "goals", required: false },
  { name: "welcome", required: false },
] as const

/** `Naranja Pimienta` → `naranja-pimienta`. */
function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "mi-negocio"
  )
}

type SlugStatus =
  | { state: "idle" | "checking" }
  | { state: "available" | "taken" | "invalid" | "current"; message: string }
  | { state: "error"; message: string }

/** `daniel@pimientanaranja.com` → `daniel`. */
function localPart(value: string): string {
  return value.split("@")[0]?.trim() ?? ""
}

/**
 * Separa el nombre de la cuenta en nombre de pila y apellidos.
 *
 * Conserva mayúsculas y acentos porque se muestra en los campos editables.
 */
function splitDisplayName(name: string): { first: string; surname: string } {
  const words = name.trim().split(/\s+/).filter(Boolean)

  return { first: words[0] ?? "", surname: words.slice(1).join(" ") }
}

export function OnboardingFlow({
  initialBusinessName,
  initialName,
  initialUsername,
  initialSlug,
  initialOnboarded,
  initialCurrency,
  currentUsername,
  tenantDomain,
}: {
  initialBusinessName: string
  initialName: string
  initialUsername: string
  initialSlug: string
  /** `true` si el asistente ya se completó antes (se repite como ajustes). */
  initialOnboarded: boolean
  /** Moneda configurada; MXN si la organización aún no eligió otra. */
  initialCurrency: string
  currentUsername: string | null
  tenantDomain: string
}) {
  const router = useRouter()
  const questionnaireRef = React.useRef<HTMLFormElement>(null)

  // State
  const [businessType, setBusinessType] = useState("")
  const [businessName, setBusinessName] = useState(initialBusinessName)
  // La dirección se sugiere con el nombre real del negocio. El slug aleatorio
  // del registro (`pending-…` o `nombre-abcdef`) es solo un placeholder.
  const generatedSlug =
    !initialSlug ||
    /^pending-[0-9a-f]{16}$/.test(initialSlug) ||
    /-[0-9a-f]{6}$/.test(initialSlug)
  const autoSlug = !initialOnboarded && generatedSlug
  const [slugOverride, setSlugOverride] = useState<string | null>(null)
  const slug =
    slugOverride ?? (autoSlug ? slugify(businessName) : initialSlug)
  const savedSlug = initialSlug
  const [remoteSlug, setRemoteSlug] = useState<{
    slug: string
    status: SlugStatus
  } | null>(null)
  const [hasBranches, setHasBranches] = useState(false)
  const [branchName, setBranchName] = useState("")

  const accountName = splitDisplayName(initialName)
  const [firstName, setFirstName] = useState(accountName.first)
  const [lastName, setLastName] = useState(accountName.surname)
  // El username es local al negocio: no lleva dominio. Mientras no se edite a
  // mano, se recalcula con el nombre y apellido, igual que en /users.
  const [manualLocal, setManualLocal] = useState<string | null>(null)
  const initialLocal = localPart(initialUsername)
  const suggestion = useSuggestedUsername(`${firstName} ${lastName}`, {
    enabled: manualLocal === null,
    resetKey: businessName,
  })
  const suggestedLocal = suggestion ? localPart(suggestion) : ""
  const local = manualLocal ?? (suggestedLocal || initialLocal)
  // El usuario ya no incluye dominio: el correo es el identificador y el
  // subdominio resuelve el negocio.
  const username = local
  const usernameStatus = useUsernameStatus(username, { currentUsername })

  const [serviceTypes, setServiceTypes] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [currency, setCurrency] = useState(initialCurrency || "MXN")
  /** Última moneda confirmada por la API (evita repeticiones al avanzar). */
  const [savedCurrency, setSavedCurrency] = useState(initialCurrency || "MXN")

  // Disponibilidad del subdominio con debounce. El estado inmediato se deriva
  // en el render; el efecto solo guarda el resultado remoto.
  const slugImmediate: SlugStatus = !slug
    ? { state: "idle" }
    : slug === savedSlug
      ? { state: "current", message: "Es la dirección actual" }
      : slug.length < 3 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
        ? {
            state: "invalid",
            message: "Solo minúsculas, números y guiones (3–32).",
          }
        : { state: "checking" }

  React.useEffect(() => {
    if (slugImmediate.state !== "checking") return

    let cancelled = false

    const timer = setTimeout(async () => {
      const result = await checkOnboardingSlug(slug)
      if (cancelled) return

      const status: SlugStatus =
        !result.ok || !result.data
          ? { state: "error", message: "No pudimos verificar la dirección." }
          : result.data.available
            ? { state: "available", message: "Disponible" }
            : result.data.reason === "taken"
              ? { state: "taken", message: "Ya está en uso" }
              : {
                  state: "invalid",
                  message: "Dirección no válida o reservada",
                }

      setRemoteSlug({ slug, status })
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [slug, slugImmediate.state])

  const slugStatus: SlugStatus =
    slugImmediate.state === "checking"
      ? remoteSlug?.slug === slug
        ? remoteSlug.status
        : { state: "checking" }
      : slugImmediate

  // Forms
  const businessTypeForm = useActionForm(() => {})
  const businessForm = useActionForm(() => {})
  const addressForm = useActionForm()
  const currencyForm = useActionForm(() => {})
  const profileForm = useActionForm(() => {})
  const serviceTypesForm = useActionForm(() => {})
  const goalsForm = useActionForm(() => {})
  const finishForm = useActionForm<{ redirectTo: string }>((result) => {
    const target = result.data?.redirectTo
    if (target) {
      window.location.assign(target)
      return
    }
    router.push("/dashboard")
    router.refresh()
  })

  const handleBusinessTypeSubmit = () => {
    const fd = new FormData()
    fd.append("businessType", businessType)
    return businessTypeForm.run(() => updateOnboardingBusinessType(fd))
  }

  const handleBusinessSubmit = () => {
    const fd = new FormData()
    fd.append("name", businessName)
    fd.append("branchName", branchName)
    fd.append("hasBranches", hasBranches.toString())
    return businessForm.run(() => updateOnboardingBusiness(fd))
  }

  const handleAddressSubmit = () => {
    // La dirección se guarda hasta el paso final, cuando el nombre del negocio
    // ya está confirmado. Aquí solo se valida su disponibilidad.
    return Promise.resolve(true)
  }

  const handleCurrencySubmit = () => {
    if (sameText(savedCurrency, currency)) {
      return Promise.resolve(true)
    }

    const fd = new FormData()
    fd.append("currency", currency)
    return currencyForm.run(async () => {
      const result = await updateOnboardingCurrency(fd)
      if (result.ok) setSavedCurrency(currency)
      return result
    })
  }

  const handleProfileSubmit = () => {
    const fd = new FormData()
    fd.append("firstName", firstName)
    fd.append("lastName", lastName)
    fd.append("username", username)
    return profileForm.run(() => updateOnboardingProfile(fd))
  }

  const handleServiceTypesSubmit = () => {
    const fd = new FormData()
    fd.append("serviceTypes", serviceTypes.join(","))
    return serviceTypesForm.run(() => updateOnboardingServiceTypes(fd))
  }

  const handleGoalsSubmit = () => {
    const fd = new FormData()
    fd.append("goals", goals.join(","))
    return goalsForm.run(() => updateOnboardingGoals(fd))
  }

  const handleFinishSubmit = () => {
    return finishForm.run(() => finishOnboarding(slug))
  }

  const toggleServiceType = (value: string) => {
    setServiceTypes((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    )
  }

  const toggleGoal = (value: string) => {
    setGoals((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    )
  }

  return (
    <Questionnaire
      ref={questionnaireRef}
      defaultItem="businessType"
      items={ONBOARDING_ITEMS}
      className="relative h-svh overflow-y-auto bg-gradient-to-br from-primary/10 via-background to-secondary/25"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,var(--primary),transparent_45%)] opacity-10" />

      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm font-medium"
        aria-label="Mishef"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GalleryVerticalEndIcon className="size-4" />
        </span>
        Mishef
      </Link>

      <div className="flex min-h-full items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-3xl">
        <QuestionnaireProgress
          render={(props, state) => (
            <div {...props} className="w-full">
              <div className="mb-2 flex gap-1.5" aria-hidden="true">
                {Array.from({ length: state.total }, (_, index) => (
                  <span
                    key={index}
                    className={index < state.current - 1
                      ? "h-1.5 flex-1 rounded-full bg-primary"
                      : "h-1.5 flex-1 rounded-full bg-muted"}
                  />
                ))}
              </div>
              <span>Paso {state.current} de {state.total}</span>
            </div>
          )}
        />

        {/* Paso 1: Giro principal */}
        <QuestionnaireItem name="businessType" required>
          <div className="flex flex-col gap-6">
            <QuestionnaireTitle>¿Cuál es el giro principal de tu negocio?</QuestionnaireTitle>
            <QuestionnaireChoices>
              {BUSINESS_TYPES.map((type) => (
                <QuestionnaireChoice
                  key={type}
                  value={type}
                  name="businessType"
                  checked={businessType === type}
                  onChange={setBusinessType}
                >
                  {type}
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>
            <QuestionnaireError>{businessTypeForm.error}</QuestionnaireError>
            <QuestionnaireActions>
              <QuestionnaireNext onClick={handleBusinessTypeSubmit}>Continuar</QuestionnaireNext>
            </QuestionnaireActions>
          </div>
        </QuestionnaireItem>

        {/* Paso 2: Datos del negocio */}
        <QuestionnaireItem name="business" required>
          <div className="flex flex-col gap-6">
            <QuestionnaireTitle>¿Cómo se llama tu negocio?</QuestionnaireTitle>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="business-name">
                  Nombre del negocio <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="business-name"
                  name="name"
                  autoComplete="organization"
                  maxLength={80}
                  placeholder="Café Central"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoFocus
                  required
                  className="text-base py-2.5"
                />
                <FieldDescription>
                  Puedes cambiarlo luego desde Configuración.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="branch-name">
                  Nombre de tu primera sucursal{" "}
                  <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="branch-name"
                  name="branchName"
                  maxLength={80}
                  placeholder="Centro"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                  className="text-base py-2.5"
                />
                <FieldDescription>
                  Se usa en reportes y configuración. Si solo tienes una, no
                  aparece en el menú lateral.
                </FieldDescription>
              </Field>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
              <Checkbox
                id="has-branches"
                checked={hasBranches}
                onCheckedChange={setHasBranches}
                className="mt-0.5"
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="has-branches" className="cursor-pointer text-sm font-normal">
                  Tengo más de una sucursal
                </Label>
                <span className="text-xs text-muted-foreground">
                  Podrás crearlas y asignar personal en Configuración → Negocio.
                </span>
              </div>
            </div>
            <input type="hidden" name="hasBranches" value={hasBranches.toString()} />

            <QuestionnaireError>{businessForm.error}</QuestionnaireError>
            <QuestionnaireActions>
              <QuestionnairePrevious />
              <QuestionnaireNext
                onClick={handleBusinessSubmit}
                disabled={
                  businessName.trim().length < 2 ||
                  branchName.trim().length < 2
                }
              >
                Continuar
              </QuestionnaireNext>
            </QuestionnaireActions>
          </div>
        </QuestionnaireItem>

        {/* Paso 3: Dirección del negocio */}
        <QuestionnaireItem name="address" required>
          <div className="flex flex-col gap-6">
            <QuestionnaireTitle>
              ¿Cuál será la dirección de tu negocio?
            </QuestionnaireTitle>
            <p className="text-base text-muted-foreground text-center">
              Tus clientes y tu equipo entrarán por esta dirección.
            </p>

            <Field>
              <FieldLabel htmlFor="business-slug">Dirección</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="business-slug"
                  name="slug"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={32}
                  placeholder="mi-cafeteria"
                  value={slug}
                  onChange={(event) => {
                    setSlugOverride(
                      event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]+/g, "-")
                        .replace(/-+/g, "-")
                        .replace(/^-+/, "")
                        .slice(0, 32)
                    )
                  }}
                />
                <span className="shrink-0 text-sm text-muted-foreground">
                  .{tenantDomain}
                </span>
              </div>
              <FieldDescription>
                Solo minúsculas, números y guiones. Podrás cambiarla una vez
                más desde Configuración.
              </FieldDescription>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => {
                  void (async () => {
                    const result = await suggestOnboardingSlug(businessName)
                    if (result.ok && result.data?.slug) {
                      setSlugOverride(result.data.slug)
                      addressForm.setError(null)
                    } else {
                      addressForm.setError(
                        "No pudimos sugerir otra dirección. Inténtalo de nuevo."
                      )
                    }
                  })()
                }}
              >
                Sugerir otra
              </Button>
              {slugStatus.state === "checking" ? (
                <p className="text-xs text-muted-foreground">Verificando…</p>
              ) : slugStatus.state === "available" ||
                slugStatus.state === "current" ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {slugStatus.message}
                </p>
              ) : slugStatus.state === "taken" ||
                slugStatus.state === "invalid" ||
                slugStatus.state === "error" ? (
                <p className="text-xs text-destructive">
                  {slugStatus.message}
                </p>
              ) : null}
            </Field>

            <QuestionnaireError>{addressForm.error}</QuestionnaireError>
            <QuestionnaireActions>
              <QuestionnairePrevious />
              <QuestionnaireNext
                onClick={handleAddressSubmit}
                disabled={
                  !slug ||
                  (slugStatus.state !== "available" &&
                    slugStatus.state !== "current")
                }
              >
                Continuar
              </QuestionnaireNext>
            </QuestionnaireActions>
          </div>
        </QuestionnaireItem>

        {/* Paso 4: Moneda */}
        <QuestionnaireItem name="currency" required>
          <div className="flex flex-col gap-6">
            <QuestionnaireTitle>¿Con qué moneda trabajas?</QuestionnaireTitle>
            <p className="text-base text-muted-foreground text-center">
              La usarás en los precios, cobros y reportes del negocio.
            </p>

            <QuestionnaireChoices>
              {CURRENCY_OPTIONS.map((option) => (
                <QuestionnaireChoice
                  key={option.value}
                  value={option.value}
                  name="currency"
                  checked={currency === option.value}
                  onChange={setCurrency}
                >
                  {option.label}
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>

            <QuestionnaireError>{currencyForm.error}</QuestionnaireError>
            <QuestionnaireActions>
              <QuestionnairePrevious />
              <QuestionnaireNext
                onClick={handleCurrencySubmit}
                disabled={!currency}
              >
                Continuar
              </QuestionnaireNext>
            </QuestionnaireActions>
          </div>
        </QuestionnaireItem>

        {/* Paso 4: Datos del usuario */}
        <QuestionnaireItem name="profile" required>
          <div className="flex flex-col gap-6">
            <QuestionnaireTitle>Cuéntanos de ti</QuestionnaireTitle>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="owner-firstname">Nombre</FieldLabel>
                <Input
                  id="owner-firstname"
                  name="firstName"
                  autoComplete="given-name"
                  maxLength={80}
                  placeholder="Ana"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                  required
                  className="text-lg py-3"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="owner-lastname">Apellido</FieldLabel>
                <Input
                  id="owner-lastname"
                  name="lastName"
                  autoComplete="family-name"
                  maxLength={80}
                  placeholder="Pérez"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="text-lg py-3"
                />
              </Field>
            </div>

            <Field>
              <AvailabilityLabel
                htmlFor="owner-username"
                label="Usuario"
                status={usernameStatus}
              />
              <div className="flex items-stretch overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
                <input
                  id="owner-username"
                  name="username"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={32}
                  placeholder="daniel"
                  value={local}
                  onChange={(e) =>
                    setManualLocal(
                      normalizeUsername(localPart(e.target.value))
                    )
                  }
                  required
                  className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground"
                />
              </div>
              <FieldDescription>
                Tu identificador interno. Para entrar siempre usarás tu correo.
              </FieldDescription>
            </Field>

            <QuestionnaireError>{profileForm.error}</QuestionnaireError>
            <QuestionnaireActions>
              <QuestionnairePrevious />
              <QuestionnaireNext onClick={handleProfileSubmit}>Continuar</QuestionnaireNext>
            </QuestionnaireActions>
          </div>
        </QuestionnaireItem>

        {/* Paso 5: Tipo de servicio (skippable) */}
        <QuestionnaireItem name="serviceTypes" required={false}>
          <div className="flex flex-col gap-6">
            <QuestionnaireTitle>¿Qué tipo de servicio ofreces?</QuestionnaireTitle>
            <p className="text-base text-muted-foreground text-center">
              Selecciona todos los que apliquen (puedes saltar este paso).
            </p>

            <QuestionnaireChoices multiple>
              {SERVICE_TYPES.map((type) => (
                <QuestionnaireChoice
                  key={type}
                  value={type}
                  name="serviceTypes"
                  type="checkbox"
                  checked={serviceTypes.includes(type)}
                  onChange={toggleServiceType}
                >
                  {type}
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>

            <QuestionnaireError>{serviceTypesForm.error}</QuestionnaireError>

            <QuestionnaireActions>
              <QuestionnairePrevious />
              <QuestionnaireNext onClick={handleServiceTypesSubmit}>Continuar</QuestionnaireNext>
            </QuestionnaireActions>
          </div>
        </QuestionnaireItem>

        {/* Paso 6: Objetivos (skippable) */}
        <QuestionnaireItem name="goals" required={false}>
          <div className="flex flex-col gap-6">
            <QuestionnaireTitle>¿Cuáles son tus objetivos?</QuestionnaireTitle>
            <p className="text-base text-muted-foreground text-center">
              Selecciona todos los que apliquen (puedes saltar este paso).
            </p>

            <QuestionnaireChoices multiple>
              {GOALS.map((goal) => (
                <QuestionnaireChoice
                  key={goal}
                  value={goal}
                  name="goals"
                  type="checkbox"
                  checked={goals.includes(goal)}
                  onChange={toggleGoal}
                >
                  {goal}
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>

            <QuestionnaireError>{goalsForm.error}</QuestionnaireError>

            <QuestionnaireActions>
              <QuestionnairePrevious />
              <QuestionnaireNext onClick={handleGoalsSubmit}>Continuar</QuestionnaireNext>
            </QuestionnaireActions>
          </div>
        </QuestionnaireItem>

        {/* Paso 7: Bienvenida */}
        <QuestionnaireItem name="welcome" required={false}>
          <div className="flex flex-col gap-6 text-center">
            <QuestionnaireTitle>¡Todo listo!</QuestionnaireTitle>

            <div className="flex items-center justify-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-4 text-base text-emerald-800 dark:text-emerald-300">
              <SparklesIcon className="size-5 shrink-0" />
              <p>
                Te damos la bienvenida a{" "}
                <span className="font-medium">
                  {businessName.trim() || "tu negocio"}
                </span>
                .
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-sky-500/40 bg-sky-500/10 px-5 py-4 text-left text-sm">
              <ClockIcon className="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400" />
              <div className="flex flex-col gap-1">
                <p className="font-medium">Modo práctica activo por 48 horas</p>
                <p className="text-muted-foreground">
                  Durante las próximas 48 horas tus pruebas no contarán en los
                  reportes de operación. Puedes desactivarlo antes en
                  Configuración → Negocio.
                </p>
              </div>
            </div>

            <dl className="space-y-3 text-base">
              <div className="flex items-center justify-center gap-4">
                <dt className="text-muted-foreground">Giro principal</dt>
                <dd className="font-medium capitalize">{businessType || "No especificado"}</dd>
              </div>
              <div className="flex items-center justify-center gap-4">
                <dt className="text-muted-foreground">Negocio</dt>
                <dd className="font-medium">{businessName.trim()}</dd>
              </div>
              <div className="flex items-center justify-center gap-4">
                <dt className="text-muted-foreground">Dirección</dt>
                <dd className="font-medium">
                  {slug || "mi-negocio"}.{tenantDomain}
                </dd>
              </div>
              <div className="flex items-center justify-center gap-4">
                <dt className="text-muted-foreground">Moneda</dt>
                <dd className="font-medium">{currency}</dd>
              </div>
              <div className="flex items-center justify-center gap-4">
                <dt className="text-muted-foreground">Usuario</dt>
                <dd className="font-medium">{username.trim().toLowerCase()}</dd>
              </div>
              {branchName.trim() && (
                <div className="flex items-center justify-center gap-4">
                  <dt className="text-muted-foreground">Sucursal</dt>
                  <dd className="font-medium">{branchName.trim()}</dd>
                </div>
              )}
              {hasBranches && (
                <div className="flex items-center justify-center gap-4">
                  <dt className="text-muted-foreground">Sucursales</dt>
                  <dd className="font-medium">Sí</dd>
                </div>
              )}
              {serviceTypes.length > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <dt className="text-muted-foreground">Tipo de servicio</dt>
                  <dd className="font-medium text-center max-w-md">
                    {serviceTypes.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")}
                  </dd>
                </div>
              )}
              {goals.length > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <dt className="text-muted-foreground">Objetivos</dt>
                  <dd className="font-medium text-center max-w-md">
                    {goals.map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(", ")}
                  </dd>
                </div>
              )}
            </dl>

            <QuestionnaireError>{finishForm.error}</QuestionnaireError>
            <QuestionnaireActions>
              <QuestionnairePrevious />
              <QuestionnaireSubmit
                onClick={handleFinishSubmit}
                disabled={finishForm.pending}
              >
                Ir al panel
              </QuestionnaireSubmit>
            </QuestionnaireActions>
          </div>
        </QuestionnaireItem>
        </div>
      </div>
    </Questionnaire>
  )
}