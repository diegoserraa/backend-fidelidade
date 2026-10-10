import { NivelConfigRow, programaFidelidadeRepository } from "./programaFidelidade.repository";

const DEFAULT_VALOR_POR_PONTO = 1.0;
const DEFAULT_PONTOS_POR_CICLO = 1;

/** Usado quando a empresa nunca configurou níveis próprios — mesmo texto que
 *  já existia fixo no código antes desta ficar configurável. */
export const DEFAULT_NIVEIS: NivelConfigRow[] = [
  { nome: "Pãozinho", min: 0 },
  { nome: "Baguete", min: 300 },
  { nome: "Mestre Padeiro", min: 1200 },
];

interface RegraProgramaFidelidade {
  empresaId: string;
  valorPorPonto: number;
  pontosPorCiclo: number;
  ativo: boolean;
  niveis: NivelConfigRow[];
}

export const programaFidelidadeService = {
  async get(empresaId: string): Promise<RegraProgramaFidelidade> {
    const regra = await programaFidelidadeRepository.find(empresaId);
    if (!regra) {
      return {
        empresaId,
        valorPorPonto: DEFAULT_VALOR_POR_PONTO,
        pontosPorCiclo: DEFAULT_PONTOS_POR_CICLO,
        ativo: true,
        niveis: DEFAULT_NIVEIS,
      };
    }
    return {
      empresaId: regra.empresa_id,
      valorPorPonto: Number(regra.valor_por_ponto),
      pontosPorCiclo: regra.pontos_por_ciclo,
      ativo: regra.ativo,
      niveis: regra.niveis ?? DEFAULT_NIVEIS,
    };
  },

  async update(
    empresaId: string,
    dados: {
      valorPorPonto?: number;
      pontosPorCiclo?: number;
      ativo?: boolean;
      niveis?: NivelConfigRow[] | null;
    }
  ): Promise<RegraProgramaFidelidade> {
    const regra = await programaFidelidadeRepository.upsert(empresaId, dados);
    return {
      empresaId: regra.empresa_id,
      valorPorPonto: Number(regra.valor_por_ponto),
      pontosPorCiclo: regra.pontos_por_ciclo,
      ativo: regra.ativo,
      niveis: regra.niveis ?? DEFAULT_NIVEIS,
    };
  },

  /**
   * Pontos gerados por uma compra: a cada `valorPorPonto` reais o cliente
   * completa um ciclo e ganha `pontosPorCiclo` pontos. Ciclos incompletos
   * não pontuam (piso).
   */
  async calcularPontos(empresaId: string, valor: number): Promise<number> {
    const regra = await this.get(empresaId);
    if (!regra.ativo || regra.valorPorPonto <= 0 || regra.pontosPorCiclo <= 0) return 0;
    return Math.floor(valor / regra.valorPorPonto) * regra.pontosPorCiclo;
  },
};

/**
 * Nível atual e próximo, dados os pontos acumulados e a lista de níveis da
 * empresa (ordena por `min` de propósito — não confia na ordem de gravação).
 */
export function calcularNivel(pontosAcumulados: number, niveis: NivelConfigRow[]) {
  const ordenados = [...niveis].sort((a, b) => a.min - b.min);
  let nivel: NivelConfigRow = ordenados[0];
  let proximoNivel: NivelConfigRow | null = ordenados[1] ?? null;
  for (let i = 0; i < ordenados.length; i++) {
    if (pontosAcumulados >= ordenados[i].min) {
      nivel = ordenados[i];
      proximoNivel = ordenados[i + 1] ?? null;
    }
  }
  return { nivel: { ...nivel }, proximoNivel: proximoNivel ? { ...proximoNivel } : null };
}
