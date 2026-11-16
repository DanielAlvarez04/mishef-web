import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { brandStyle } from "@/lib/brand"
import { fetchPublicMenu } from "@/lib/public-menu"
import { getTenant, getTenantDomain, getTenantSlug } from "@/lib/tenant"

export const metadata: Metadata = {
  title: "Menú",
  robots: { index: true, follow: true },
}

/**
 * Menú digital público.
 *
 * Accesible sin sesión en `slug.mishef.co/menu` o en el dominio propio del
 * negocio (`midominio.com/menu`). Se resuelve por host: el visitante nunca
 * elige el negocio a mano.
 */
export default async function PublicMenuPage() {
  const [tenant, slug, domain] = await Promise.all([
    getTenant(),
    getTenantSlug(),
    getTenantDomain(),
  ])

  if (!tenant) notFound()

  const data = await fetchPublicMenu({ slug, host: domain })

  if (!data) {
    return (
      <main className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-xl font-semibold">{tenant.name}</h1>
        <p className="text-sm text-muted-foreground">
          Este negocio todavía no publicó su menú digital.
        </p>
      </main>
    )
  }

  const brand = data.organization

  return (
    <main
      className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-8 px-5 py-10"
      style={brandStyle(brand.brandColor)}
    >
      <header className="flex flex-col items-center gap-3 text-center">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt=""
            className="size-14 rounded-xl object-cover"
          />
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
        {brand.address ? (
          <p className="text-sm text-muted-foreground">{brand.address}</p>
        ) : null}
      </header>

      {data.menus.map((menu) => (
        <section key={menu.id} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-medium">{menu.name}</h2>
            {menu.description ? (
              <p className="text-sm text-muted-foreground">{menu.description}</p>
            ) : null}
          </div>

          {menu.groups.map((group) => (
            <div key={group.name} className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.name}
              </h3>

              <ul className="flex flex-col divide-y">
                {group.items.map((item) => (
                  <li key={item.id} className="flex gap-3 py-3">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        loading="lazy"
                        className="size-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : null}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-medium">{item.name}</span>
                      {item.description ? (
                        <span className="text-sm text-muted-foreground">
                          {item.description}
                        </span>
                      ) : null}
                    </div>
                    <span className="shrink-0 tabular-nums">
                      ${item.price.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}

      <footer className="mt-auto pt-6 text-center text-xs text-muted-foreground">
        Precios en pesos mexicanos, IVA incluido.
      </footer>
    </main>
  )
}
