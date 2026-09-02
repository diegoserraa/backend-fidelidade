import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { resgatesController } from "./resgates.controller";

export const resgatesRoutes = Router();

// Todo o fluxo de resgates hoje só é usado no Balcão.
resgatesRoutes.use(authMiddleware, asyncHandler(requirePermission("balcao")));

resgatesRoutes.post("/", asyncHandler(resgatesController.registrar));
resgatesRoutes.post("/validar", asyncHandler(resgatesController.validar));
resgatesRoutes.get("/", asyncHandler(resgatesController.list));
resgatesRoutes.get("/:id", asyncHandler(resgatesController.getById));
resgatesRoutes.post("/:id/confirmar", asyncHandler(resgatesController.confirmar));
resgatesRoutes.post("/:id/recusar", asyncHandler(resgatesController.recusar));
