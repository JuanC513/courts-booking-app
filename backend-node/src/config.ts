function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

function requireNumberEnv(name: string): number {
  const value = Number(requireEnv(name));
  if (!Number.isInteger(value)) {
    throw new Error(`La variable de entorno ${name} debe ser un número entero`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  db: {
    host: requireEnv("DB_HOST"),
    port: requireNumberEnv("DB_PORT"),
    database: requireEnv("DB_NAME"),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
  },
};
