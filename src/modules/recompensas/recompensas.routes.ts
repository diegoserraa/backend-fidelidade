import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { recompensasController } from "./recompensas.controller";

export const recompensasRoutes = Router();

recompensasRoutes.use(authMiddleware, asyncHandler(requirePermission("recompensas")));

recompensasRoutes.get("/", asyncHandler(recompensasController.list));
recompensasRoutes.post("/", requireRole("gestor"), asyncHandler(recompensasController.create));
recompensasRoutes.get("/:id", asyncHandler(recompensasController.getById));
recompensasRoutes.put("/:id", requireRole("gestor"), asyncHandler(recompensasController.update));
recompensasRoutes.patch("/:id/status", requireRole("gestor"), asyncHandler(recompensasController.updateStatus));
recompensasRoutes.delete("/:id", requireRole("gestor"), asyncHandler(recompensasController.remove));
