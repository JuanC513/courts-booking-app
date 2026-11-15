TRUNCATE TABLE bookings, courts, users RESTART IDENTITY;

INSERT INTO users (name, email) VALUES
	('Pepe', 'pepe@example.com');

INSERT INTO courts (name) VALUES
	('Cancha Estados Unidos'),
	('Cancha Colombia'),
	('Cancha Puerto Rico'),
	('Cancha Canadá'),
	('Cancha México');

INSERT INTO bookings (user_id, court_id, starts_at, ends_at) VALUES
  (1, 2, '2026-11-14T14:00:00-05:00', '2026-11-14T17:00:00-05:00');