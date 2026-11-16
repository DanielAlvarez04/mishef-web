/**
 * Claves de caché aisladas por negocio y sucursal.
 *
 * Un mismo dispositivo puede usarse con dos cuentas (por ejemplo, un tablet
 * compartido o un cambio de turno). Si las claves no llevan la organización y
 * la sucursal, el POS de un negocio podría pintar el catálogo de otro.
 *
 * Formato: `pos.items@<organizationId>:<branchId|*>`.
 */

const SEPARATOR = "@";
const BRANCH_WILDCARD = "*";

export function tenantCacheKey(
  scope: string,
  organizationId: string,
  branchId: string | null | undefined,
): string {
  const organization = organizationId.trim();
  const branch = branchId?.trim() || BRANCH_WILDCARD;

  return `${scope}${SEPARATOR}${organization}:${branch}`;
}

/** Lee la organización y sucursal de una clave; `null` si no es de tenant. */
export function parseTenantCacheKey(
  key: string,
): { scope: string; organizationId: string; branchId: string | null } | null {
  const at = key.lastIndexOf(SEPARATOR);
  if (at <= 0) return null;

  const scope = key.slice(0, at);
  const rest = key.slice(at + 1);
  const colon = rest.indexOf(":");

  if (colon <= 0) return null;

  const organizationId = rest.slice(0, colon);
  const branch = rest.slice(colon + 1);

  return {
    scope,
    organizationId,
    branchId: branch === BRANCH_WILDCARD ? null : branch,
  };
}

export const POS_CACHE_SCOPES = {
  items: "pos.items",
  categories: "pos.categories",
  menus: "pos.menus",
  cashSession: "pos.cashSession",
} as const;
