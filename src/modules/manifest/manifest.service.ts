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
 * Gera um ícone quadrado (fundo sólido + a logo centralizada) a partir da
 * logo que a padaria já configurou — não precisa de upload separado. O fundo
 * usa `corIconeFundo` (configurável no painel, com conta-gotas pra pegar a
 * cor certa direto da logo — diferente de `corFundo`, que é o fundo das
 * telas DENTRO do app): muitas logos já vêm com um fundo sólido próprio, e
 * pintar o quadrado do ícone com uma cor diferente da logo cria um "quadrado
 * dentro de quadrado" feio. Se a logo não existir ou não puder ser
 * lida/baixada (ex.: URL externa fora do ar), devolve só o quadrado
 * colorido — nunca quebra a geração do manifesto por causa disso.
 */
export async function gerarIconeEmpresa(empresaId: string, size: number): Promise<Buffer> {
  const config = await empresaService.getConfigPublica(empresaId);
  const corFundo = hexParaRgb(config.corIconeFundo);

  const base = sharp({
    create: { width: size, height: size, channels: 4, background: corFundo },
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
    // Endereço PRÓPRIO por empresa (/app/<id>/, não /app/?empresa=<id>) — e
    // `scope` igual a ele, não "/" compartilhado. O Android usa origem +
    // escopo (não só o `id`) pra decidir se um link pertence a um app já
    // instalado; com `scope: "/"` igual pra todas as padarias, escanear a
    // segunda abria dentro do app já instalado da primeira em vez de
    // oferecer uma instalação nova e separada.
    const baseUrl = `/app/${empresaId}/`;
    return {
      id: baseUrl,
      name: `${config.nome} — Fidelidade`,
      short_name: config.nome.length > 20 ? "Meus Pontos" : config.nome,
      description: "Seu cartão de fidelidade, recompensas e extrato de pontos.",
      theme_color: config.corPrimaria ?? "#000000",
      background_color: config.corIconeFundo,
      display: "standalone" as const,
      orientation: "portrait" as const,
      scope: baseUrl,
      start_url: baseUrl,
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
