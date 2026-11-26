import type { NextConfig } from "next";

/**
 * Dominio público de R2, si está configurado.
 *
 * Las imágenes de catálogo viven en un bucket de Cloudflare R2 y se sirven
 * desde su dominio público; hay que autorizarlo para poder usar `next/image`.
 */
function r2RemotePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim();

  if (!base) return [];

  try {
    const url = new URL(base);
    const pathname = url.pathname.replace(/\/+$/, "");

    return [
      {
        protocol: url.protocol === "http:" ? "http" : "https",
        hostname: url.hostname,
        port: url.port,
        pathname: `${pathname}/**`,
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // Enable React Strict Mode
  reactStrictMode: true,
  // Genera `.next/standalone`: un servidor Node autocontenido que solo
  // necesita `public/` y `.next/static/`. Es lo que copia el Dockerfile.
  output: "standalone",
  experimental: {
    // Marca la app como actualizada por el flujo de seguridad de Next.
    agentUpgrade: "security",
    // Todo el panel es dinámico (datos por usuario), y por defecto el cliente
    // no reutiliza nada: cada ida y vuelta espera al servidor. Con 15 s, volver
    // a una pestaña recién vista es instantáneo y las mutaciones siguen
    // invalidando con `revalidatePath`.
    staleTimes: {
      // En desarrollo no se reutiliza nada: evita tener que hacer hard reload
      // para ver cambios. En producción 15 s para navegación instantánea.
      dynamic: process.env.NODE_ENV === "development" ? 0 : 15,
    },
  },
  images: {
    remotePatterns: r2RemotePatterns(),
  },
  async headers() {
    return [
      {
        // El service worker debe revalidarse siempre para recibir versiones
        // nuevas (plan.md §7).
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        // El manifest también se revalida para que Chrome detecte antes los
        // cambios de identidad (icono, nombre y modo de pantalla).
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
