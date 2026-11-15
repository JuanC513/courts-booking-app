CREATE TABLE courts (
    id    int          GENERATED ALWAYS AS IDENTITY,
    name  varchar(100) NOT NULL,

    CONSTRAINT pk_courts PRIMARY KEY (id)
);
