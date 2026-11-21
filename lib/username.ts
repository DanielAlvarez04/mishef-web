/** Igual que en la API: se comparan y guardan siempre en minúsculas. */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export interface UsernameAvailability {
  username: string
  available: boolean
  reason?: "taken" | "invalid"
  message?: string
}

export interface UsernameSuggestion {
  username: string
}

const USERNAME_LOCAL_PATTERN = /^[a-z0-9._-]+$/

/**
 * Username local del negocio: 3–32 caracteres, sin `@dominio`.
 *
 * Debe coincidir con `isValidUsername` de la API.
 */
export function isValidUsername(value: string): boolean {
  return (
    value.length >= 3 &&
    value.length <= 32 &&
    USERNAME_LOCAL_PATTERN.test(value)
  )
}
