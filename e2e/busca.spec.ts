import { expect, test } from "@playwright/test";

test("busca, resultados e detalhe do perfume", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Vitrine" })).toBeVisible();

  await page.getByLabel("Buscar perfume").fill("sauvage");
  const sugestao = page.getByRole("option", { name: /Sauvage Eau de Parfum/ });
  await expect(sugestao).toBeVisible();

  await page.getByLabel("Buscar perfume").press("Enter");
  await expect(page).toHaveURL(/\/busca\?q=sauvage/);
  const card = page.getByRole("link", { name: /Sauvage Eau de Parfum/ });
  await expect(card).toBeVisible();

  await card.click();
  await expect(page).toHaveURL(/\/perfume\/dior-sauvage-edp/);
  await expect(page.getByRole("heading", { level: 1, name: "Sauvage Eau de Parfum" })).toBeVisible();
  await expect(page.getByText("Topo")).toBeVisible();
  await expect(page.getByRole("img").first()).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("Data: 10ML Fragrance Index");
});

test("perfume inexistente mostra a página 404", async ({ page }) => {
  await page.goto("/perfume/nao-existe");
  await expect(page.getByRole("heading", { name: "Perfume não encontrado" })).toBeVisible();
});
