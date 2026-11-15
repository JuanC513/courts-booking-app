CREATE TABLE users (
    id          int          GENERATED ALWAYS AS IDENTITY,
    name        varchar(75)  NOT NULL,
    email       varchar(100) NOT NULL,
    created_at  timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT pk_users       PRIMARY KEY (id),
    CONSTRAINT uq_users_email UNIQUE (email)
);
