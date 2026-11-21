import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CHAVE = "chave-secreta-de-teste";
const subject = { id: "p1", name: "Sauvage", house: "Dior", concentration: "EDT" };

async function carregar() {
  const mod = await import("./index");
  return mod.getPhotoService();
}

describe("getPhotoService com Supabase mal configurado", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", CHAVE);
    vi.stubEnv("FRAGELLA_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("não deveria chamar a rede");
    }));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.doUnmock("./supabase-store");
    vi.restoreAllMocks();
  });

  it("só o ID do projeto (sem https://) vira serviço sem cache, sem erro", async () => {
    vi.stubEnv("SUPABASE_URL", "abcdefghijklmnop");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const service = await carregar();
    expect(await service.getPhoto(subject, { allowFetch: true })).toBeNull();
    expect((await service.getPhotosCacheOnly([subject])).get("p1")).toBeNull();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("SUPABASE_URL"));
    expect(JSON.stringify(spy.mock.calls)).not.toContain(CHAVE);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("URL http:// também é tratada como inválida", async () => {
    vi.stubEnv("SUPABASE_URL", "http://abc.supabase.co");
    const criar = vi.fn();
    vi.doMock("./supabase-store", () => ({ createSupabaseStore: criar }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const service = await carregar();
    expect(criar).not.toHaveBeenCalled();
    expect(await service.getPhoto(subject, { allowFetch: true })).toBeNull();
  });

  it("se criar o cliente do Supabase lançar erro, segue sem cache", async () => {
    vi.stubEnv("SUPABASE_URL", "https://abc.supabase.co");
    vi.doMock("./supabase-store", () => ({
      createSupabaseStore: () => {
        throw new Error("Invalid supabaseUrl");
      },
    }));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const service = await carregar();
    expect(await service.getPhoto(subject, { allowFetch: true })).toBeNull();
    expect(spy).toHaveBeenCalled();
    expect(JSON.stringify(spy.mock.calls)).not.toContain(CHAVE);
  });

  it("URL https:// válida cria o store normalmente", async () => {
    vi.stubEnv("SUPABASE_URL", "https://abc.supabase.co");
    const criar = vi.fn(() => ({}));
    vi.doMock("./supabase-store", () => ({ createSupabaseStore: criar }));
    await carregar();
    expect(criar).toHaveBeenCalledWith("https://abc.supabase.co", CHAVE);
  });
});
