CREATE TABLE otp_verifications (
                                   id          BIGSERIAL PRIMARY KEY,
                                   phone       VARCHAR(20) NOT NULL,
                                   otp         VARCHAR(64) NOT NULL,
                                   verified    BOOLEAN     NOT NULL DEFAULT FALSE,
                                   attempts    INT         NOT NULL DEFAULT 0,
                                   user_id     BIGINT REFERENCES staff_user(id) ON DELETE CASCADE,
                                   created_at  TIMESTAMPTZ NOT NULL,
                                   expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_otp_user    ON otp_verifications(user_id, verified);
CREATE INDEX idx_otp_expires ON otp_verifications(expires_at);

CREATE TABLE ott_token (
                           id            BIGSERIAL PRIMARY KEY,
                           access_token  VARCHAR(100) NOT NULL UNIQUE,
                           created_at    TIMESTAMPTZ  NOT NULL,
                           expires_at    TIMESTAMPTZ  NOT NULL,
                           user_id       BIGINT NOT NULL UNIQUE REFERENCES staff_user(id) ON DELETE CASCADE
);
CREATE INDEX idx_ott_expires ON ott_token(expires_at);

CREATE TABLE refresh_tokens (
                                id             BIGSERIAL PRIMARY KEY,
                                refresh_token  VARCHAR(100) NOT NULL UNIQUE,
                                factors        VARCHAR(200) NOT NULL DEFAULT '',   -- comma separated, restored on token refresh
                                created_at     TIMESTAMPTZ  NOT NULL,
                                expires_at     TIMESTAMPTZ  NOT NULL,
                                user_id        BIGINT NOT NULL UNIQUE REFERENCES staff_user(id) ON DELETE CASCADE
);

ALTER TABLE incident ADD COLUMN version BIGINT NOT NULL DEFAULT 0;