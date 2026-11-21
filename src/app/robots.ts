import type { MetadataRoute } from "next";

// Mantém os buscadores fora das páginas de detalhe, busca e api.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/perfume/", "/busca", "/api/"],
    },
  };
}
