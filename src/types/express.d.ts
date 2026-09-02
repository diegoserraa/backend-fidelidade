import { AdminJwtPayload, ClienteJwtPayload, JwtPayload } from "./index";

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
      clienteAuth?: ClienteJwtPayload;
      adminAuth?: AdminJwtPayload;
    }
  }
}

export {};
