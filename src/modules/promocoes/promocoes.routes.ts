import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { promocoesController } from "./promocoes.controller";

export const promocoesRoutes = Router();

promocoesRoutes.use(authMiddleware, asyncHandler(requirePermission("promocoes")));

promocoesRoutes.get("/", asyncHandler(promocoesController.list));
promocoesRoutes.get("/:id", asyncHandler(promocoesController.getById));
// Criar/editar/excluir/enviar campanhas continua restrito ao gestor.
promocoesRoutes.post("/", requireRole("gestor"), asyncHandler(promocoesController.create));
promocoesRoutes.put("/:id", requireRole("gestor"), asyncHandler(promocoesController.update));
promocoesRoutes.delete("/:id", requireRole("gestor"), asyncHandler(promocoesController.remove));
promocoesRoutes.post("/:id/enviar", requireRole("gestor"), asyncHandler(promocoesController.enviar));
