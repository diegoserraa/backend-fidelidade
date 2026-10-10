import { query } from "../../config/db";

export interface NivelConfigRow {
  nome: string;
  min: number;
}

export interface ProgramaFidelidadeRow {
  empresa_id: string;
  valor_por_ponto: string; // NUMERIC vem como string do pg
  pontos_por_ciclo: number;
  ativo: boolean;
  niveis: NivelConfigRow[] | null;
}

export const programaFidelidadeRepository = {
  async find(empresaId: string): Promise<ProgramaFidelidadeRow | null> {
    const { rows } = await query<ProgramaFidelidadeRow>(
      `SELECT empresa_id, valor_por_ponto, pontos_por_ciclo, ativo, niveis
         FROM programa_fidelidade
        WHERE empresa_id = $1`,
      [empresaId]
    );
    return rows[0] ?? null;
  },

  async upsert(
    empresaId: string,
    dados: {
      valorPorPonto?: number;
      pontosPorCiclo?: number;
      ativo?: boolean;
      niveis?: NivelConfigRow[] | null;
    }
  ): Promise<ProgramaFidelidadeRow> {
    // `niveis` pode ser explicitamente limpo (null, volta pro padrão) —
    // diferente de "não mexer" (undefined) — por isso o CASE WHEN em vez de
    // um simples COALESCE, que trataria null como "mantém o atual" (mesmo
    // padrão já usado em promocoes.repository.ts pra `validade`).
    const { rows } = await query<ProgramaFidelidadeRow>(
      `INSERT INTO programa_fidelidade (empresa_id, valor_por_ponto, pontos_por_ciclo, ativo, niveis)
       VALUES ($1, COALESCE($2, 1.00), COALESCE($3, 1), COALESCE($4, true), $5)
       ON CONFLICT (empresa_id) DO UPDATE
          SET valor_por_ponto = COALESCE($2, programa_fidelidade.valor_por_ponto),
              pontos_por_ciclo = COALESCE($3, programa_fidelidade.pontos_por_ciclo),
              ativo = COALESCE($4, programa_fidelidade.ativo),
              niveis = CASE WHEN $6 THEN $5 ELSE programa_fidelidade.niveis END,
              updated_at = now()
       RETURNING empresa_id, valor_por_ponto, pontos_por_ciclo, ativo, niveis`,
      [
        empresaId,
        dados.valorPorPonto ?? null,
        dados.pontosPorCiclo ?? null,
        dados.ativo ?? null,
        dados.niveis !== undefined ? JSON.stringify(dados.niveis) : null,
        "niveis" in dados,
      ]
    );
    return rows[0];
  },
};
