import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { clientesController } from "./clientes.controller";

export const clientesRoutes = Router();

clientesRoutes.use(authMiddleware);

clientesRoutes.get("/", asyncHandler(requirePermission("clientes")), asyncHandler(clientesController.list));
// Criar cliente é usado tanto pela tela de Clientes quanto pelo cadastro
// rápido no Balcão — qualquer um dos dois libera.
clientesRoutes.post(
  "/",
  asyncHandler(requirePermission("balcao", "clientes")),
  asyncHandler(clientesController.create)
);
clientesRoutes.post(
  "/identificar",
  asyncHandler(requirePermission("balcao", "clientes")),
  asyncHandler(clientesController.identificar)
);
clientesRoutes.get("/:id", asyncHandler(requirePermission("clientes")), asyncHandler(clientesController.getById));
clientesRoutes.put("/:id", asyncHandler(requirePermission("clientes")), asyncHandler(clientesController.update));
// Exclusão apaga o histórico do cliente nesta empresa (cascade) — só gestor.
// Atendente pode inativar (PATCH /:id/status) em vez de excluir.
clientesRoutes.delete("/:id", requireRole("gestor"), asyncHandler(clientesController.remove));
clientesRoutes.patch(
  "/:id/status",
  asyncHandler(requirePermission("clientes")),
  asyncHandler(clientesController.updateStatus)
);
clientesRoutes.get(
  "/:id/resumo",
  asyncHandler(requirePermission("clientes")),
  asyncHandler(clientesController.resumo)
);
