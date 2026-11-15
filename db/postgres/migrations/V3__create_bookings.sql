CREATE TABLE bookings (
    id           int          GENERATED ALWAYS AS IDENTITY,
    user_id      int          NOT NULL,
    court_id     int          NOT NULL,
    starts_at    timestamptz  NOT NULL,
    ends_at      timestamptz  NOT NULL,
    status       varchar(20)  NOT NULL DEFAULT 'confirmed',
    observation  varchar(255),
    created_at   timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT pk_bookings        PRIMARY KEY (id),
    CONSTRAINT fk_bookings_users  FOREIGN KEY (user_id)  REFERENCES users (id),
    CONSTRAINT fk_bookings_courts FOREIGN KEY (court_id) REFERENCES courts (id),
    CONSTRAINT ck_bookings_dates  CHECK (ends_at > starts_at),
    CONSTRAINT ck_bookings_status CHECK (status IN ('confirmed', 'cancelled'))
);
