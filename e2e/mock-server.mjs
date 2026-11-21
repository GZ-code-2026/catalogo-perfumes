// Servidor simulado da API da 10ML, usado só nos testes ponta a ponta.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const PORTA = 4010;
const lerFixture = (nome) =>
  readFileSync(new URL(`./fixtures/${nome}`, import.meta.url), "utf-8");

function responder(res, status, corpo) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(typeof corpo === "string" ? corpo : JSON.stringify(corpo));
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORTA}`);
  const caminho = url.pathname;

  if (req.method === "GET" && caminho === "/health") return responder(res, 200, { ok: true });

  if (req.method === "GET" && caminho === "/tenml/perfumes") {
    const arquivo = url.searchParams.get("iconic") === "true" ? "iconic.json" : "search-sauvage.json";
    return responder(res, 200, lerFixture(arquivo));
  }
  if (req.method === "GET" && caminho === "/tenml/perfumes/dior-sauvage-edp") {
    return responder(res, 200, lerFixture("detail-dior-sauvage-edp.json"));
  }
  responder(res, 404, { error: "not found" });
}).listen(PORTA, () => console.log(`Mock da 10ML em http://localhost:${PORTA}`));
