CREATE TABLE venue (
                       id BIGSERIAL PRIMARY KEY,
                       name VARCHAR(160) NOT NULL,
                       slug VARCHAR(100) NOT NULL UNIQUE,
                       address VARCHAR(300) NOT NULL,
                       emergency_instructions VARCHAR(1000) NOT NULL
);

CREATE TABLE staff_user (
                            id BIGSERIAL PRIMARY KEY,
                            name VARCHAR(160) NOT NULL,
                            email VARCHAR(254) NOT NULL UNIQUE,
                            password_hash VARCHAR(100) NOT NULL,
                            role VARCHAR(30) NOT NULL,
                            venue_id BIGINT NOT NULL REFERENCES venue(id)
);

CREATE TABLE incident (
                          id BIGSERIAL PRIMARY KEY,
                          venue_id BIGINT NOT NULL REFERENCES venue(id),
                          type VARCHAR(30) NOT NULL,
                          severity VARCHAR(30) NOT NULL,
                          description VARCHAR(2000) NOT NULL,
                          location VARCHAR(200) NOT NULL,
                          reporter_name VARCHAR(160),
                          reporter_phone VARCHAR(40),
                          status VARCHAR(30) NOT NULL,
                          assigned_to_id BIGINT REFERENCES staff_user(id),
                          created_at TIMESTAMPTZ NOT NULL,
                          updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE incident_update (
                                 id BIGSERIAL PRIMARY KEY,
                                 incident_id BIGINT NOT NULL REFERENCES incident(id),
                                 author_id BIGINT REFERENCES staff_user(id),
                                 message VARCHAR(1000) NOT NULL,
                                 created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_incident_venue_status
    ON incident(venue_id, status);

CREATE INDEX idx_incident_update_timeline
    ON incident_update(incident_id, created_at);
