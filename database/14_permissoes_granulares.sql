-- CRIOBLOOD: permissões granulares por ação.
-- Seguro para executar mais de uma vez; mantém os códigos antigos por compatibilidade.

INSERT INTO permissoes (codigo, descricao)
VALUES
    ('lotes.visualizar', 'Lotes: visualizar recebimentos e histórico'),
    ('lotes.abrir', 'Lotes: abrir novo lote'),
    ('lotes.fechar', 'Lotes: fechar lote'),
    ('lotes.relatorio', 'Lotes: visualizar e imprimir comprovante'),
    ('bolsas.visualizar', 'Bolsas: visualizar cadastro e detalhes'),
    ('bolsas.cadastrar', 'Bolsas: cadastrar novas bolsas'),
    ('bolsas.editar', 'Bolsas: editar dados das bolsas'),
    ('bolsas.descartar', 'Bolsas: descartar com justificativa'),
    ('estoque.visualizar', 'Estoque: consultar bolsas'),
    ('estoque.localizacao.visualizar', 'Estoque: consultar localização'),
    ('estoque.localizacao.editar', 'Estoque: alterar localização'),
    ('equipamentos.visualizar', 'Equipamentos: consultar'),
    ('equipamentos.cadastrar', 'Equipamentos: cadastrar'),
    ('equipamentos.editar', 'Equipamentos: editar'),
    ('pacientes.visualizar', 'Receptores: consultar e visualizar dossiê'),
    ('pacientes.cadastrar', 'Receptores: cadastrar'),
    ('pacientes.editar', 'Receptores: editar'),
    ('amostras.visualizar', 'Amostras: consultar'),
    ('amostras.cadastrar', 'Amostras: cadastrar'),
    ('amostras.editar', 'Amostras: editar e registrar exames'),
    ('solicitacoes.visualizar', 'Solicitações: consultar'),
    ('solicitacoes.cadastrar', 'Solicitações: cadastrar'),
    ('solicitacoes.editar', 'Solicitações: editar e cancelar'),
    ('compatibilidade.visualizar', 'Compatibilidade: consultar'),
    ('compatibilidade.reservar', 'Compatibilidade: reservar bolsas'),
    ('transfusoes.visualizar', 'Transfusões: consultar'),
    ('transfusoes.registrar', 'Transfusões: registrar'),
    ('relatorios.visualizar', 'Relatórios: consultar'),
    ('relatorios.exportar', 'Relatórios: exportar e imprimir')
ON CONFLICT (codigo) DO NOTHING;
