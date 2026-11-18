-- CrioBlood: atualiza os valores permitidos para a urgência das solicitações.
-- Execute uma única vez no banco crioblood. Mantém os registros existentes.

ALTER TABLE solicitacoes_transfusionais
    DROP CONSTRAINT IF EXISTS solicitacoes_transfusionais_urgencia_check;

ALTER TABLE solicitacoes_transfusionais
    ADD CONSTRAINT solicitacoes_transfusionais_urgencia_check
    CHECK (urgencia IN (
        'SOLICITACAO_3H',
        'SOLICITACAO_6H',
        'ROTINA_24H',
        'RESERVA_CIRURGICA',
        'EXTREMA_URGENCIA',
        'ROTINA',
        'URGENTE',
        'EMERGENCIA'
    ));
