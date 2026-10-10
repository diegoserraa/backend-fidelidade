import sharp from "sharp";
import { empresaService } from "../empresa/empresa.service";

const FETCH_TIMEOUT_MS = 5000;
const PADDING_RATIO = 0.15; // 15% de margem de cada lado, logo ocupa ~70% do quadrado

function hexParaRgb(hex: string): { r: number; g: number; b: number; alpha: number } {
  const limpo = hex.replace("#", "");
  const r = parseInt(limpo.slice(0, 2), 16);
  const g = parseInt(limpo.slice(2, 4), 16);
  const b = parseInt(limpo.slice(4, 6), 16);
  return { r, g, b, alpha: 1 };
}

async function buscarImagem(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    return Buffer.from(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Muitas logos já vêm com um fundo sólido próprio (em vez de transparente) —
 * nesse caso, pintar o quadrado do ícone com a cor primária da empresa cria
 * um "quadrado dentro de quadrado" feio (a borda do fundo da logo aparece).
 * Pra evitar isso, tenta descobrir essa cor de fundo amostrando os 4 cantos
 * da imagem (onde a arte do logo normalmente não chega) e usa ela no lugar —
 * assim a logo se funde com o fundo do ícone. Se os cantos forem
 * transparentes (logo já tem fundo transparente de verdade, caso ideal) ou a
 * imagem não puder ser lida, devolve null pra quem chamou usar o fallback
 * (cor primária configurada).
 */
async function corDeFundoDaLogo(logoBuffer: Buffer): Promise<{ r: number; g: number; b: number } | null> {
  try {
    const img = sharp(logoBuffer).ensureAlpha();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    if (!width || !height) return null;

    const cantos: Array<[number, number]> = [
      [0, 0],
      [width - 1, 0],
      [0, height - 1],
      [width - 1, height - 1],
    ];
    const amostras = cantos
      .map(([x, y]) => {
        const i = (y * width + x) * channels;
        return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
      })
      .filter((amostra) => amostra.a > 240); // ignora cantos transparentes

    if (amostras.length === 0) return null;

    const soma = amostras.reduce(
      (acc, a) => ({ r: acc.r + a.r, g: acc.g + a.g, b: acc.b + a.b }),
      { r: 0, g: 0, b: 0 }
    );
    return {
      r: Math.round(soma.r / amostras.length),
      g: Math.round(soma.g / amostras.length),
      b: Math.round(soma.b / amostras.length),
    };
  } catch {
    return null;
  }
}

/**
 * Cor de fundo efetiva do ícone/splash da empresa: a do próprio fundo da
 * logo quando dá pra descobrir, senão a cor primária configurada no painel.
 * Usada tanto pelo ícone (`gerarIconeEmpresa`) quanto pelo manifesto
 * (`background_color`, usada pela tela de splash nativa) — precisam bater,
 * senão o efeito de "quadrado dentro de quadrado" volta na splash mesmo com
 * o ícone certo.
 */
async function corDeFundoEfetiva(
  logoUrl: string | null | undefined,
  corPrimaria: string | null | undefined
): Promise<{ rgb: { r: number; g: number; b: number }; hex: string }> {
  const fallback = hexParaRgb(corPrimaria ?? "#000000");
  const logoBuffer = logoUrl ? await buscarImagem(logoUrl) : null;
  const daLogo = logoBuffer ? await corDeFundoDaLogo(logoBuffer) : null;
  const rgb = daLogo ?? fallback;
  const hex =
    "#" +
    [rgb.r, rgb.g, rgb.b]
      .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0"))
      .join("");
  return { rgb, hex };
}

/**
 * Gera um ícone quadrado (fundo sólido + a logo centralizada) a partir da
 * logo que a padaria já configurou — não precisa de upload separado. Se a
 * logo não existir ou não puder ser lida/baixada (ex.: URL externa fora do
 * ar), devolve só o quadrado colorido — nunca quebra a geração do manifesto
 * por causa disso.
 */
export async function gerarIconeEmpresa(empresaId: string, size: number): Promise<Buffer> {
  const config = await empresaService.getConfigPublica(empresaId);
  const { rgb } = await corDeFundoEfetiva(config.logoUrl, config.corPrimaria);

  const base = sharp({
    create: { width: size, height: size, channels: 4, background: { ...rgb, alpha: 1 } },
  });

  const logoBuffer = config.logoUrl ? await buscarImagem(config.logoUrl) : null;
  if (!logoBuffer) {
    return base.png().toBuffer();
  }

  const padding = Math.round(size * PADDING_RATIO);
  const areaUtil = size - padding * 2;

  try {
    const logoRedimensionada = await sharp(logoBuffer)
      .resize(areaUtil, areaUtil, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    return base.composite([{ input: logoRedimensionada, left: padding, top: padding }]).png().toBuffer();
  } catch {
    // Logo configurada não é uma imagem válida/suportada — mesmo fallback.
    return base.png().toBuffer();
  }
}

/**
 * Monta o Web App Manifest na hora, com a identidade da empresa resolvida
 * pelo `?empresa=` — diferente do manifest.json estático (compartilhado
 * entre todas as padarias), esse é gerado por requisição, então cada
 * padaria instala com a própria logo/cor, mesmo o deploy sendo um só.
 * Sem empresa (ou empresa não encontrada), cai no genérico do Fideliza+.
 */
export async function gerarManifestoEmpresa(empresaId: string | null, apiUrl: string) {
  const manifestoGenerico = {
    id: "/app/",
    name: "Fideliza+",
    short_name: "Fideliza+",
    description: "Seu cartão de fidelidade, recompensas e extrato de pontos.",
    theme_color: "#000000",
    background_color: "#ffffff",
    display: "standalone" as const,
    orientation: "portrait" as const,
    scope: "/",
    start_url: "/app/",
    icons: [
      { src: "/pwa-icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/pwa-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: "/pwa-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };

  if (!empresaId) return manifestoGenerico;

  try {
    const config = await empresaService.getConfigPublica(empresaId);
    const iconeUrl = (size: number) => `${apiUrl}/empresa/${empresaId}/icone.png?size=${size}`;
    const { hex: corDeFundo } = await corDeFundoEfetiva(config.logoUrl, config.corPrimaria);
    return {
      id: "/app/",
      name: `${config.nome} — Fidelidade`,
      short_name: config.nome.length > 20 ? "Meus Pontos" : config.nome,
      description: "Seu cartão de fidelidade, recompensas e extrato de pontos.",
      theme_color: config.corPrimaria ?? "#000000",
      background_color: corDeFundo,
      display: "standalone" as const,
      orientation: "portrait" as const,
      scope: "/",
      start_url: `/app/?empresa=${empresaId}`,
      icons: [
        { src: iconeUrl(192), sizes: "192x192", type: "image/png", purpose: "any" },
        { src: iconeUrl(512), sizes: "512x512", type: "image/png", purpose: "any" },
        { src: iconeUrl(512), sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    };
  } catch {
    // Empresa inexistente/inativa — não quebra a instalação, só cai no genérico.
    return manifestoGenerico;
  }
}
