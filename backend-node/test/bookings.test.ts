import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBooking, createCourt, createUser } from "./factories.js";
import { dayAt, request, setupTestApi } from "./helpers.js";

setupTestApi();

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const DATE_TIME_MESSAGE =
  "Debe ser una fecha y hora ISO 8601 con zona horaria, por ejemplo 2026-11-20T18:00:00-05:00.";
const ID_MESSAGE = "Debe ser un número entero positivo.";
const DURATION_MESSAGE = "La reserva debe durar entre 1 y 3 horas.";

// Arma la URL con los filtros codificados (por ejemplo, el "+" de una zona horaria pasa a %2B)
function bookingsUrl(filters: Record<string, string | number>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, String(value));
  }
  return `/bookings?${params}`;
}

// Mueve una fecha ISO unos minutos (para probar horas que no están en punto)
function addMinutes(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

// Cuerpo válido para POST /bookings: mañana de 18:00 a 20:00 UTC
function validInput(userId: number, courtId: number) {
  return { userId, courtId, startsAt: dayAt(1, 18), endsAt: dayAt(1, 20) };
}

describe("GET /bookings", () => {
  it("devuelve todas las reservas ordenadas por startsAt", async () => {
    const userId = await createUser();
    const courtId = await createCourt();
    const later = await createBooking({
      userId,
      courtId,
      startsAt: dayAt(2, 10),
      endsAt: dayAt(2, 11),
    });
    const earlier = await createBooking({
      userId,
      courtId,
      startsAt: dayAt(1, 10),
      endsAt: dayAt(1, 11),
    });

    const res = await request("GET", "/bookings");

    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.map((b: { id: number }) => b.id),
      [earlier, later],
    );
  });

  it("combina los filtros userId, courtId y status", async () => {
    const ana = await createUser();
    const luis = await createUser();
    const court1 = await createCourt();
    const court2 = await createCourt();
    const b1 = await createBooking({
      userId: ana,
      courtId: court1,
      startsAt: dayAt(1, 10),
      endsAt: dayAt(1, 12),
    });
    const b2 = await createBooking({
      userId: luis,
      courtId: court2,
      startsAt: dayAt(1, 8),
      endsAt: dayAt(1, 9),
    });
    const b3 = await createBooking({
      userId: ana,
      courtId: court2,
      startsAt: dayAt(2, 10),
      endsAt: dayAt(2, 11),
      status: "cancelled",
    });

    const ids = async (filters: Record<string, string | number>) =>
      (await request("GET", bookingsUrl(filters))).body.map(
        (b: { id: number }) => b.id,
      );

    assert.deepEqual(await ids({ userId: ana }), [b1, b3]);
    assert.deepEqual(await ids({ courtId: court2 }), [b2, b3]);
    assert.deepEqual(await ids({ courtId: court2, status: "confirmed" }), [b2]);
    assert.deepEqual(await ids({ status: "cancelled" }), [b3]);
    assert.deepEqual(await ids({ userId: 999 }), []);
  });

  it("from y to devuelven las reservas que se cruzan con [from, to)", async () => {
    const userId = await createUser();
    const courtId = await createCourt();
    // Reserva de 10:00 a 12:00
    const id = await createBooking({
      userId,
      courtId,
      startsAt: dayAt(1, 10),
      endsAt: dayAt(1, 12),
    });

    const ids = async (filters: Record<string, string>) =>
      (await request("GET", bookingsUrl(filters))).body.map(
        (b: { id: number }) => b.id,
      );

    assert.deepEqual(await ids({ from: dayAt(1, 11) }), [id]);
    assert.deepEqual(
      await ids({ from: dayAt(1, 12) }),
      [],
      "termina justo en from",
    );
    assert.deepEqual(await ids({ to: dayAt(1, 11) }), [id]);
    assert.deepEqual(
      await ids({ to: dayAt(1, 10) }),
      [],
      "empieza justo en to",
    );
    assert.deepEqual(await ids({ from: dayAt(1, 0), to: dayAt(2, 0) }), [id]);
  });

  it("acepta zonas horarias con + si están codificadas", async () => {
    const res = await request(
      "GET",
      bookingsUrl({ from: "2026-11-20T10:00:00+05:00" }),
    );

    assert.equal(res.status, 200);
  });

  it("responde 400 con un error por cada filtro inválido", async () => {
    const res = await request(
      "GET",
      "/bookings?userId=abc&status=pending&from=2026-02-30T10:00:00Z",
    );

    assert.equal(res.status, 400);
    assert.deepEqual(res.body.errors, {
      userId: [ID_MESSAGE],
      status: ["Debe ser uno de: confirmed, cancelled."],
      from: [DATE_TIME_MESSAGE],
    });
  });

  it("responde 400 si to no es posterior a from", async () => {
    const res = await request(
      "GET",
      bookingsUrl({ from: dayAt(2, 0), to: dayAt(1, 0) }),
    );

    assert.equal(res.status, 400);
    assert.deepEqual(res.body.errors, { to: ["Debe ser posterior a from."] });
  });

  it("responde 400 si un filtro se repite", async () => {
    const res = await request("GET", "/bookings?userId=1&userId=2");

    assert.equal(res.status, 400);
    assert.deepEqual(res.body.errors, {
      userId: ["Debe indicarse una sola vez."],
    });
  });
});

describe("GET /bookings/:id", () => {
  it("devuelve la reserva con todos sus campos", async () => {
    const userId = await createUser();
    const courtId = await createCourt();
    const id = await createBooking({
      userId,
      courtId,
      startsAt: dayAt(1, 18),
      endsAt: dayAt(1, 20),
    });

    const res = await request("GET", `/bookings/${id}`);

    assert.equal(res.status, 200);
    const { createdAt, ...rest } = res.body;
    assert.deepEqual(rest, {
      id,
      userId,
      courtId,
      startsAt: dayAt(1, 18),
      endsAt: dayAt(1, 20),
      status: "confirmed",
      observation: null,
    });
    assert.match(createdAt, ISO_UTC);
  });

  it("responde 404 si no existe", async () => {
    const res = await request("GET", "/bookings/999");

    assert.equal(res.status, 404);
    assert.equal(res.body.detail, "No existe la reserva 999.");
  });
});

describe("POST /bookings", () => {
  it("crea la reserva confirmada y devuelve las fechas en UTC", async () => {
    const userId = await createUser();
    const courtId = await createCourt();
    // Mañana de 18:00 a 20:00 en Colombia (UTC-5) = de 23:00 a 01:00 UTC
    const day = dayAt(1, 0).slice(0, 10);

    const res = await request("POST", "/bookings", {
      userId,
      courtId,
      startsAt: `${day}T18:00:00-05:00`,
      endsAt: `${day}T20:00:00-05:00`,
      observation: "  Traer balón  ",
    });

    assert.equal(res.status, 201);
    assert.equal(res.headers.get("location"), "/bookings/1");
    const { createdAt, ...rest } = res.body;
    assert.deepEqual(rest, {
      id: 1,
      userId,
      courtId,
      startsAt: dayAt(1, 23),
      endsAt: dayAt(2, 1),
      status: "confirmed",
      observation: "Traer balón",
    });
    assert.match(createdAt, ISO_UTC);
  });

  it("guarda observation como null si no viene o si solo tiene espacios", async () => {
    const userId = await createUser();
    const courtId = await createCourt();

    const withoutObservation = await request(
      "POST",
      "/bookings",
      validInput(userId, courtId),
    );
    const blankObservation = await request("POST", "/bookings", {
      ...validInput(userId, courtId),
      startsAt: dayAt(2, 18),
      endsAt: dayAt(2, 19),
      observation: "   ",
    });

    assert.equal(withoutObservation.body.observation, null);
    assert.equal(blankObservation.body.observation, null);
  });

  it("responde 409 si se cruza con otra reserva confirmada de la misma cancha", async () => {
    const userId = await createUser();
    const courtId = await createCourt();
    await createBooking({
      userId,
      courtId,
      startsAt: dayAt(1, 18),
      endsAt: dayAt(1, 20),
    });

    const res = await request("POST", "/bookings", {
      userId,
      courtId,
      startsAt: dayAt(1, 19),
      endsAt: dayAt(1, 21),
    });

    assert.equal(res.status, 409);
    assert.equal(
      res.body.detail,
      `La cancha ${courtId} ya tiene una reserva confirmada que se cruza con ese horario.`,
    );
  });

  it("permite una reserva que empieza justo cuando termina otra", async () => {
    const userId = await createUser();
    const courtId = await createCourt();
    await createBooking({
      userId,
      courtId,
      startsAt: dayAt(1, 18),
      endsAt: dayAt(1, 20),
    });

    const res = await request("POST", "/bookings", {
      userId,
      courtId,
      startsAt: dayAt(1, 20),
      endsAt: dayAt(1, 21),
    });

    assert.equal(res.status, 201);
  });

  it("permite el mismo horario en otra cancha", async () => {
    const userId = await createUser();
    const court1 = await createCourt();
    const court2 = await createCourt();
    await createBooking({
      userId,
      courtId: court1,
      startsAt: dayAt(1, 18),
      endsAt: dayAt(1, 20),
    });

    const res = await request("POST", "/bookings", validInput(userId, court2));

    assert.equal(res.status, 201);
  });

  it("una reserva cancelada no ocupa la cancha", async () => {
    const userId = await createUser();
    const courtId = await createCourt();
    await createBooking({
      userId,
      courtId,
      startsAt: dayAt(1, 18),
      endsAt: dayAt(1, 20),
      status: "cancelled",
    });

    const res = await request("POST", "/bookings", validInput(userId, courtId));

    assert.equal(res.status, 201);
  });

  it("con varias peticiones simultáneas al mismo horario, solo una gana", async () => {
    const userId = await createUser();
    const courtId = await createCourt();

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request("POST", "/bookings", validInput(userId, courtId)),
      ),
    );

    const statuses = responses.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409, 409, 409, 409]);
  });

  it("aplica las reglas de horario", async () => {
    const userId = await createUser();
    const courtId = await createCourt();

    const cases = [
      {
        description: "no está en punto",
        startsAt: addMinutes(dayAt(1, 10), 30),
        endsAt: addMinutes(dayAt(1, 11), 30),
        errors: {
          startsAt: ["Debe ser una hora en punto."],
          endsAt: ["Debe ser una hora en punto."],
        },
      },
      {
        description: "dura más de 3 horas",
        startsAt: dayAt(1, 10),
        endsAt: dayAt(1, 14),
        errors: { endsAt: [DURATION_MESSAGE] },
      },
      {
        description: "termina antes de empezar",
        startsAt: dayAt(1, 12),
        endsAt: dayAt(1, 10),
        errors: { endsAt: [DURATION_MESSAGE] },
      },
      {
        description: "está en el pasado",
        startsAt: dayAt(-1, 10),
        endsAt: dayAt(-1, 11),
        errors: { startsAt: ["No puede estar en el pasado."] },
      },
    ];

    for (const c of cases) {
      const res = await request("POST", "/bookings", {
        userId,
        courtId,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
      });

      assert.equal(res.status, 400, c.description);
      assert.deepEqual(res.body.errors, c.errors, c.description);
    }
  });

  it("valida campos obligatorios, tipos y propiedades desconocidas", async () => {
    const empty = await request("POST", "/bookings", {});
    assert.equal(empty.status, 400);
    assert.deepEqual(empty.body.errors, {
      userId: ["Es obligatorio."],
      courtId: ["Es obligatorio."],
      startsAt: ["Es obligatorio."],
      endsAt: ["Es obligatorio."],
    });

    const wrongTypes = await request("POST", "/bookings", {
      userId: "1",
      courtId: 0,
      startsAt: "2026-11-21",
      endsAt: 20,
      observation: 5,
      status: "confirmed",
    });
    assert.equal(wrongTypes.status, 400);
    assert.deepEqual(wrongTypes.body.errors, {
      status: ["Propiedad no permitida."],
      userId: [ID_MESSAGE],
      courtId: [ID_MESSAGE],
      startsAt: [DATE_TIME_MESSAGE],
      endsAt: [DATE_TIME_MESSAGE],
      observation: ["Debe ser un texto."],
    });
  });

  it("responde 400 si el usuario o la cancha no existen", async () => {
    const userId = await createUser();
    const courtId = await createCourt();

    const noUser = await request("POST", "/bookings", validInput(999, courtId));
    assert.equal(noUser.status, 400);
    assert.deepEqual(noUser.body.errors, {
      userId: ["No existe el usuario 999."],
    });

    const noCourt = await request("POST", "/bookings", validInput(userId, 999));
    assert.equal(noCourt.status, 400);
    assert.deepEqual(noCourt.body.errors, {
      courtId: ["No existe la cancha 999."],
    });
  });
});

describe("PATCH /bookings/:id", () => {
  it("cancela una reserva confirmada que todavía no empieza", async () => {
    const userId = await createUser();
    const courtId = await createCourt();
    const id = await createBooking({
      userId,
      courtId,
      startsAt: dayAt(1, 18),
      endsAt: dayAt(1, 20),
    });

    const res = await request("PATCH", `/bookings/${id}`, {
      status: "cancelled",
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, "cancelled");

    // Al cancelarla, el horario queda libre otra vez
    const again = await request(
      "POST",
      "/bookings",
      validInput(userId, courtId),
    );
    assert.equal(again.status, 201);
  });

  it("responde 409 si la reserva ya está cancelada", async () => {
    const userId = await createUser();
    const courtId = await createCourt();
    const id = await createBooking({
      userId,
      courtId,
      startsAt: dayAt(1, 18),
      endsAt: dayAt(1, 20),
      status: "cancelled",
    });

    for (const status of ["cancelled", "confirmed"]) {
      const res = await request("PATCH", `/bookings/${id}`, { status });

      assert.equal(res.status, 409, status);
      assert.equal(
        res.body.detail,
        `La reserva ${id} está cancelada y no puede cambiar de estado.`,
      );
    }
  });

  it("responde 409 si se pide el estado que ya tiene", async () => {
    const userId = await createUser();
    const courtId = await createCourt();
    const id = await createBooking({
      userId,
      courtId,
      startsAt: dayAt(1, 18),
      endsAt: dayAt(1, 20),
    });

    const res = await request("PATCH", `/bookings/${id}`, {
      status: "confirmed",
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.detail, `La reserva ${id} ya está confirmada.`);
  });

  it("responde 409 si la reserva ya empezó", async () => {
    const userId = await createUser();
    const courtId = await createCourt();
    // Solo se puede crear con la fábrica: la API no acepta reservas en el pasado
    const id = await createBooking({
      userId,
      courtId,
      startsAt: dayAt(-1, 10),
      endsAt: dayAt(-1, 11),
    });

    const res = await request("PATCH", `/bookings/${id}`, {
      status: "cancelled",
    });

    assert.equal(res.status, 409);
    assert.equal(
      res.body.detail,
      `La reserva ${id} ya empezó y no se puede cancelar.`,
    );
  });

  it("responde 404 si la reserva no existe", async () => {
    const res = await request("PATCH", "/bookings/999", {
      status: "cancelled",
    });

    assert.equal(res.status, 404);
  });

  it("valida el cuerpo: solo acepta status con un valor válido", async () => {
    const userId = await createUser();
    const courtId = await createCourt();
    const id = await createBooking({
      userId,
      courtId,
      startsAt: dayAt(1, 18),
      endsAt: dayAt(1, 20),
    });

    const empty = await request("PATCH", `/bookings/${id}`, {});
    assert.deepEqual(empty.body.errors, { status: ["Es obligatorio."] });

    const invalid = await request("PATCH", `/bookings/${id}`, {
      status: "pending",
    });
    assert.deepEqual(invalid.body.errors, {
      status: ["Debe ser uno de: confirmed, cancelled."],
    });

    const extra = await request("PATCH", `/bookings/${id}`, {
      status: "cancelled",
      courtId: 2,
    });
    assert.equal(extra.status, 400);
    assert.deepEqual(extra.body.errors, {
      courtId: ["Propiedad no permitida."],
    });
  });
});
