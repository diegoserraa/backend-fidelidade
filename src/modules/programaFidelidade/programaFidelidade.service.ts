import { programaFidelidadeRepository } from "./programaFidelidade.repository";

const DEFAULT_VALOR_POR_PONTO = 1.0;
const DEFAULT_PONTOS_POR_CICLO = 1;

interface RegraProgramaFidelidade {
  empresaId: string;
  valorPorPonto: number;
  pontosPorCiclo: number;
  ativo: boolean;
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
      };
    }
    return {
      empresaId: regra.empresa_id,
      valorPorPonto: Number(regra.valor_por_ponto),
      pontosPorCiclo: regra.pontos_por_ciclo,
      ativo: regra.ativo,
    };
  },

  async update(
    empresaId: string,
    dados: { valorPorPonto?: number; pontosPorCiclo?: number; ativo?: boolean }
  ): Promise<RegraProgramaFidelidade> {
    const regra = await programaFidelidadeRepository.upsert(empresaId, dados);
    return {
      empresaId: regra.empresa_id,
      valorPorPonto: Number(regra.valor_por_ponto),
      pontosPorCiclo: regra.pontos_por_ciclo,
      ativo: regra.ativo,
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
