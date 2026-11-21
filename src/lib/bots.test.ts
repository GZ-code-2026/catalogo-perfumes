import { isBot } from "./bots";

const CHROME_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

describe("isBot", () => {
  it("detecta crawlers de busca", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
  });

  it("detecta o preview do WhatsApp", () => {
    expect(isBot("WhatsApp/2.23")).toBe(true);
  });

  it("detecta o preview do Facebook", () => {
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
  });

  it("trata UA vazio como robô", () => {
    expect(isBot("")).toBe(true);
  });

  it("trata UA ausente como robô", () => {
    expect(isBot(null)).toBe(true);
    expect(isBot(undefined)).toBe(true);
  });

  it("não marca o Chrome desktop como robô", () => {
    expect(isBot(CHROME_DESKTOP)).toBe(false);
  });

  it("não marca o Safari do iPhone como robô", () => {
    expect(isBot(SAFARI_IPHONE)).toBe(false);
  });
});
