import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { adminAuthMiddleware } from "../../middlewares/adminAuth.middleware";
import { authRateLimit } from "../../middlewares/rateLimit.middleware";
import { adminController } from "./admin.controller";

export const adminRoutes = Router();

adminRoutes.post("/login", authRateLimit, asyncHandler(adminController.login));

adminRoutes.use(adminAuthMiddleware);

adminRoutes.get("/me", asyncHandler(adminController.me));
adminRoutes.get("/empresas", asyncHandler(adminController.listEmpresas));
adminRoutes.post("/empresas", asyncHandler(adminController.createEmpresa));
adminRoutes.patch("/empresas/:id/status", asyncHandler(adminController.updateEmpresaStatus));
