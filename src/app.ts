import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware";
import { generalRateLimit } from "./middlewares/rateLimit.middleware";
import { routes } from "./routes";

export function createApp(): Express {
  const app = express();

  // A maioria dos hosts (Render/Railway/Fly/Heroku/Vercel/nginx na frente)
  // fica atrás de um proxy reverso. Sem isso, todo mundo parece vir do mesmo
  // IP do proxy e o rate limit por IP não funciona.
  app.set("trust proxy", 1);

  app.use(helmet());

  if (env.corsOrigins) {
    app.use(cors({ origin: env.corsOrigins }));
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
