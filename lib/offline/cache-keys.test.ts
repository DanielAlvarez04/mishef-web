import {
  POS_CACHE_SCOPES,
  parseTenantCacheKey,
  tenantCacheKey,
} from "./cache-keys";

describe("claves de caché por tenant", () => {
  it("incluye organización y sucursal", () => {
    expect(tenantCacheKey("pos.items", "org1", "branch1")).toBe(
      "pos.items@org1:branch1",
    );
  });

  it("marca la sucursal nula como comodín, no como cadena vacía", () => {
    expect(tenantCacheKey("pos.menus", "org1", null)).toBe("pos.menus@org1:*");
    expect(tenantCacheKey("pos.menus", "org1", "  ")).toBe("pos.menus@org1:*");
  });

  it("dos negocios en el mismo dispositivo no comparten clave", () => {
    const a = tenantCacheKey(POS_CACHE_SCOPES.items, "orgA", "sucursal1");
    const b = tenantCacheKey(POS_CACHE_SCOPES.items, "orgB", "sucursal1");

    expect(a).not.toBe(b);
  });

  it("dos sucursales del mismo negocio tampoco comparten clave", () => {
    const a = tenantCacheKey(POS_CACHE_SCOPES.cashSession, "orgA", "sucursal1");
    const b = tenantCacheKey(POS_CACHE_SCOPES.cashSession, "orgA", "sucursal2");

    expect(a).not.toBe(b);
  });

  it("recorta espacios para que no generen claves distintas", () => {
    expect(tenantCacheKey("pos.items", " org1 ", " branch1 ")).toBe(
      "pos.items@org1:branch1",
    );
  });

  it("no confunde el alcance con el identificador", () => {
    expect(tenantCacheKey("pos.items", "org@x", null)).toBe(
      "pos.items@org@x:*",
    );
  });

  it("puede leerse de vuelta", () => {
    expect(parseTenantCacheKey("pos.items@org1:branch1")).toEqual({
      scope: "pos.items",
      organizationId: "org1",
      branchId: "branch1",
    });

    expect(parseTenantCacheKey("pos.items@org1:*")).toEqual({
      scope: "pos.items",
      organizationId: "org1",
      branchId: null,
    });

    expect(parseTenantCacheKey("pos.items")).toBeNull();
  });
});
