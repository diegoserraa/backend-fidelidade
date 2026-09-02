export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }

  static notFound(entidade: string): AppError {
    return new AppError(`${entidade} não encontrado(a).`, 404);
  }

  static unauthorized(mensagem = "Não autenticado."): AppError {
    return new AppError(mensagem, 401);
  }

  static forbidden(mensagem = "Sem permissão para essa ação."): AppError {
    return new AppError(mensagem, 403);
  }

  static conflict(mensagem: string): AppError {
    return new AppError(mensagem, 409);
  }
}
