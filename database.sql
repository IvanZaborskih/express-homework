CREATE TABLE notification (
    id SERIAL PRIMARY KEY,
    title CHARACTER VARYING(30),
    text CHARACTER VARYING(1000),
    recipient TEXT,
    status CHARACTER VARYING(30),
    date_of_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_send TIMESTAMP,
    type_send TEXT
);