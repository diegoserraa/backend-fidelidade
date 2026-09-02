import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { authRateLimit } from "../../middlewares/rateLimit.middleware";
import { authController } from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/login", authRateLimit, asyncHandler(authController.login));
authRoutes.get("/me", authMiddleware, asyncHandler(authController.me));
