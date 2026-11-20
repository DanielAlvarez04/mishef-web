import {
  isPdvTerminal,
  supportsTerminalTips,
} from "./mercadopago"

describe("compatibilidad de terminales Point", () => {
  it("solo Smart 2 captura propina", () => {
    expect(supportsTerminalTips("SMART_2")).toBe(true)
    expect(supportsTerminalTips("SMART_1")).toBe(false)
    expect(supportsTerminalTips("AIR_2")).toBe(false)
    expect(supportsTerminalTips(null)).toBeNull()
  })

  it("solo las terminales PDV se ofrecen en el POS", () => {
    expect(isPdvTerminal({ model: "SMART_1", operatingMode: "PDV" })).toBe(true)
    expect(isPdvTerminal({ model: "SMART_2", operatingMode: "PDV" })).toBe(true)
    expect(isPdvTerminal({ model: "SMART_2", operatingMode: "STANDALONE" })).toBe(false)
    expect(isPdvTerminal({ model: "AIR_2", operatingMode: "PDV" })).toBe(false)
  })
})
