export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    detail: string,
  ) {
    super(detail);
  }
}

export class NotFoundError extends HttpError {
  constructor(detail: string) {
    super(404, "Not Found", detail);
  }
}

export class ConflictError extends HttpError {
  constructor(detail: string) {
    super(409, "Conflict", detail);
  }
}

export class ValidationError extends HttpError {
  constructor(
    public readonly errors: Record<string, string[]>,
    detail = "La petición tiene errores de validación.",
  ) {
    super(400, "Bad Request", detail);
  }
}
