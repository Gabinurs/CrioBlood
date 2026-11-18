-- CrioBlood: amplia as funções profissionais disponíveis no cadastro.
-- Execute uma vez no banco crioblood após a migration 08.

ALTER TABLE usuarios
    DROP CONSTRAINT IF EXISTS usuarios_funcao_check;

ALTER TABLE usuarios
    ADD CONSTRAINT usuarios_funcao_check
    CHECK (funcao IN (
        'NAO_INFORMADO',
        'TECNICO_ENFERMAGEM',
        'TECNICO_LABORATORIO',
        'TECNICO_TRANSFUSAO',
        'ENFERMEIRO',
        'BIOMEDICO',
        'MEDICO'
    ));
