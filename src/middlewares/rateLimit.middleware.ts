import rateLimit from "express-rate-limit";

/**
 * Limite geral: barra abuso/DoS simples em qualquer rota da API.
 * IP + 15 min é o suficiente para uso normal de painel/app e incomoda um
 * scraper/bot sem travar um usuário legítimo.
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas requisições. Tente novamente em alguns minutos." },
});

/**
 * Limite apertado para login/registro (painel e cliente): o alvo clássico de
 * força bruta. CPF + senha curta é um espaço pequeno — sem isso dá pra
 * varrer senhas comuns em minutos.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { erro: "Muitas tentativas. Aguarde alguns minutos antes de tentar de novo." },
});
