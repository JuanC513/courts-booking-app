import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBooking, createCourt, createUser } from "./factories.js";
import { request, setupTestApi } from "./helpers.js";

setupTestApi();

// Fecha en el formato que devuelve la API: ISO 8601 en UTC (2026-11-19T15:30:00.000Z)
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("GET /users", () => {
  it("devuelve los usuarios ordenados por id", async () => {
    await createUser({ name: "Ana", email: "ana@example.com" });
    await createUser({ name: "Luis", email: "luis@example.com" });

    const res = await request("GET", "/users");

    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.map((u: { id: number; name: string }) => [u.id, u.name]),
      [
        [1, "Ana"],
        [2, "Luis"],
      ],
    );
    assert.match(res.body[0].createdAt, ISO_UTC);
  });
});

describe("GET /users/:id", () => {
  it("devuelve el usuario si existe", async () => {
    const id = await createUser({ name: "Ana", email: "ana@example.com" });

    const res = await request("GET", `/users/${id}`);

    assert.equal(res.status, 200);
    const { createdAt, ...rest } = res.body;
    assert.deepEqual(rest, { id, name: "Ana", email: "ana@example.com" });
    assert.match(createdAt, ISO_UTC);
  });

  it("responde 404 si no existe", async () => {
    const res = await request("GET", "/users/999");

    assert.equal(res.status, 404);
    assert.equal(res.body.detail, "No existe el usuario 999.");
  });

  it("responde 400 si el id no es un entero positivo", async () => {
    const res = await request("GET", "/users/abc");

    assert.equal(res.status, 400);
    assert.deepEqual(res.body.errors, {
      id: ["Debe ser un número entero positivo."],
    });
  });
});

describe("POST /users", () => {
  it("crea el usuario: recorta el nombre y guarda el email en minúsculas", async () => {
    const res = await request("POST", "/users", {
      name: "  Ana María  ",
      email: " Ana@Example.COM ",
    });

    assert.equal(res.status, 201);
    assert.equal(res.headers.get("location"), "/users/1");
    const { createdAt, ...rest } = res.body;
    assert.deepEqual(rest, {
      id: 1,
      name: "Ana María",
      email: "ana@example.com",
    });
    assert.match(createdAt, ISO_UTC);

    // Lo que se devolvió es lo que quedó guardado
    const saved = await request("GET", "/users/1");
    assert.deepEqual(saved.body, res.body);
  });

  it("responde 409 si el email ya existe, aunque cambien las mayúsculas", async () => {
    await createUser({ email: "ana@example.com" });

    const res = await request("POST", "/users", {
      name: "Otra Ana",
      email: "ANA@example.com",
    });

    assert.equal(res.status, 409);
    assert.equal(
      res.body.detail,
      "Ya existe un usuario con el email ana@example.com.",
    );
  });

  it("acumula todos los errores de validación en una sola respuesta", async () => {
    const res = await request("POST", "/users", {
      name: "   ",
      email: "no-es-email",
      edad: 30,
    });

    assert.equal(res.status, 400);
    assert.match(
      res.headers.get("content-type") ?? "",
      /^application\/problem\+json/,
    );
    assert.deepEqual(res.body.errors, {
      edad: ["Propiedad no permitida."],
      name: ["No puede estar vacío."],
      email: ["Debe ser un email válido."],
    });
  });

  it("valida tipos, campos obligatorios y longitud máxima", async () => {
    const wrongTypes = await request("POST", "/users", { name: 123 });
    assert.equal(wrongTypes.status, 400);
    assert.deepEqual(wrongTypes.body.errors, {
      name: ["Debe ser un texto."],
      email: ["Es obligatorio."],
    });

    const tooLong = await request("POST", "/users", {
      name: "a".repeat(76),
      email: `${"a".repeat(90)}@example.com`,
    });
    assert.equal(tooLong.status, 400);
    assert.deepEqual(tooLong.body.errors, {
      name: ["No puede superar los 75 caracteres."],
      email: ["No puede superar los 100 caracteres."],
    });
  });

  it("responde 400 si no hay cuerpo o si es un array", async () => {
    for (const body of [undefined, []]) {
      const res = await request("POST", "/users", body);

      assert.equal(res.status, 400, `cuerpo: ${JSON.stringify(body)}`);
      assert.deepEqual(res.body.errors, {
        body: ["El cuerpo debe ser un objeto JSON."],
      });
    }
  });

  it("responde 400 si el cuerpo es un texto o un número suelto", async () => {
    // express.json() solo acepta objetos y arrays: lo demás lo rechaza antes de llegar a la validación
    for (const body of ["texto", 42]) {
      const res = await request("POST", "/users", body);

      assert.equal(res.status, 400, `cuerpo: ${JSON.stringify(body)}`);
      assert.equal(
        res.body.detail,
        "El cuerpo de la petición no es un JSON válido.",
      );
    }
  });
});

describe("PUT /users/:id", () => {
  it("reemplaza el nombre y el email", async () => {
    const id = await createUser({ name: "Ana", email: "ana@example.com" });

    const res = await request("PUT", `/users/${id}`, {
      name: "Ana López",
      email: "ana.lopez@example.com",
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.name, "Ana López");
    assert.equal(res.body.email, "ana.lopez@example.com");
  });

  it("permite conservar el mismo email", async () => {
    const id = await createUser({ email: "ana@example.com" });

    const res = await request("PUT", `/users/${id}`, {
      name: "Ana",
      email: "ana@example.com",
    });

    assert.equal(res.status, 200);
  });

  it("responde 409 si el email pertenece a otro usuario", async () => {
    await createUser({ email: "ana@example.com" });
    const id = await createUser({ email: "luis@example.com" });

    const res = await request("PUT", `/users/${id}`, {
      name: "Luis",
      email: "ana@example.com",
    });

    assert.equal(res.status, 409);
    assert.equal(
      res.body.detail,
      "Otro usuario ya tiene el email ana@example.com.",
    );
  });

  it("responde 404 si el usuario no existe", async () => {
    const res = await request("PUT", "/users/999", {
      name: "Nadie",
      email: "nadie@example.com",
    });

    assert.equal(res.status, 404);
  });

  it("valida el cuerpo igual que POST", async () => {
    const id = await createUser();

    const res = await request("PUT", `/users/${id}`, { name: "Ana" });

    assert.equal(res.status, 400);
    assert.deepEqual(res.body.errors, { email: ["Es obligatorio."] });
  });
});

describe("DELETE /users/:id", () => {
  it("elimina el usuario y responde 204 sin cuerpo", async () => {
    const id = await createUser();

    const res = await request("DELETE", `/users/${id}`);

    assert.equal(res.status, 204);
    assert.equal(res.body, undefined);

    const again = await request("GET", `/users/${id}`);
    assert.equal(again.status, 404);
  });

  it("responde 404 si el usuario no existe", async () => {
    const res = await request("DELETE", "/users/999");

    assert.equal(res.status, 404);
  });

  it("responde 409 si el usuario tiene reservas", async () => {
    const userId = await createUser();
    const courtId = await createCourt();
    await createBooking({
      userId,
      courtId,
      startsAt: "2026-01-10T18:00:00Z",
      endsAt: "2026-01-10T19:00:00Z",
    });

    const res = await request("DELETE", `/users/${userId}`);

    assert.equal(res.status, 409);
    assert.equal(
      res.body.detail,
      `El usuario ${userId} tiene reservas asociadas y no se puede eliminar.`,
    );
  });
});
