-- Cadastro ampliado de bolsas: identificador interno, volume e triagem.
-- Executar uma vez no banco existente: docker compose exec db psql -U postgres -d crioblood -f /dev/stdin < database/10_identificacao_e_exames_bolsas.sql

CREATE SEQUENCE IF NOT EXISTS hemocomponentes_codigo_interno_seq START 1;

ALTER TABLE hemocomponentes
    ADD COLUMN IF NOT EXISTS codigo_interno VARCHAR(32),
    ADD COLUMN IF NOT EXISTS volume_ml INTEGER,
    ADD COLUMN IF NOT EXISTS anti_hbc BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS anti_hcv BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS anti_hiv_1_2 BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS anti_htlv_i_ii BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS chagas BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS hbsag BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS nat_hbv BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS nat_hcv BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS nat_hiv BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS nat_malaria BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sifilis BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pesquisa_hbs BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pai_negativo BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE hemocomponentes
SET codigo_interno = 'CB-LEGADO-' || id::text
WHERE codigo_interno IS NULL;

ALTER TABLE hemocomponentes
    ALTER COLUMN codigo_interno SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hemocomponentes_codigo_interno
    ON hemocomponentes(codigo_interno);

ALTER TABLE hemocomponentes
    ADD CONSTRAINT ck_hemocomponentes_volume_ml
    CHECK (volume_ml IS NULL OR volume_ml > 0);
