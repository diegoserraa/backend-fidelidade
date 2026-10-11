import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware";
import { generalRateLimit } from "./middlewares/rateLimit.middleware";
import { routes } from "./routes";

/**
 * CORS_ORIGINS vira uma lista de padrões, cada um podendo ter `*` pra casar
 * um subdomínio (ex.: "https://*.fidelidade-dev.zdmsolutions.com.br") — cada
 * padaria instalada vive no próprio subdomínio (ver manifest.service.ts), e
 * uma lista de match exato não daria conta disso sem listar empresa por
 * empresa. Entradas sem `*` continuam batendo só com o valor exato.
 */
function validarOrigem(
  padroes: string[]
): (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void {
  const regexes = padroes.map((padrao) => {
    // Separa pelo `*` ANTES de escapar — escapando a string inteira primeiro
    // (como a versão anterior fazia) o `*` nunca sobra como `\*` pra essa
    // troca encontrar (não está na lista de caracteres escapados), e o
    // curinga vira um `*` de regex de verdade (zero-ou-mais) em vez de bater
    // com o subdomínio. Dividindo primeiro, cada pedaço fixo é escapado
    // isoladamente e junta com `[^.]+` no lugar de cada `*`.
    const partes = padrao.split("*").map((parte) => parte.replace(/[.+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(`^${partes.join("[^.]+")}$`);
  });
  return (origin, callback) => {
    // Sem Origin (curl, apps nativos, requisições same-origin) — nada a
    // bloquear, o cabeçalho só existe pra o NAVEGADOR decidir se expõe a
    // resposta a uma página de outra origem.
    if (!origin) return callback(null, true);
    if (regexes.some((regex) => regex.test(origin))) return callback(null, true);
    callback(new Error("Origem não permitida pelo CORS."));
  };
}

export function createApp(): Express {
  const app = express();

  // A maioria dos hosts (Render/Railway/Fly/Heroku/Vercel/nginx na frente)
  // fica atrás de um proxy reverso. Sem isso, todo mundo parece vir do mesmo
  // IP do proxy e o rate limit por IP não funciona.
  app.set("trust proxy", 1);

  app.use(helmet());

  if (env.corsOrigins) {
    app.use(cors({ origin: validarOrigem(env.corsOrigins) }));
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      "[cors] CORS_ORIGINS não definido — liberando qualquer origem. Configure antes de ir para produção."
    );
    app.use(cors());
  }

  app.use(express.json({ limit: "32kb" }));
  app.use(generalRateLimit);

  app.use("/api", routes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
