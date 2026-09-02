/**
 * Catálogo fixo de módulos configuráveis por atendente. Gestor sempre tem
 * acesso total e não passa por esta lista (ver requirePermission).
 */
export const RECURSOS = [
  "balcao",
  "clientes",
  "compras",
  "recompensas",
  "programa",
  "promocoes",
] as const;

export type Recurso = (typeof RECURSOS)[number];

export function isRecurso(valor: string): valor is Recurso {
  return (RECURSOS as readonly string[]).includes(valor);
}
