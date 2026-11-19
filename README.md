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
| Backend Node.js (`backend-node/`) | 🚧 En progreso: servidor y conexión a PostgreSQL |
| Base de datos SQL Server | ⏳ Pendiente |
| Backend .NET (`backend-dotnet/`) | ⏳ Pendiente |

Por ahora, el proyecto levanta una base de datos PostgreSQL con su esquema y datos de ejemplo cargados automáticamente, y tiene definido el contrato que implementarán los backends.

## Tecnologías

- **Node.js 26 + TypeScript**: lenguaje y entorno del backend Node.
- **Express 5**: framework web del backend Node.
- **pg**: driver de PostgreSQL para Node (consultas SQL parametrizadas, sin ORM).
- **PostgreSQL 17**: base de datos del backend Node.
- **Flyway 11**: herramienta de migraciones con archivos SQL puros.
- **Docker Compose**: levanta la base de datos y aplica las migraciones con un solo comando.

## Estructura

```
.
├── backend-node/
│   ├── src/
│   │   ├── app.ts                 # Configura Express (middlewares y rutas)
│   │   ├── server.ts              # Arranca el servidor
│   │   ├── config.ts              # Lee y valida las variables de entorno
│   │   └── db/
│   │       └── pool.ts            # Pool de conexiones a PostgreSQL
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   └── openapi.yaml               # Contrato de la API (OpenAPI 3.1)
├── db/
│   └── postgres/
│       ├── migrations/            # Cambios de esquema versionados
│       │   ├── V1__create_users.sql
│       │   ├── V2__create_courts.sql
│       │   ├── V3__create_bookings.sql
│       │   └── V4__add_bookings_no_overlap.sql
│       └── seed/                  # Datos de ejemplo para desarrollo
│           └── R__seed_data.sql
├── docker-compose.yml
├── .env.example                   # Plantilla de variables de entorno
└── README.md
```

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose).
- [Node.js 26](https://nodejs.org/) o superior, para ejecutar el backend Node en local.

## Cómo ejecutarlo

1. Copia la plantilla de variables de entorno y, si quieres, cambia la contraseña:

   ```bash
   cp .env.example .env
   ```

2. Levanta el perfil `node`:

   ```bash
   docker compose --profile node up
   ```

   Esto arranca dos servicios:
   - **`db`**: PostgreSQL. Espera a estar listo (healthcheck) antes de que arranque lo demás.
   - **`flyway-postgres`**: aplica las migraciones y los datos de ejemplo, y termina.

3. Conéctate a la base de datos desde tu cliente favorito (pgAdmin, DBeaver, `psql`…):

   | Campo | Valor |
   |---|---|
   | Host | `localhost` |
   | Puerto | `POSTGRES_PORT` del `.env` (por defecto `5433`) |
   | Base de datos | `POSTGRES_DB` (por defecto `booking_app`) |
   | Usuario / contraseña | `POSTGRES_USER` / `POSTGRES_PASSWORD` |

   > Se usa el puerto `5433` en el host para no chocar con un PostgreSQL instalado localmente en el `5432`.

### Ejecutar el backend Node en local

Por ahora la API se ejecuta en tu máquina, fuera de Docker, y se conecta a la base de datos que levanta Compose.

1. Con la base de datos corriendo (paso anterior), entra a la carpeta del backend e instala las dependencias:

   ```bash
   cd backend-node
   npm install
   ```

2. Copia la plantilla de variables de entorno y usa los mismos datos de conexión que en el `.env` de la raíz:

   ```bash
   cp .env.example .env
   ```

   > `DB_HOST=localhost` y `DB_PORT=5433` porque la API corre fuera de Docker y se conecta al puerto publicado en el host.

3. Arranca en modo desarrollo (se reinicia al guardar cambios):

   ```bash
   npm run dev
   ```

4. Comprueba que responde: `http://localhost:3000/health` debe devolver `{"status":"ok","database":"ok"}`. Si la base de datos no está disponible, devuelve `503`.

| Script | Qué hace |
|---|---|
| `npm run dev` | Ejecuta TypeScript directamente con `tsx`, con recarga automática y el `.env` cargado. |
| `npm run build` | Compila a JavaScript en `dist/`. |
| `npm start` | Ejecuta la versión compilada (las variables de entorno deben venir del entorno). |

### Comandos útiles

```bash
# Apagar los contenedores (los datos se conservan en el volumen)
docker compose --profile node down

# Apagar y borrar el volumen: la próxima vez se crea todo desde cero
docker compose --profile node down -v
```

## Modelo de datos

- **users**: `id`, `name`, `email` (único), `created_at`.
- **courts**: `id`, `name`.
- **bookings**: `id`, `user_id` → users, `court_id` → courts, `starts_at`, `ends_at`, `status` (`confirmed` | `cancelled`, por defecto `confirmed`), `observation` (opcional), `created_at`.

Reglas que ya impone la base de datos:

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

Las fechas se guardan como `timestamptz` (instantes en UTC) y se escriben en formato ISO 8601 con zona horaria, por ejemplo `2026-11-14T14:00:00-05:00`.

## Migraciones con Flyway

El esquema de la base de datos **no se crea a mano**: se define en archivos SQL que Flyway aplica en orden. Flyway registra en la tabla `flyway_schema_history` qué migraciones ya se ejecutaron, así que en cada arranque solo aplica las nuevas.

Hay dos tipos de archivo:

- **Versionadas — `V<n>__<descripcion>.sql`** (en `migrations/`): se aplican **una sola vez**, en orden numérico. Cada una describe un cambio sobre el esquema.
- **Repetibles — `R__<descripcion>.sql`** (en `seed/`): se vuelven a aplicar **cada vez que cambia su contenido**, siempre después de las versionadas. Se usan para los datos de ejemplo: el archivo vacía las tablas, reinicia los ids y vuelve a insertar los datos.

Reglas para trabajar con ellas:

- **Nunca edites una migración versionada que ya se aplicó.** Flyway guarda una suma de verificación de cada archivo y se niega a continuar si detecta cambios. Para modificar el esquema, crea una migración nueva (`V4__...`).
- Respeta el formato del nombre: `V`, número, **dos** guiones bajos y descripción.
- Los datos de ejemplo son solo para desarrollo: borran el contenido de las tablas cada vez que se recargan.

## Contrato de la API

El archivo [`docs/openapi.yaml`](docs/openapi.yaml) describe la API en formato **OpenAPI 3.1** y es la **fuente de verdad**: se escribe a mano antes que el código y los dos backends deben cumplirlo. Cada backend lo servirá con **Swagger UI**, para leer la documentación y probar los endpoints desde el navegador.

| Recurso | Endpoints |
|---|---|
| Usuarios | `GET /users`, `POST /users`, `GET /users/{id}`, `PUT /users/{id}`, `DELETE /users/{id}` |
| Canchas | `GET /courts`, `POST /courts`, `GET /courts/{id}`, `PUT /courts/{id}`, `DELETE /courts/{id}` |
| Reservas | `GET /bookings`, `POST /bookings`, `GET /bookings/{id}`, `PATCH /bookings/{id}` |

Decisiones principales:

- **JSON en camelCase** (`startsAt`); la base de datos usa snake_case (`starts_at`).
- **Errores con Problem Details** ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)): todos tienen el mismo formato JSON, y los de validación incluyen los mensajes por campo en `errors`.
- **`PUT` reemplaza** el recurso completo (usuarios y canchas); **`PATCH` modifica parcialmente** (reservas).
- **Las reservas no se borran ni se editan**: con `PATCH` solo se cambia `status`, y el servidor valida la transición. Por ahora solo se permite `confirmed` → `cancelled`, y solo antes de que empiece la reserva.
- **Reglas de las reservas**: duran entre 1 y 3 horas, empiezan y terminan en hora en punto, no pueden estar en el pasado y no pueden cruzarse con otra reserva confirmada de la misma cancha (`409`).
- **No se puede eliminar** un usuario o una cancha con reservas (`409`).

## Próximos pasos

- Endpoints del backend Node: usuarios, canchas y reservas, con capas de rutas, controladores, servicios y repositorios.
- Swagger UI sirviendo `docs/openapi.yaml`.
- Manejo de errores centralizado con Problem Details.
- Backend Node dentro de Docker Compose (perfil `node`).
- Pruebas automáticas de los endpoints.
- Versión .NET con SQL Server.
