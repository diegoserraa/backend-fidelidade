import { query } from "../../config/db";

export interface ProgramaFidelidadeRow {
  empresa_id: string;
  valor_por_ponto: string; // NUMERIC vem como string do pg
  pontos_por_ciclo: number;
  ativo: boolean;
}

export const programaFidelidadeRepository = {
  async find(empresaId: string): Promise<ProgramaFidelidadeRow | null> {
    const { rows } = await query<ProgramaFidelidadeRow>(
      `SELECT empresa_id, valor_por_ponto, pontos_por_ciclo, ativo
         FROM programa_fidelidade
        WHERE empresa_id = $1`,
      [empresaId]
    );
    return rows[0] ?? null;
  },

  async upsert(
    empresaId: string,
    dados: { valorPorPonto?: number; pontosPorCiclo?: number; ativo?: boolean }
  ): Promise<ProgramaFidelidadeRow> {
    const { rows } = await query<ProgramaFidelidadeRow>(
      `INSERT INTO programa_fidelidade (empresa_id, valor_por_ponto, pontos_por_ciclo, ativo)
       VALUES ($1, COALESCE($2, 1.00), COALESCE($3, 1), COALESCE($4, true))
       ON CONFLICT (empresa_id) DO UPDATE
          SET valor_por_ponto = COALESCE($2, programa_fidelidade.valor_por_ponto),
              pontos_por_ciclo = COALESCE($3, programa_fidelidade.pontos_por_ciclo),
              ativo = COALESCE($4, programa_fidelidade.ativo),
              updated_at = now()
       RETURNING empresa_id, valor_por_ponto, pontos_por_ciclo, ativo`,
      [empresaId, dados.valorPorPonto ?? null, dados.pontosPorCiclo ?? null, dados.ativo ?? null]
    );
    return rows[0];
  },
};
