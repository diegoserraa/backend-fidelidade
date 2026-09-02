import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { programaFidelidadeController } from "./programaFidelidade.controller";

export const programaFidelidadeRoutes = Router();

programaFidelidadeRoutes.use(authMiddleware, asyncHandler(requirePermission("programa")));

programaFidelidadeRoutes.get("/", asyncHandler(programaFidelidadeController.get));
programaFidelidadeRoutes.put("/", requireRole("gestor"), asyncHandler(programaFidelidadeController.update));
