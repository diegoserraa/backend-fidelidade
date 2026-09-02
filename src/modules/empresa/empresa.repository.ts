import { query } from "../../config/db";

export interface EmpresaRow {
  id: string;
  nome: string;
  cnpj: string;
  email: string | null;
  telefone: string | null;
  status: string;
}

export interface EmpresaConfigRow {
  empresa_id: string;
  logo_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  cor_texto: string;
  cor_fundo: string;
  exibir_total_gasto: boolean;
}

export const empresaRepository = {
  async findById(id: string): Promise<EmpresaRow | null> {
    const { rows } = await query<EmpresaRow>(
      `SELECT id, nome, cnpj, email, telefone, status FROM empresa WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async update(
    id: string,
    dados: { nome?: string; email?: string; telefone?: string }
  ): Promise<EmpresaRow> {
    const { rows } = await query<EmpresaRow>(
      `UPDATE empresa
          SET nome = COALESCE($2, nome),
              email = COALESCE($3, email),
              telefone = COALESCE($4, telefone),
              updated_at = now()
        WHERE id = $1
        RETURNING id, nome, cnpj, email, telefone, status`,
      [id, dados.nome ?? null, dados.email ?? null, dados.telefone ?? null]
    );
    return rows[0];
  },

  async findConfig(empresaId: string): Promise<EmpresaConfigRow | null> {
    const { rows } = await query<EmpresaConfigRow>(
      `SELECT empresa_id, logo_url, cor_primaria, cor_secundaria, cor_texto, cor_fundo, exibir_total_gasto
         FROM empresa_config
        WHERE empresa_id = $1`,
      [empresaId]
    );
    return rows[0] ?? null;
  },

  async upsertConfig(
    empresaId: string,
    dados: {
      logoUrl?: string;
      corPrimaria?: string;
      corSecundaria?: string;
      corTexto?: string;
      corFundo?: string;
      exibirTotalGasto?: boolean;
    }
  ): Promise<EmpresaConfigRow> {
    const { rows } = await query<EmpresaConfigRow>(
      `INSERT INTO empresa_config
         (empresa_id, logo_url, cor_primaria, cor_secundaria, cor_texto, cor_fundo, exibir_total_gasto)
       VALUES ($1, $2, COALESCE($3, '#000000'), COALESCE($4, '#FFFFFF'), COALESCE($5, '#FFFFFF'), COALESCE($6, '#FFFFFF'), COALESCE($7, true))
       ON CONFLICT (empresa_id) DO UPDATE
          SET logo_url = COALESCE($2, empresa_config.logo_url),
              cor_primaria = COALESCE($3, empresa_config.cor_primaria),
              cor_secundaria = COALESCE($4, empresa_config.cor_secundaria),
              cor_texto = COALESCE($5, empresa_config.cor_texto),
              cor_fundo = COALESCE($6, empresa_config.cor_fundo),
              exibir_total_gasto = COALESCE($7, empresa_config.exibir_total_gasto),
              updated_at = now()
       RETURNING empresa_id, logo_url, cor_primaria, cor_secundaria, cor_texto, cor_fundo, exibir_total_gasto`,
      [
        empresaId,
        dados.logoUrl ?? null,
        dados.corPrimaria ?? null,
        dados.corSecundaria ?? null,
        dados.corTexto ?? null,
        dados.corFundo ?? null,
        dados.exibirTotalGasto ?? null,
      ]
    );
    return rows[0];
  },
};
