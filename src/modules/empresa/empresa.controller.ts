import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { gerarIconeEmpresa } from "../manifest/manifest.service";
import { semCabecalhosDeHtml } from "../../utils/recursoPublico";
import { empresaService } from "./empresa.service";

const empresaIdParam = z.object({ empresaId: z.string().uuid() });
const iconeQuery = z.object({ size: z.coerce.number().int().refine((n) => n === 192 || n === 512) });

const updateEmpresaSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  telefone: z.string().min(8).optional(),
});

const updateConfigSchema = z.object({
  logoUrl: z.string().url().optional(),
  corPrimaria: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "cor deve estar no formato hexadecimal, ex: #FF0000")
    .optional(),
  corSecundaria: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "cor deve estar no formato hexadecimal, ex: #FF0000")
    .optional(),
  corTexto: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "cor deve estar no formato hexadecimal, ex: #FF0000")
    .optional(),
  corFundo: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "cor deve estar no formato hexadecimal, ex: #FF0000")
    .optional(),
  // Fundo do ícone/splash nativa de instalação (diferente de corFundo, que é
  // o fundo das telas dentro do app) — aceita null pra limpar e voltar a
  // seguir a cor primária automaticamente.
  corIconeFundo: z
    .union([
      z.string().regex(/^#[0-9A-Fa-f]{6}$/, "cor deve estar no formato hexadecimal, ex: #FF0000"),
      z.null(),
    ])
    .optional(),
  exibirTotalGasto: z.boolean().optional(),
});

function empresaIdDoContexto(req: Request): string {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth.empresaId;
}

export const empresaController = {
  async getEmpresa(req: Request, res: Response) {
    const empresa = await empresaService.getEmpresa(empresaIdDoContexto(req));
    res.status(200).json(empresa);
  },

  async updateEmpresa(req: Request, res: Response) {
    const dados = updateEmpresaSchema.parse(req.body);
    const empresa = await empresaService.updateEmpresa(empresaIdDoContexto(req), dados);
    res.status(200).json(empresa);
  },

  async getConfig(req: Request, res: Response) {
    const config = await empresaService.getConfig(empresaIdDoContexto(req));
    res.status(200).json(config);
  },

  async updateConfig(req: Request, res: Response) {
    const dados = updateConfigSchema.parse(req.body);
    const config = await empresaService.updateConfig(empresaIdDoContexto(req), dados);
    res.status(200).json(config);
  },

  async getConfigPublica(req: Request, res: Response) {
    const { empresaId } = empresaIdParam.parse(req.params);
    const config = await empresaService.getConfigPublica(empresaId);
    res.status(200).json(config);
  },

  /** Ícone quadrado gerado na hora (logo + fundo na cor primária) — usado
   *  pelo manifesto dinâmico, pra instalação do PWA mostrar a marca certa
   *  de cada padaria mesmo o deploy sendo compartilhado. */
  async getIcone(req: Request, res: Response) {
    const { empresaId } = empresaIdParam.parse(req.params);
    const { size } = iconeQuery.parse(req.query);
    const png = await gerarIconeEmpresa(empresaId, size);
    semCabecalhosDeHtml(res);
    res.set("Content-Type", "image/png");
    // Sem cache: já tomamos um susto com o navegador servindo ícone/cor
    // antigos por até 1h depois de uma correção no backend (justamente
    // durante os testes de instalação do PWA). Gerar o ícone é barato e essa
    // rota só é chamada no momento da instalação (baixo tráfego) — não vale
    // o risco de cache obsoleto pra economizar isso.
    res.set("Cache-Control", "no-store");
    res.status(200).send(png);
  },
};
