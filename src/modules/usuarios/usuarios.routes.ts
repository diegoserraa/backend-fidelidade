import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { usuariosController } from "./usuarios.controller";

export const usuariosRoutes = Router();

// Toda a gestão de usuários é restrita a gestores.
usuariosRoutes.use(authMiddleware, requireRole("gestor"));

usuariosRoutes.get("/", asyncHandler(usuariosController.list));
usuariosRoutes.post("/", asyncHandler(usuariosController.create));
usuariosRoutes.get("/:id", asyncHandler(usuariosController.getById));
usuariosRoutes.put("/:id", asyncHandler(usuariosController.update));
usuariosRoutes.delete("/:id", asyncHandler(usuariosController.remove));
usuariosRoutes.patch("/:id/status", asyncHandler(usuariosController.updateStatus));
usuariosRoutes.put("/:id/permissoes", asyncHandler(usuariosController.setPermissoes));
