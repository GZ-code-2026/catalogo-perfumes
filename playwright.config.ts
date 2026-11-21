import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:3100" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    // O mock precisa subir ANTES do build: a home é pré-renderizada e chama a API.
    {
      command: "node e2e/mock-server.mjs",
      url: "http://localhost:4010/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npm run build && npm run start -- -p 3100",
      url: "http://localhost:3100",
      // Nunca reaproveitar: um servidor antigo poderia usar variáveis reais.
      reuseExistingServer: false,
      timeout: 240_000,
      // Vazios ganham do .env.local (o Next não sobrescreve o que já está no ambiente).
      env: {
        TENML_BASE_URL: "http://localhost:4010/tenml",
        FRAGELLA_BASE_URL: "http://localhost:4010/fragella",
        FRAGELLA_API_KEY: "",
        SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
      },
    },
  ],
});
