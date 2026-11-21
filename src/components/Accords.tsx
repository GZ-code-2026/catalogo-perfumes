import { t } from "@/lib/i18n/terms";

function comMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Acordes na ordem recebida (do mais forte para o mais fraco).
// A 10ML só dá a ordem, então a barra diminui por posição, sem porcentagem.
export function Accords({ accords }: { accords: string[] }) {
  if (accords.length === 0) return null;

  return (
    <ul className="space-y-2">
      {accords.map((acorde, posicao) => {
        const largura = Math.max(30, 100 - posicao * 10);
        return (
          <li key={acorde} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-sm text-ink">{comMaiuscula(t("accord", acorde))}</span>
            <span className="h-1.5 flex-1" aria-hidden="true">
              <span
                className="block h-full rounded-sm bg-brass"
                style={{ width: `${largura}%`, opacity: Math.max(0.35, 1 - posicao * 0.1) }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
