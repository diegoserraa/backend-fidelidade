import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { empresaController } from "./empresa.controller";

export const empresaRoutes = Router();

// Pública (sem auth) — identidade visual usada pela tela de login do app do
// cliente, que ainda não tem sessão. Precisa vir antes do authMiddleware.
empresaRoutes.get("/:empresaId/publico", asyncHandler(empresaController.getConfigPublica));

empresaRoutes.use(authMiddleware);

empresaRoutes.get("/", asyncHandler(empresaController.getEmpresa));
empresaRoutes.put("/", requireRole("gestor"), asyncHandler(empresaController.updateEmpresa));
empresaRoutes.get("/config", asyncHandler(empresaController.getConfig));
empresaRoutes.put("/config", requireRole("gestor"), asyncHandler(empresaController.updateConfig));
