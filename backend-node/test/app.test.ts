import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { request, setupTestApi } from "./helpers.js";

setupTestApi();

describe("infraestructura de pruebas", () => {
  it("GET /health responde ok y llega a la base de datos", async () => {
    const res = await request("GET", "/health");

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: "ok", database: "ok" });
  });

  it("cada prueba empieza con la base vacía", async () => {
    const res = await request("GET", "/users");

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  it("una ruta inexistente responde 404 en formato Problem Details", async () => {
    const res = await request("GET", "/no-existe");

    assert.equal(res.status, 404);
    assert.match(
      res.headers.get("content-type") ?? "",
      /^application\/problem\+json/,
    );
    assert.deepEqual(res.body, {
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "No existe la ruta GET /no-existe.",
    });
  });
});
