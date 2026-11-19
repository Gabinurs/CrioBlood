-- CRIOBLOOD: permissões por módulo (controlam o acesso de usuários não administradores)
-- Pode ser executado mais de uma vez.

INSERT INTO permissoes (codigo, descricao)
VALUES
    ('pacientes.gerenciar',     'Pacientes: consultar, cadastrar e editar'),
    ('lotes.gerenciar',         'Lotes de recebimento: abrir e fechar'),
    ('bolsas.gerenciar',        'Cadastro de bolsas: cadastrar e editar'),
    ('estoque.visualizar',      'Estoque: consultar bolsas e localização'),
    ('estoque.gerenciar',       'Estoque: definir local das bolsas e gerenciar equipamentos'),
    ('solicitacoes.gerenciar',  'Solicitações transfusionais: criar e cancelar'),
    ('compatibilidade.reservar','Compatibilidade: reservar bolsa para solicitação'),
    ('transfusoes.registrar',   'Transfusão: registrar a saída da bolsa'),
    ('relatorios.visualizar',   'Relatórios: consultar e exportar')
ON CONFLICT (codigo) DO NOTHING;
