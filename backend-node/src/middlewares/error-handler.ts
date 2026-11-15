import type { ErrorRequestHandler, Response } from "express";
import { HttpError, ValidationError } from "../errors/http-errors.js";

function sendProblem(
  res: Response,
  status: number,
  title: string,
  detail: string,
  extra: Record<string, unknown> = {},
) {
  res
    .status(status)
    .type("application/problem+json")
    .json({ type: "about:blank", title, status, detail, ...extra });
}

// Errores que lanza express.json() al leer el cuerpo, según su `type`
const BODY_ERRORS: Record<
  string,
  { status: number; title: string; detail: string }
> = {
  "entity.parse.failed": {
    status: 400,
    title: "Bad Request",
    detail: "El cuerpo de la petición no es un JSON válido.",
  },
  "entity.too.large": {
    status: 413,
    title: "Content Too Large",
    detail:
      "El cuerpo de la petición supera el tamaño máximo permitido (100 KB).",
  },
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  // Si ya se empezó a enviar la respuesta, no se puede cambiar: Express cierra la conexión
  if (res.headersSent) {
    next(err);
    return;
  }

  // 1. Errores que lanzamos a propósito
  if (err instanceof HttpError) {
    const extra = err instanceof ValidationError ? { errors: err.errors } : {};
    sendProblem(res, err.status, err.title, err.message, extra);
    return;
  }

  // 2. Errores al leer el cuerpo de la petición
  const bodyError = BODY_ERRORS[err?.type];
  if (bodyError) {
    sendProblem(res, bodyError.status, bodyError.title, bodyError.detail);
    return;
  }

  // 3. Cualquier otra cosa es un error nuestro: se registra y no se exponen detalles
  console.error(err);
  sendProblem(
    res,
    500,
    "Internal Server Error",
    "Ocurrió un error inesperado.",
  );
};
