import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach } from "node:test";
import { app } from "../src/app.js";
import { pool } from "../src/db/pool.js";

let server: Server;
let baseUrl: string;

// Levanta la app en un puerto libre que elige el sistema operativo (puerto 0)
async function startServer() {
  server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;
}

// Cierra el servidor y las conexiones a la base: si quedan abiertas, el proceso de pruebas no termina
async function stopServer() {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await pool.end();
}

// Deja la base vacía y los ids otra vez en 1.
// Se niega a limpiar una base que no termine en _test, para no borrar nunca tus datos de desarrollo.
async function resetDatabase() {
  const { rows } = await pool.query<{ name: string }>(
    "SELECT current_database() AS name",
  );
  const name = rows[0].name;
  if (!name.endsWith("_test")) {
    throw new Error(
      `resetDatabase no limpia "${name}": solo bases cuyo nombre termina en _test.`,
    );
  }
  await pool.query("TRUNCATE TABLE bookings, courts, users RESTART IDENTITY");
}

// Registra los hooks comunes. Cada archivo de pruebas lo llama una vez, al principio.
export function setupTestApi() {
  before(startServer);
  after(stopServer);
  beforeEach(resetDatabase);
}

export interface ApiResponse {
  status: number;
  headers: Headers;
  // `any` a propósito: en las pruebas se leen propiedades del JSON sin declarar su tipo
  body: any;
}

// Hace una petición real a la API y devuelve el código, las cabeceras y el JSON de la respuesta
export async function request(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse> {
  const res = await fetch(baseUrl + path, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return {
    status: res.status,
    headers: res.headers,
    body: text ? JSON.parse(text) : undefined,
  };
}

