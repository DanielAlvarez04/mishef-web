/**
 * Borra la copia HTML del POS guardada por el service worker.
 *
 * Es HTML autenticado: se conserva solo para poder reabrir el punto de venta
 * sin red y se elimina al iniciar o cerrar sesión en el mismo dispositivo.
 */
export async function clearPosCache(): Promise<void> {
  if (typeof caches === "undefined") return

  try {
    await caches.delete("np-pos-v1")
  } catch {
    // Cache Storage puede no estar disponible en modo privado.
  }
}
