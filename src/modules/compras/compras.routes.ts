import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { comprasController } from "./compras.controller";

export const comprasRoutes = Router();

comprasRoutes.use(authMiddleware);

// Registrar compra é usado tanto no Balcão quanto na tela Compras.
comprasRoutes.post(
  "/",
  asyncHandler(requirePermission("balcao", "compras")),
  asyncHandler(comprasController.registrar)
);
comprasRoutes.get("/", asyncHandler(requirePermission("compras")), asyncHandler(comprasController.list));
comprasRoutes.get("/:id", asyncHandler(requirePermission("compras")), asyncHandler(comprasController.getById));
