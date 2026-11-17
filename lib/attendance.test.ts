import { shiftDuration } from "./attendance"

describe("attendance — duración de turnos", () => {
  it("formatea un turno cerrado en horas y minutos", () => {
    expect(
      shiftDuration("2026-11-17T10:00:00.000Z", "2026-11-17T12:30:00.000Z")
    ).toBe("2h 30m")
  })

  it("formatea un turno corto en minutos", () => {
    expect(
      shiftDuration("2026-11-17T10:00:00.000Z", "2026-11-17T10:45:00.000Z")
    ).toBe("45m")
  })

  it("calcula el tiempo transcurrido de un turno abierto", () => {
    const start = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    expect(shiftDuration(start, null)).not.toBe("en curso")
    expect(shiftDuration(start, null)).toMatch(/^2h \d+m$/)
  })
})
