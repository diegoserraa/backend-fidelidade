import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";

export function notFoundMiddleware(_req: Request, res: Response): void {
  res.status(404).json({ erro: "Rota não encontrada." });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      erro: "Dados inválidos.",
      detalhes: err.flatten(),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      erro: err.message,
      ...(err.details ? { detalhes: err.details } : {}),
    });
    return;
  }

  // Violação de constraint UNIQUE do PostgreSQL (ex.: idempotency_key duplicada
  // sem tratamento explícito, CNPJ/email já cadastrado etc.)
  if (isPgUniqueViolation(err)) {
    res.status(409).json({ erro: "Já existe um registro com esses dados." });
    return;
  }

  // Log com prefixo + código do driver (ex.: "28P01" senha errada,
  // "3D000" banco não existe, "42P01" tabela não migrada) para achar rápido
  // a causa nos logs do Render.
  const pgCode = (err as { code?: string })?.code;
  // eslint-disable-next-line no-console
  console.error(`[erro 500]${pgCode ? ` pg=${pgCode}` : ""}`, err);
  res.status(500).json({ erro: "Erro interno do servidor." });
}

function isPgUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
