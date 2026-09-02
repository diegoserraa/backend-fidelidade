import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { dashboardController } from "./dashboard.controller";

export const dashboardRoutes = Router();

dashboardRoutes.get("/", authMiddleware, asyncHandler(dashboardController.get));
