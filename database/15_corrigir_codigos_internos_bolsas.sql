-- CrioBlood: corrigir identificadores locais antigos ou ausentes.
-- Gera um código interno aleatório, único e permanente para cada bolsa sem código
-- ou que ainda use o identificador temporário CB-LEGADO-*.
-- Os códigos originais das bolsas e códigos internos válidos já emitidos são preservados.

BEGIN;

CREATE SEQUENCE IF NOT EXISTS hemocomponentes_codigo_interno_seq START 1;

ALTER TABLE hemocomponentes
    ADD COLUMN IF NOT EXISTS codigo_interno VARCHAR(32);

DO $$
DECLARE
    bolsa RECORD;
    novo_codigo VARCHAR(32);
BEGIN
    FOR bolsa IN
        SELECT id
        FROM hemocomponentes
        WHERE codigo_interno IS NULL
           OR btrim(codigo_interno) = ''
           OR UPPER(codigo_interno) LIKE 'CB-LEGADO-%'
        ORDER BY id
    LOOP
        LOOP
            novo_codigo :=
                'CB-' ||
                to_char(CURRENT_DATE, 'YY') ||
                '-' ||
                lpad((1000000 + floor(random() * 9000000)::BIGINT)::TEXT, 7, '0');

            EXIT WHEN NOT EXISTS (
                SELECT 1
                FROM hemocomponentes existente
                WHERE existente.codigo_interno = novo_codigo
            );
        END LOOP;

        UPDATE hemocomponentes
        SET codigo_interno = novo_codigo,
            atualizado_em = CURRENT_TIMESTAMP
        WHERE id = bolsa.id;
    END LOOP;
END $$;

-- Garante que nenhuma bolsa futura volte a ficar sem identificador.
ALTER TABLE hemocomponentes
    ALTER COLUMN codigo_interno SET NOT NULL;

-- Garante unicidade do identificador local.
CREATE UNIQUE INDEX IF NOT EXISTS uq_hemocomponentes_codigo_interno
    ON hemocomponentes (codigo_interno);

-- Posiciona a sequência após o maior sufixo numérico existente para evitar
-- colisões entre os códigos aleatórios retroativos e os novos códigos sequenciais.
SELECT setval(
    'hemocomponentes_codigo_interno_seq',
    GREATEST(
        COALESCE((
            SELECT MAX(substring(codigo_interno FROM '([0-9]+)$')::BIGINT)
            FROM hemocomponentes
            WHERE codigo_interno ~ '^CB-[0-9]{2}-[0-9]+$'
        ), 0) + 1,
        1
    ),
    false
);

COMMIT;
