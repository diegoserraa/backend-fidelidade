/**
 * Utilidades de CPF. `normalizeCpf` guarda só os 11 dígitos (formato do banco);
 * `isValidCpf` roda os dígitos verificadores para barrar lixo no cadastro.
 */

export function normalizeCpf(value: string): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os dígitos iguais

  const calcDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const dv1 = calcDigito(cpf.slice(0, 9), 10);
  const dv2 = calcDigito(cpf.slice(0, 10), 11);
  return dv1 === Number(cpf[9]) && dv2 === Number(cpf[10]);
}

/** `12345678901` -> `123.***.**9-01` (para telas do balcão). */
export function maskCpf(value: string): string {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return value;
  return `${cpf.slice(0, 3)}.***.**${cpf.slice(8, 9)}-${cpf.slice(9)}`;
}
