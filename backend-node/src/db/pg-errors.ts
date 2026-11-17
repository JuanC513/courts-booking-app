import pg from "pg";

// Códigos de error de PostgreSQL (SQLSTATE) que nos interesan
// Lista completa: https://www.postgresql.org/docs/current/errcodes-appendix.html
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const EXCLUSION_VIOLATION = "23P01";

function isConstraintError(
  err: unknown,
  code: string,
  constraint: string,
): boolean {
  return (
    err instanceof pg.DatabaseError &&
    err.code === code &&
    err.constraint === constraint
  );
}

export function isUniqueViolation(err: unknown, constraint: string): boolean {
  return isConstraintError(err, UNIQUE_VIOLATION, constraint);
}

export function isForeignKeyViolation(
  err: unknown,
  constraint: string,
): boolean {
  return isConstraintError(err, FOREIGN_KEY_VIOLATION, constraint);
}

export function isExclusionViolation(
  err: unknown,
  constraint: string,
): boolean {
  return isConstraintError(err, EXCLUSION_VIOLATION, constraint);
}
