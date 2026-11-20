/**
 * Borra las copias HTML autenticadas del POS y la cocina guardadas por el
 * service worker.
 *
 * Son HTML autenticado: se conservan solo para poder reabrir esas pantallas
 * sin red y se eliminan al iniciar o cerrar sesión en el mismo dispositivo.
 */
export async function clearOfflineShells(): Promise<void> {
  if (typeof caches === "undefined") return

  try {
    await Promise.all([
      caches.delete("np-pos-v1"),
      caches.delete("np-kitchen-v1"),
    ])
  } catch {
    // Cache Storage puede no estar disponible en modo privado.
  }
}
