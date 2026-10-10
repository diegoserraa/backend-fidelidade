import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { empresaController } from "./empresa.controller";

export const empresaRoutes = Router();

// Públicas (sem auth) — identidade visual usada pela tela de login do app do
// cliente (que ainda não tem sessão) e pelo manifesto dinâmico do PWA.
// Precisam vir antes do authMiddleware.
empresaRoutes.get("/:empresaId/publico", asyncHandler(empresaController.getConfigPublica));
empresaRoutes.get("/:empresaId/icone.png", asyncHandler(empresaController.getIcone));

empresaRoutes.use(authMiddleware);

empresaRoutes.get("/", asyncHandler(empresaController.getEmpresa));
empresaRoutes.put("/", requireRole("gestor"), asyncHandler(empresaController.updateEmpresa));
empresaRoutes.get("/config", asyncHandler(empresaController.getConfig));
empresaRoutes.put("/config", requireRole("gestor"), asyncHandler(empresaController.updateConfig));
