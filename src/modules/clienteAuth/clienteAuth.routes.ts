import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { clienteAuthMiddleware } from "../../middlewares/clienteAuth.middleware";
import { authRateLimit } from "../../middlewares/rateLimit.middleware";
import { clienteAuthController } from "./clienteAuth.controller";

export const clienteAuthRoutes = Router();

clienteAuthRoutes.post("/registrar", authRateLimit, asyncHandler(clienteAuthController.registrar));
clienteAuthRoutes.post("/login", authRateLimit, asyncHandler(clienteAuthController.login));
clienteAuthRoutes.get("/me", clienteAuthMiddleware, asyncHandler(clienteAuthController.me));
clienteAuthRoutes.delete("/me", clienteAuthMiddleware, asyncHandler(clienteAuthController.excluirConta));
clienteAuthRoutes.post("/sair", clienteAuthMiddleware, asyncHandler(clienteAuthController.sair));
