import { dashboardRepository } from "./dashboard.repository";

export const dashboardService = {
  async get(empresaId: string) {
    return dashboardRepository.indicadores(empresaId);
  },
};
