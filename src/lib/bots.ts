// Detecta robôs, crawlers e bots de preview de links (WhatsApp, Facebook etc.)
// para que eles não gastem a cota de fotos da Fragella.
const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|discord|slack|twitter|preview|headless|lighthouse|curl|wget|python|axios|node-fetch|go-http/i;

// UA vazio ou ausente é tratado como robô (conservador).
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return BOT_PATTERN.test(userAgent);
}
