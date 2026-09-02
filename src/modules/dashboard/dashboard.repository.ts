import { query } from "../../config/db";

export interface DashboardIndicadores {
  clientes: number;
  compras: number;
  valorMovimentado: number;
  pontosDistribuidos: number;
  pontosResgatados: number;
  recompensasResgatadas: number;
}

export const dashboardRepository = {
  async indicadores(empresaId: string): Promise<DashboardIndicadores> {
    const { rows } = await query<{
      clientes: string;
      compras: string;
      valor_movimentado: string;
      pontos_distribuidos: string;
      pontos_resgatados: string;
      recompensas_resgatadas: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM cliente_empresa WHERE empresa_id = $1)::text AS clientes,
         (SELECT COUNT(*) FROM compra WHERE empresa_id = $1)::text AS compras,
         (SELECT COALESCE(SUM(valor), 0) FROM compra WHERE empresa_id = $1)::text AS valor_movimentado,
         (SELECT COALESCE(SUM(pontos_gerados), 0) FROM compra WHERE empresa_id = $1)::text AS pontos_distribuidos,
         (SELECT COALESCE(SUM(pontos_utilizados), 0) FROM resgate WHERE empresa_id = $1)::text AS pontos_resgatados,
         (SELECT COUNT(*) FROM resgate WHERE empresa_id = $1)::text AS recompensas_resgatadas`,
      [empresaId]
    );

    const row = rows[0];
    return {
      clientes: Number(row.clientes),
      compras: Number(row.compras),
      valorMovimentado: Number(row.valor_movimentado),
      pontosDistribuidos: Number(row.pontos_distribuidos),
      pontosResgatados: Number(row.pontos_resgatados),
      recompensasResgatadas: Number(row.recompensas_resgatadas),
    };
  },
};
