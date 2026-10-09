-- PostgreSQL migration: Require new staff accounts to replace their temporary password.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_reset_required SMALLINT NOT NULL DEFAULT 0;
