-- Identificador interno CrioBlood e dados complementares das bolsas.
-- Executar uma única vez em cada banco (comandos idempotentes).

CREATE SEQUENCE IF NOT EXISTS hemocomponentes_codigo_interno_seq;

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

-- Gera identificadores para bolsas antigas sem alterar seus códigos originais.
UPDATE hemocomponentes
SET codigo_interno = 'CB-' || to_char(CURRENT_DATE, 'YY') || '-' ||
    lpad(nextval('hemocomponentes_codigo_interno_seq')::text, 7, '0')
WHERE codigo_interno IS NULL OR codigo_interno = '';

ALTER TABLE hemocomponentes ALTER COLUMN codigo_interno SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_hemocomponentes_codigo_interno
    ON hemocomponentes(codigo_interno);
