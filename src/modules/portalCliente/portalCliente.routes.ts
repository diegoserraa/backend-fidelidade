import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { clienteAuthMiddleware } from "../../middlewares/clienteAuth.middleware";
import { portalClienteController } from "./portalCliente.controller";

export const portalClienteRoutes = Router();

portalClienteRoutes.use(clienteAuthMiddleware);

portalClienteRoutes.get("/empresas", asyncHandler(portalClienteController.listEmpresas));
portalClienteRoutes.post("/qr", asyncHandler(portalClienteController.gerarQr));
portalClienteRoutes.get("/resgates/:id", asyncHandler(portalClienteController.getResgate));
portalClienteRoutes.delete("/resgates/:id", asyncHandler(portalClienteController.cancelarResgate));
portalClienteRoutes.post("/:empresaId/entrar", asyncHandler(portalClienteController.entrar));
portalClienteRoutes.get("/:empresaId/recompensas", asyncHandler(portalClienteController.listRecompensas));
portalClienteRoutes.get("/:empresaId/extrato", asyncHandler(portalClienteController.getExtrato));
portalClienteRoutes.post("/:empresaId/resgates", asyncHandler(portalClienteController.solicitarResgate));
