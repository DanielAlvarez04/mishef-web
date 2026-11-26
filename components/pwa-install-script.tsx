"use client"

import { PWA_INSTALL_CAPTURE_SCRIPT } from "@/lib/pwa"

/**
 * Captura `beforeinstallprompt` durante el parseo del HTML, antes de que React
 * hidrate y monte el aviso de instalación.
 *
 * En el cliente se renderiza como `text/plain` para que React no lo ejecute ni
 * avise por el `<script>`, igual que `ThemeScript`.
 */
export function PwaInstallScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      // El contenido es estático: no se interpola nada del usuario.
      dangerouslySetInnerHTML={{ __html: PWA_INSTALL_CAPTURE_SCRIPT }}
    />
  )
}
