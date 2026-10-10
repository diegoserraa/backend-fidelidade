import { Router } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { gerarManifestoEmpresa } from "../modules/manifest/manifest.service";
import { semCabecalhosDeHtml } from "../utils/recursoPublico";
import { adminRoutes } from "../modules/admin/admin.routes";
import { authRoutes } from "../modules/auth/auth.routes";
import { clienteAuthRoutes } from "../modules/clienteAuth/clienteAuth.routes";
import { portalClienteRoutes } from "../modules/portalCliente/portalCliente.routes";
import { empresaRoutes } from "../modules/empresa/empresa.routes";
import { programaFidelidadeRoutes } from "../modules/programaFidelidade/programaFidelidade.routes";
import { clientesRoutes } from "../modules/clientes/clientes.routes";
import { comprasRoutes } from "../modules/compras/compras.routes";
import { recompensasRoutes } from "../modules/recompensas/recompensas.routes";
import { resgatesRoutes } from "../modules/resgates/resgates.routes";
import { promocoesRoutes } from "../modules/promocoes/promocoes.routes";
import { usuariosRoutes } from "../modules/usuarios/usuarios.routes";
import { dashboardRoutes } from "../modules/dashboard/dashboard.routes";

export const routes = Router();

routes.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

// Diferente de /health (que não toca no banco, ver config/db.ts): essa aqui
// prova que a conexão com o Postgres (usuário/senha/host novos, self-hosted)
// está funcionando de verdade — útil pra testar o deploy sem precisar de
// uma rota autenticada.
routes.get(
  "/health/db",
  asyncHandler(async (_req, res) => {
    const { rows } = await query<{ agora: Date }>("SELECT NOW() AS agora");
    res.status(200).json({ status: "ok", agora: rows[0].agora });
  })
);

// Manifesto do PWA gerado por requisição: a cada padaria (via ?empresa=) com
// a logo/cor dela, em vez de um manifest.json fixo compartilhado — é o que
// faz a tela de instalação/ícone nativo do celular mostrar a marca certa
// mesmo o deploy sendo um só pra todas (ver index.html do front, que troca
// o <link rel="manifest"> pra apontar aqui).
routes.get(
  "/manifest",
  asyncHandler(async (req, res) => {
    const empresaId = typeof req.query.empresa === "string" ? req.query.empresa : null;
    const apiUrl = `${req.protocol}://${req.get("host")}/api`;
    const manifesto = await gerarManifestoEmpresa(empresaId, apiUrl);
    semCabecalhosDeHtml(res);
    res.set("Content-Type", "application/manifest+json");
    // Sem cache, mesmo motivo do ícone (ver empresa.controller.ts/getIcone):
    // já causou o navegador servir branding antiga por até 1h durante um
    // teste de instalação do PWA, justo a tela que mais precisa estar certa
    // na hora de uma demonstração.
    res.set("Cache-Control", "no-store");
    res.status(200).json(manifesto);
  })
);

routes.use("/admin", adminRoutes);
routes.use("/auth/cliente", clienteAuthRoutes);
routes.use("/auth", authRoutes);
routes.use("/cliente", portalClienteRoutes);
routes.use("/empresa", empresaRoutes);
routes.use("/programa-fidelidade", programaFidelidadeRoutes);
routes.use("/clientes", clientesRoutes);
routes.use("/compras", comprasRoutes);
routes.use("/recompensas", recompensasRoutes);
routes.use("/resgates", resgatesRoutes);
routes.use("/promocoes", promocoesRoutes);
routes.use("/usuarios", usuariosRoutes);
routes.use("/dashboard", dashboardRoutes);
