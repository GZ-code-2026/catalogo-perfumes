import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("libera a home e bloqueia detalhe, busca e api", () => {
    const { rules } = robots();
    const regra = Array.isArray(rules) ? rules[0] : rules;
    expect(regra.userAgent).toBe("*");
    expect(regra.allow).toContain("/");
    expect(regra.disallow).toEqual(
      expect.arrayContaining(["/perfume/", "/busca", "/api/"]),
    );
  });
});
