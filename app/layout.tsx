import "./globals.css";

import { Inter } from "next/font/google";
import Script from "next/script";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { KeyboardShortcutsProvider } from "@/components/keyboard/keyboard-shortcuts-provider";
import { ThemeShortcut } from "@/components/keyboard/theme-shortcut";
import { CardColumnsScript } from "@/components/card-columns-script";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeScript } from "@/components/theme-script";

import type { Metadata, Viewport } from "next";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Mishef",
  description: "Punto de venta para cafeterías y restaurantes",
  applicationName: "Mishef",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-180.png",
  },
  appleWebApp: {
    capable: true,
    title: "Mishef",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#e2703a",
  width: "device-width",
  initialScale: 1,
  // La barra inferior usa `env(safe-area-inset-bottom)` en iPhone/PWA.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        inter.variable
      )}
    >
      <head>
        <ThemeScript defaultTheme="system" />
        <CardColumnsScript />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider defaultTheme="system" disableTransitionOnChange>
          <KeyboardShortcutsProvider>
            <ThemeShortcut />
            <TooltipProvider>
              {children}
              <Toaster
                position="bottom-right"
                offset={{ bottom: 80, right: 12 }}
              />
            </TooltipProvider>
          </KeyboardShortcutsProvider>
        </ThemeProvider>
        {/*
          Cloudflare Web Analytics (RUM + Core Web Vitals). La inyección
          automática de Cloudflare no entra en las respuestas HTML que Next
          envía en streaming, así que el beacon se carga aquí. `afterInteractive`
          no bloquea el render y el script es asíncrono.
        */}
        {process.env.NODE_ENV === "production" ? (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({
              token: "291a83099c0c4751bf581e99f8eacf3c",
            })}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
