import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBooking, createCourt, createUser } from "./factories.js";
import { dayAt, request, setupTestApi } from "./helpers.js";

setupTestApi();

describe("GET /courts", () => {
  it("devuelve las canchas ordenadas por id", async () => {
    await createCourt({ name: "Cancha A" });
    await createCourt({ name: "Cancha B" });

    const res = await request("GET", "/courts");

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, [
      { id: 1, name: "Cancha A" },
      { id: 2, name: "Cancha B" },
    ]);
  });
});

describe("GET /courts/:id", () => {
  it("devuelve la cancha si existe", async () => {
    const id = await createCourt({ name: "Cancha Colombia" });

    const res = await request("GET", `/courts/${id}`);

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { id, name: "Cancha Colombia" });
  });

  it("responde 404 si no existe", async () => {
    const res = await request("GET", "/courts/999");

    assert.equal(res.status, 404);
    assert.equal(res.body.detail, "No existe la cancha 999.");
  });
});

describe("POST /courts", () => {
  it("crea la cancha con el nombre recortado", async () => {
    const res = await request("POST", "/courts", { name: "  Cancha Perú  " });

    assert.equal(res.status, 201);
    assert.equal(res.headers.get("location"), "/courts/1");
    assert.deepEqual(res.body, { id: 1, name: "Cancha Perú" });
  });

  it("permite dos canchas con el mismo nombre (no hay UNIQUE)", async () => {
    await createCourt({ name: "Cancha Perú" });

    const res = await request("POST", "/courts", { name: "Cancha Perú" });

    assert.equal(res.status, 201);
  });

  it("valida el nombre y rechaza propiedades desconocidas", async () => {
    const empty = await request("POST", "/courts", {
      name: "  ",
      techada: true,
    });
    assert.equal(empty.status, 400);
    assert.deepEqual(empty.body.errors, {
      techada: ["Propiedad no permitida."],
      name: ["No puede estar vacío."],
    });

    const tooLong = await request("POST", "/courts", { name: "a".repeat(101) });
    assert.equal(tooLong.status, 400);
    assert.deepEqual(tooLong.body.errors, {
      name: ["No puede superar los 100 caracteres."],
    });
  });
});

describe("PUT /courts/:id", () => {
  it("cambia el nombre y devuelve la cancha completa", async () => {
    const id = await createCourt({ name: "Cancha A" });

    const res = await request("PUT", `/courts/${id}`, { name: "Cancha B" });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { id, name: "Cancha B" });
  });

  it("responde 404 si la cancha no existe", async () => {
    const res = await request("PUT", "/courts/999", { name: "Cancha X" });

    assert.equal(res.status, 404);
  });
});

describe("DELETE /courts/:id", () => {
  it("elimina la cancha y responde 204", async () => {
    const id = await createCourt();

    const res = await request("DELETE", `/courts/${id}`);

    assert.equal(res.status, 204);
    const again = await request("GET", `/courts/${id}`);
    assert.equal(again.status, 404);
  });

  it("responde 404 si la cancha no existe", async () => {
    const res = await request("DELETE", "/courts/999");

    assert.equal(res.status, 404);
  });

  it("responde 409 si la cancha tiene reservas, aunque estén canceladas", async () => {
    const userId = await createUser();
    const courtId = await createCourt();
    await createBooking({
      userId,
      courtId,
      startsAt: dayAt(1, 18),
      endsAt: dayAt(1, 19),
      status: "cancelled",
    });

    const res = await request("DELETE", `/courts/${courtId}`);

    assert.equal(res.status, 409);
    assert.equal(
      res.body.detail,
      `La cancha ${courtId} tiene reservas asociadas y no se puede eliminar.`,
    );
  });
});
