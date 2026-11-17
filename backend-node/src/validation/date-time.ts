// Fecha y hora ISO 8601 (RFC 3339) con zona horaria obligatoria:
// 2026-11-20T18:00:00-05:00, 2026-11-20T23:00:00Z, 2026-11-20T23:00:00.000Z
const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export const DATE_TIME_MESSAGE =
  "Debe ser una fecha y hora ISO 8601 con zona horaria, por ejemplo 2026-11-20T18:00:00-05:00.";

// Devuelve undefined si el texto no tiene el formato o si la fecha no existe (30 de febrero, 25:00...)
export function parseDateTime(value: string): Date | undefined {
  const match = ISO_DATE_TIME.exec(value);
  if (!match) {
    return undefined;
  }

  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);

  // new Date() no rechaza el 30 de febrero: lo convierte en 2 de marzo. Por eso se revisa a mano.
  // El día 0 de un mes es el último día del mes anterior: así se obtiene cuántos días tiene `month`.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
