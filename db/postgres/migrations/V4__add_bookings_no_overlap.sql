CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
    ADD CONSTRAINT ex_bookings_no_overlap
    EXCLUDE USING gist (
        court_id                      WITH =,
        tstzrange(starts_at, ends_at) WITH &&
    )
    WHERE (status = 'confirmed');