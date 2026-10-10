import { Response } from "express";

/**
 * Remove os cabeçalhos de segurança do helmet() pensados pra documento HTML
 * (CSP, Cross-Origin-*, X-Frame-Options...) de respostas que NÃO são HTML —
 * manifesto do PWA e ícone gerado, aqui. Esses cabeçalhos não têm efeito
 * nenhum de segurança sobre um JSON/PNG, mas podem confundir como o sistema
 * operacional/navegador processa esse recurso na hora de instalar o app
 * (ex.: Cross-Origin-Resource-Policy pensado pra isolar documentos, não pra
 * um recurso que o próprio navegador busca pra montar a splash nativa).
 * Mantém os únicos dois que continuam fazendo sentido pra qualquer resposta:
 * X-Content-Type-Options (evita MIME-sniffing) e HSTS (força HTTPS).
 */
export function semCabecalhosDeHtml(res: Response): void {
  res.removeHeader("Content-Security-Policy");
  res.removeHeader("Cross-Origin-Opener-Policy");
  res.removeHeader("Cross-Origin-Resource-Policy");
  res.removeHeader("Cross-Origin-Embedder-Policy");
  res.removeHeader("Origin-Agent-Cluster");
  res.removeHeader("X-Frame-Options");
  res.removeHeader("X-DNS-Prefetch-Control");
  res.removeHeader("X-Download-Options");
  res.removeHeader("X-Permitted-Cross-Domain-Policies");
  res.removeHeader("X-XSS-Protection");
}
