import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { dashboardService } from "./dashboard.service";

export const dashboardController = {
  async get(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    res.status(200).json(await dashboardService.get(req.auth.empresaId));
  },
};
