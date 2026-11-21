# Booking App — API de reservas de canchas

Proyecto de práctica para aprender a construir APIs REST. El dominio es un sistema de **reservas de canchas**: hay **usuarios**, **canchas** y **reservas** que relacionan a un usuario con una cancha en un rango de horas.

La idea es implementar **la misma API (mismo contrato de endpoints) en dos backends**, de modo que se pueda levantar cualquiera de los dos:

1. **Node.js:** Express + TypeScript + PostgreSQL.
2. **.NET:** ASP.NET Core (C#) + SQL Server (T-SQL).

El acceso a datos es con **SQL explícito, sin ORM**, y todo se ejecuta localmente con **Docker Compose**.

## Estado actual

| Parte | Estado |
|---|---|
| Base de datos PostgreSQL (esquema, migraciones y datos de ejemplo) | ✅ Lista |
| Contrato de la API (`docs/openapi.yaml`) | ✅ Listo |
| Backend Node.js (`backend-node/`) | ✅ Completo: 14 endpoints, Swagger UI, Docker y 57 pruebas automáticas |
| Base de datos SQL Server | ⏳ Pendiente |
| Backend .NET (`backend-dotnet/`) | ⏳ Pendiente |

## Inicio rápido

Con Docker Desktop abierto, desde la raíz del repositorio:

```bash
cp .env.example .env
docker compose --profile node up -d --build
```

Cuando `docker compose ps` muestre `db` y `api-node` como `healthy`, abre **http://localhost:3000/docs** para ver la documentación y probar la API desde el navegador.

## Tecnologías

- **Node.js 26 + TypeScript**: lenguaje y entorno del backend Node.
- **Express 5**: framework web del backend Node.
- **pg**: driver de PostgreSQL para Node (consultas SQL parametrizadas, sin ORM).
- **PostgreSQL 17**: base de datos del backend Node.
- **Flyway 11**: herramienta de migraciones con archivos SQL puros.
- **Swagger UI** (`swagger-ui-express` + `yaml`): documentación interactiva generada desde el contrato.
- **`node:test`**: el *test runner* que trae Node, para las pruebas de integración (sin librerías extra).
- **Docker Compose**: levanta la base de datos, aplica las migraciones y ejecuta la API.

## Estructura

```
.
├── backend-node/
│   ├── src/
│   │   ├── app.ts                  # Configura Express: middlewares, rutas, Swagger y errores
│   │   ├── server.ts               # Comprueba la base de datos y arranca el servidor
│   │   ├── config.ts               # Lee y valida las variables de entorno
│   │   ├── openapi.ts              # Lee docs/openapi.yaml para Swagger UI
│   │   ├── db/
│   │   │   ├── pool.ts             # Pool de conexiones a PostgreSQL
│   │   │   └── pg-errors.ts        # Reconoce errores de restricciones (SQLSTATE)
│   │   ├── errors/
│   │   │   └── http-errors.ts      # HttpError, NotFoundError, ConflictError, ValidationError
│   │   ├── middlewares/
│   │   │   ├── not-found.ts        # 404 para rutas que no existen
│   │   │   └── error-handler.ts    # Convierte cualquier error en Problem Details
│   │   ├── validation/             # Piezas de validación reutilizables
│   │   │   ├── body.ts             # Cuerpos JSON: textos, ids, fechas, propiedades desconocidas
│   │   │   ├── query.ts            # Parámetros de la query string
│   │   │   ├── parse-id.ts         # Ids (URL, query y cuerpo)
│   │   │   └── date-time.ts        # Fechas ISO 8601 con zona horaria obligatoria
│   │   └── modules/                # Un módulo por recurso
│   │       ├── users/
│   │       ├── courts/
│   │       └── bookings/           # *.routes, *.controller, *.service, *.repository,
│   │                               # *.validation y *.types en cada módulo
│   ├── test/
│   │   ├── helpers.ts              # Levanta la app, limpia la base y hace peticiones
│   │   ├── factories.ts            # Crea datos de prueba directamente con SQL
│   │   ├── *.test.ts               # Pruebas por recurso
│   │   └── tsconfig.json           # Revisión de tipos de las pruebas
│   ├── Dockerfile                  # Imagen de la API en dos etapas
│   ├── .env.example                # Variables para `npm run dev`
│   ├── .env.test.example           # Variables para `npm test`
│   ├── package.json
│   └── tsconfig.json
├── db/
│   └── postgres/
│       ├── migrations/             # Cambios de esquema versionados (V1…V4)
│       └── seed/                   # Datos de ejemplo para desarrollo (R__seed_data.sql)
├── docs/
│   └── openapi.yaml                # Contrato de la API (OpenAPI 3.1)
├── docker-compose.yml
├── .dockerignore
├── .env.example                    # Variables de Docker Compose
└── README.md
```

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose).
- [Node.js 26](https://nodejs.org/) o superior, solo para ejecutar la API o las pruebas fuera de Docker. Con nvm: `nvm install 26.13.1` y `nvm use 26.13.1`.

## Configuración

Hay tres archivos de variables de entorno. Ninguno se sube al repositorio: cada uno se crea copiando su plantilla `.example`.

| Archivo | Lo usa | Plantilla |
|---|---|---|
| `.env` (raíz) | Docker Compose: credenciales de PostgreSQL y puertos | `.env.example` |
| `backend-node/.env` | `npm run dev` | `backend-node/.env.example` |
| `backend-node/.env.test` | `npm test` | `backend-node/.env.test.example` |

Los tres deben tener **el mismo usuario y la misma contraseña** de PostgreSQL.

Puertos publicados en tu máquina (se pueden cambiar en el `.env` de la raíz):

| Puerto | Servicio | Variable |
|---|---|---|
| `3000` | API Node | `API_PORT` |
| `5433` | PostgreSQL de desarrollo (`booking_app`) | `POSTGRES_PORT` |
| `5434` | PostgreSQL de pruebas (`booking_app_test`) | `POSTGRES_TEST_PORT` |

> Se usan los puertos `5433` y `5434` para no chocar con un PostgreSQL instalado localmente en el `5432`.

## Cómo ejecutarlo

### Opción A: todo en Docker

```bash
cp .env.example .env
docker compose --profile node up -d --build
```

Esto levanta, en orden:

1. **`db`**: PostgreSQL. Las demás piezas esperan a que esté sana (healthcheck).
2. **`flyway-postgres`**: aplica las migraciones y los datos de ejemplo, y termina (`Exited (0)` es lo esperado).
3. **`api-node`**: la API, compilada dentro de la imagen. Arranca cuando Flyway terminó bien.

Usa `--build` cada vez que cambies el código: sin esa opción, Compose reutiliza la imagen anterior.

Para ver los registros de la API:

```bash
docker compose logs -f api-node
```

### Opción B: la API en local, la base de datos en Docker

Es la forma más cómoda para desarrollar, porque la API se reinicia sola al guardar cambios.

1. Levanta solo la base de datos y las migraciones (sin el contenedor de la API, que ocuparía el puerto 3000):

   ```bash
   docker compose --profile node up -d flyway-postgres
   ```

2. Instala las dependencias y crea el `.env` del backend:

   ```bash
   cd backend-node
   npm install
   cp .env.example .env
   ```

   > `DB_HOST=localhost` y `DB_PORT=5433`: la API corre fuera de Docker y se conecta al puerto publicado. Dentro de Docker, en cambio, usa `db:5432` (el nombre del servicio y el puerto interno).

3. Arranca en modo desarrollo:

   ```bash
   npm run dev
   ```

4. Comprueba que responde: http://localhost:3000/health debe devolver `{"status":"ok","database":"ok"}`. Si la base de datos no está disponible, devuelve `503`.

| Script | Qué hace |
|---|---|
| `npm run dev` | Ejecuta TypeScript directamente con `tsx`, con recarga automática y el `.env` cargado. |
| `npm run build` | Compila a JavaScript en `dist/`. |
| `npm start` | Ejecuta la versión compilada (las variables de entorno deben venir del entorno). |
| `npm test` | Revisa los tipos y ejecuta las pruebas automáticas (ver más abajo). |

### Conectarse a la base de datos

Desde pgAdmin, DBeaver, `psql`…:

| Campo | Valor |
|---|---|
| Host | `localhost` |
| Puerto | `POSTGRES_PORT` (por defecto `5433`) |
| Base de datos | `POSTGRES_DB` (por defecto `booking_app`) |
| Usuario / contraseña | `POSTGRES_USER` / `POSTGRES_PASSWORD` |

## Documentación interactiva (Swagger UI)

Con la API levantada:

- **http://localhost:3000/docs**: Swagger UI. Cada endpoint tiene un botón *Try it out* para enviar peticiones reales y ver la respuesta.
- **http://localhost:3000/openapi.json**: el contrato en JSON, para importarlo en Postman o generar tipos para un cliente.

Swagger UI no se escribe aparte: lee `docs/openapi.yaml` al arrancar la API, así que la documentación siempre coincide con el contrato.

## Pruebas automáticas

Son **pruebas de integración**: cada una levanta la app de Express y le hace peticiones HTTP reales, contra una base de datos PostgreSQL real. Así se prueba la cadena completa: rutas, validación, servicios, SQL y las restricciones de la base de datos (solapamientos, claves foráneas, `UNIQUE`).

### Ejecutarlas

1. Crea el `.env` de pruebas (solo la primera vez) y pon la misma contraseña que en el `.env` de la raíz:

   ```bash
   cd backend-node
   cp .env.test.example .env.test
   ```

2. Desde la raíz, levanta la base de pruebas y aplica las migraciones:

   ```bash
   docker compose --profile test run --rm flyway-postgres-test
   ```

3. Desde `backend-node`, ejecuta las pruebas:

   ```bash
   npm test
   ```

4. Cuando termines, puedes bajar la base de pruebas:

   ```bash
   docker compose --profile test down
   ```

> **Repite el paso 2 cada vez que `db-test` arranque** (por ejemplo, después de reiniciar Docker). La base de pruebas guarda sus datos en memoria (`tmpfs`), así que cada arranque empieza vacía y sin tablas. Si las tablas ya existen, Flyway no hace nada, así que se puede ejecutar siempre antes de `npm test`.

### Cómo están organizadas

- **Una base de datos aparte** (`db-test`, perfil `test`, puerto `5434`), con las mismas migraciones pero sin el seed. Las pruebas nunca tocan los datos de desarrollo.
- **Cada prueba empieza con la base vacía**: antes de cada caso se ejecuta `TRUNCATE ... RESTART IDENTITY`, así que los ids siempre empiezan en 1 y ninguna prueba depende de otra. Por seguridad, la limpieza **se niega a ejecutarse** si la base no termina en `_test`.
- **Los datos se preparan con fábricas** (`test/factories.ts`) que insertan directamente con SQL. Así cada prueba solo depende del endpoint que prueba, y se pueden crear casos que la API no permite (por ejemplo, una reserva en el pasado).
- **Las fechas se calculan a partir de hoy** (`dayAt(1, 18)` = mañana a las 18:00 UTC), para que las pruebas no empiecen a fallar solas cuando una fecha fija quede en el pasado.
- **Los archivos se ejecutan uno tras otro** (`--test-concurrency=1`), porque todos comparten la misma base.

Para comprobar que las pruebas no dependen del orden (desde `backend-node`):

```bash
npx tsx --env-file=.env.test --test --test-concurrency=1 --test-randomize "test/**/*.test.ts"
```

## Arquitectura del backend Node

El código está organizado **por módulos** (`users`, `courts`, `bookings`), y cada módulo tiene las mismas capas:

| Capa | Responsabilidad |
|---|---|
| `*.routes.ts` | Asocia cada método y ruta con su controlador. |
| `*.controller.ts` | Lee la petición (`params`, `query`, `body`), llama al servicio y elige el código de respuesta (`201` + `Location`, `204`…). |
| `*.validation.ts` | Comprueba la entrada y la convierte a tipos del dominio. Acumula todos los errores y responde `400` una sola vez. |
| `*.service.ts` | Reglas de negocio y traducción de errores de la base de datos a errores HTTP. |
| `*.repository.ts` | SQL parametrizado (`$1`, `$2`…) y conversión de filas (snake_case) a objetos del dominio (camelCase). |
| `*.types.ts` | Tipos del dominio y de entrada. |

### Manejo de errores

- Las capas lanzan errores (`NotFoundError`, `ConflictError`, `ValidationError`) y Express 5 los lleva solo al `errorHandler`, que responde siempre en formato **Problem Details**.
- Cualquier error inesperado responde `500` con un mensaje genérico, sin exponer detalles internos, y se registra en la consola.
- Las reglas que dependen de otras filas las garantiza **la base de datos**, no un `SELECT` previo (que tendría condiciones de carrera). El servicio intenta la operación y traduce el rechazo:

| Error de PostgreSQL | Restricción | Respuesta |
|---|---|---|
| `23505` unique_violation | `uq_users_email` | `409` email repetido |
| `23503` foreign_key_violation | `fk_bookings_users`, `fk_bookings_courts` al borrar | `409` tiene reservas asociadas |
| `23503` foreign_key_violation | `fk_bookings_users`, `fk_bookings_courts` al crear una reserva | `400` el usuario o la cancha no existen |
| `23P01` exclusion_violation | `ex_bookings_no_overlap` | `409` horario ocupado |

- La cancelación de una reserva también es atómica: las condiciones van en el propio `UPDATE` (`WHERE status = 'confirmed' AND starts_at > now()`). Si no cambia ninguna fila, se consulta la reserva solo para elegir el mensaje de error.

## Modelo de datos

- **users**: `id`, `name`, `email` (único), `created_at`.
- **courts**: `id`, `name`.
- **bookings**: `id`, `user_id` → users, `court_id` → courts, `starts_at`, `ends_at`, `status` (`confirmed` | `cancelled`, por defecto `confirmed`), `observation` (opcional), `created_at`.

Reglas que impone la base de datos:

- El email de un usuario es único.
- Una reserva siempre pertenece a un usuario y a una cancha existentes.
- `ends_at` debe ser posterior a `starts_at`.
- `status` solo admite `confirmed` o `cancelled`.
- **Una cancha no puede tener dos reservas confirmadas que se solapen en el tiempo.** Se implementa con una restricción de exclusión (`ex_bookings_no_overlap`):

  ```sql
  EXCLUDE USING gist (
      court_id                      WITH =,   -- misma cancha
      tstzrange(starts_at, ends_at) WITH &&   -- rangos que se cruzan
  )
  WHERE (status = 'confirmed');
  ```

  - El rango `[starts_at, ends_at)` incluye el inicio y excluye el fin, así que una reserva puede empezar justo cuando termina otra (por ejemplo, 14:00–16:00 y 16:00–18:00).
  - Las reservas canceladas no bloquean la cancha.
  - Requiere la extensión `btree_gist`, que permite combinar la igualdad de `court_id` y el solapamiento de rangos en un mismo índice GiST.
  - Al hacerlo en la base de datos, la regla se cumple incluso con peticiones simultáneas. Si se viola, PostgreSQL devuelve el error `23P01` (*exclusion_violation*).

Las fechas se guardan como `timestamptz` (instantes en UTC). La API las recibe en ISO 8601 con zona horaria obligatoria (`2026-11-14T14:00:00-05:00`) y las devuelve siempre en UTC (`2026-11-14T19:00:00.000Z`).

## Migraciones con Flyway

El esquema de la base de datos **no se crea a mano**: se define en archivos SQL que Flyway aplica en orden. Flyway registra en la tabla `flyway_schema_history` qué migraciones ya se ejecutaron, así que en cada arranque solo aplica las nuevas.

Hay dos tipos de archivo:

- **Versionadas — `V<n>__<descripcion>.sql`** (en `migrations/`): se aplican **una sola vez**, en orden numérico. Cada una describe un cambio sobre el esquema.
- **Repetibles — `R__<descripcion>.sql`** (en `seed/`): se vuelven a aplicar **cada vez que cambia su contenido**, siempre después de las versionadas. Se usan para los datos de ejemplo: el archivo vacía las tablas, reinicia los ids y vuelve a insertar los datos.

Reglas para trabajar con ellas:

- **Nunca edites una migración versionada que ya se aplicó.** Flyway guarda una suma de verificación de cada archivo y se niega a continuar si detecta cambios. Para modificar el esquema, crea una migración nueva (`V5__...`).
- Respeta el formato del nombre: `V`, número, **dos** guiones bajos y descripción.
- Los datos de ejemplo son solo para desarrollo: borran el contenido de las tablas cada vez que se recargan. La base de pruebas no los carga.

## Contrato de la API

El archivo [`docs/openapi.yaml`](docs/openapi.yaml) describe la API en formato **OpenAPI 3.1** y es la **fuente de verdad**: se escribió a mano antes que el código y los dos backends deben cumplirlo. El backend Node lo sirve con Swagger UI en `/docs`.

| Recurso | Endpoints |
|---|---|
| Usuarios | `GET /users`, `POST /users`, `GET /users/{id}`, `PUT /users/{id}`, `DELETE /users/{id}` |
| Canchas | `GET /courts`, `POST /courts`, `GET /courts/{id}`, `PUT /courts/{id}`, `DELETE /courts/{id}` |
| Reservas | `GET /bookings`, `POST /bookings`, `GET /bookings/{id}`, `PATCH /bookings/{id}` |

`GET /bookings` admite los filtros opcionales `userId`, `courtId`, `status`, `from` y `to`, combinables entre sí. `from` y `to` devuelven las reservas que se cruzan con el intervalo `[from, to)`.

Decisiones principales:

- **JSON en camelCase** (`startsAt`); la base de datos usa snake_case (`starts_at`).
- **Errores con Problem Details** ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)): todos tienen el mismo formato JSON, y los de validación incluyen los mensajes por campo en `errors`.
- **Los cuerpos no admiten propiedades desconocidas** (`400`); los parámetros desconocidos de la query string se ignoran.
- **`PUT` reemplaza** el recurso completo (usuarios y canchas); **`PATCH` modifica parcialmente** (reservas).
- **Las reservas no se borran ni se editan**: con `PATCH` solo se cambia `status`, y el servidor valida la transición. Solo se permite `confirmed` → `cancelled`, y solo antes de que empiece la reserva.
- **Reglas de las reservas**: duran entre 1 y 3 horas, empiezan y terminan en hora en punto, no pueden estar en el pasado (`400`) y no pueden cruzarse con otra reserva confirmada de la misma cancha (`409`).
- **No se puede eliminar** un usuario o una cancha con reservas (`409`).

## Comandos útiles

```bash
# Ver el estado de los contenedores
docker compose ps

# Apagar los contenedores (los datos de desarrollo se conservan en el volumen)
docker compose --profile node --profile test down

# Apagar y borrar el volumen: la próxima vez se crea todo desde cero
docker compose --profile node down -v
```

## Próximos pasos

- Backend .NET (ASP.NET Core) con SQL Server, cumpliendo el mismo contrato.
- Migraciones de SQL Server y el procedimiento almacenado que evite reservas solapadas.
- Perfil `dotnet` en Docker Compose.
