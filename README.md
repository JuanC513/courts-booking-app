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
| Contrato de la API (`docs/openapi.yaml`) | ⏳ Pendiente |
| Backend Node.js (`backend-node/`) | ⏳ Pendiente |
| Base de datos SQL Server | ⏳ Pendiente |
| Backend .NET (`backend-dotnet/`) | ⏳ Pendiente |

Por ahora, el proyecto levanta una base de datos PostgreSQL con su esquema y datos de ejemplo cargados automáticamente.

## Tecnologías

- **PostgreSQL 17**: base de datos del backend Node.
- **Flyway 11**: herramienta de migraciones con archivos SQL puros.
- **Docker Compose**: levanta la base de datos y aplica las migraciones con un solo comando.

## Estructura

```
.
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

## Próximos pasos

- Contrato de la API en `docs/openapi.yaml`, visible con Swagger UI.
- Backend Node.js con Express, TypeScript y el driver `pg`.
- Pruebas automáticas de los endpoints.
- Versión .NET con SQL Server.
