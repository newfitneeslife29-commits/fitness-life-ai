export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, code = 'VALIDATION_ERROR', details?: Record<string, unknown>) =>
  new ApiError(400, code, message, details);
export const notFound = (message = 'No encontrado') => new ApiError(404, 'NOT_FOUND', message);
export const forbidden = (message: string, code = 'FORBIDDEN') => new ApiError(403, code, message);
export const conflict = (message: string, code: string, details?: Record<string, unknown>) =>
  new ApiError(409, code, message, details);
