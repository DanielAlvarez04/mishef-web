import type { MetadataRoute } from "next"

/**
 * Manifest de instalación de la PWA (plan.md §7).
 *
 * `start_url` apunta al panel: si no hay sesión, el layout autenticado
 * redirige a `/login`, así que la app instalada siempre aterriza en un sitio
 * válido.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mishef",
    short_name: "Mishef",
    description:
      "Punto de venta, cocina, catálogo e inventario para cafeterías y restaurantes.",
    lang: "es",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    // En Android/Chrome abre sin barras del sistema; iOS usa el modo
    // `standalone` como respaldo (no admite fullscreen en PWA).
    display_override: ["fullscreen", "standalone"],
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    categories: ["business", "food", "productivity"],
    icons: [
      {
        src: "/icons/icon-192-v2.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Punto de venta",
        short_name: "POS",
        url: "/pos",
      },
      {
        name: "Cocina",
        short_name: "Cocina",
        url: "/kitchen",
      },
    ],
  }
}
