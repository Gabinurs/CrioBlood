-- Atualiza as opções de prazo/modalidade das solicitações transfusionais.
-- Seguro para executar em bancos já existentes; preserva registros antigos.

ALTER TABLE solicitacoes_transfusionais
    ALTER COLUMN urgencia TYPE VARCHAR(30);

ALTER TABLE solicitacoes_transfusionais
    ALTER COLUMN urgencia SET DEFAULT 'ROTINA_24H';

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
