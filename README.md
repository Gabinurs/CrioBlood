# CrioBlood

Sistema web de gerenciamento de um hemocentro, desenvolvido como projeto acadêmico
(Santa Casa de Misericórdia de Cruzeiro). Controla o caminho completo da bolsa de sangue:
**recebimento em lote → conferência → armazenamento → solicitação → compatibilidade/reserva → transfusão**,
com auditoria e controle de acesso por usuário.

## Tecnologias

Node.js 20+, Express 5, EJS, PostgreSQL (driver `pg`, SQL direto), express-session, helmet,
express-rate-limit, express-validator, bcrypt, node-cron. HTML/CSS puros no front.

## Como rodar

### Com Docker (mais simples)

```bash
cp .env.example .env          # defina SESSION_SECRET, DB_PASSWORD e SUPERVISOR_PASSWORD
docker compose up --build -d  # sobe o PostgreSQL (cria as tabelas sozinho) e o app
docker compose exec app node src/scripts/criar-supervisor.js
```

Acesse `http://localhost:3001` e entre com o login `Supervisor` e a senha definida em `SUPERVISOR_PASSWORD`.

### Sem Docker

1. Crie um banco PostgreSQL chamado `crioblood`.
2. Execute, **nesta ordem**, os scripts de `database/` (`01_...sql` até `09_...sql`).
3. `cp .env.example .env` e preencha os valores.
4. `npm install`
5. `node src/scripts/criar-supervisor.js` (cria o administrador)
6. `npm run dev` (ou `npm start`) e acesse `http://localhost:<PORT>`.

Verificação de saúde: `GET /saude`.

## Testes

```bash
npm test
```

Cobrem a compatibilidade ABO/Rh, a proteção dos status das bolsas, as regras de senha, permissões, CSRF,
paginação, códigos de status/erros, as expressões regulares dos campos, a validação dos models e as máscaras.

## Perfis e permissões

- **Supervisor / administrador**: acesso total, cadastra usuários, redefine senhas, define permissões
  e é o único que pode **descartar** bolsas.
- **Demais usuários**: só enxergam e acessam os módulos para os quais receberam permissão
  (`Usuários → Permissões`). O menu mostra apenas o que a pessoa pode usar.
- As permissões e a situação da conta (ativa/desativada) são conferidas **a cada requisição**:
  desativar alguém ou tirar uma permissão vale imediatamente.

| Permissão | Libera |
|---|---|
| `pacientes.gerenciar` | Consultar, cadastrar e editar pacientes |
| `lotes.gerenciar` | Abrir e fechar lotes de recebimento |
| `bolsas.gerenciar` | Cadastrar e editar bolsas |
| `estoque.visualizar` | Consultar bolsas em estoque |
| `estoque.gerenciar` | Definir local das bolsas e gerenciar equipamentos |
| `solicitacoes.gerenciar` | Criar e cancelar solicitações transfusionais |
| `compatibilidade.reservar` | Buscar bolsas compatíveis e reservar |
| `transfusoes.registrar` | Registrar a transfusão |
| `relatorios.visualizar` | Relatórios e exportação CSV |
| `usuarios.*` | (reservadas; a gestão de usuários é exclusiva de administradores) |

## Segurança

- Cadastro de usuários feito apenas pelo administrador; senhas com bcrypt (mín. 8 caracteres).
- Cada pessoa pode trocar a própria senha (`Alterar minha senha`); o administrador pode redefinir a de qualquer usuário.
- Limite de 10 tentativas de login falhas por 15 min e limite geral de requisições; `helmet` ativo.
- **Proteção CSRF:** todo formulário leva um token secreto da sessão (`_csrf`); POST sem o token certo recebe 403.
- **Sessões no PostgreSQL** (tabela `session`, via `connect-pg-simple`): reiniciar o servidor não desloga ninguém.
- Trocar ou redefinir a senha **encerra as outras sessões** da conta (na troca da própria senha, a sessão atual continua).
  Desativar um usuário também encerra os acessos dele.
- Cookie de sessão `httpOnly`, `sameSite=lax` e `secure` em produção. Atrás de proxy HTTPS use `NODE_ENV=production`.
- O banco trabalha no fuso de Brasília (`America/Sao_Paulo`), então a validade das bolsas vence à meia-noite daqui.
- Ações importantes são registradas na tabela `logs_auditoria`.
- Nunca versione o `.env`; o `.dockerignore` impede que ele entre na imagem.

### Atualizar a senha do Supervisor (pela linha de comando)

1. Altere `SUPERVISOR_PASSWORD` no `.env`.
2. `node src/scripts/criar-supervisor.js --atualizar-senha`

## Regras automáticas de validade

À meia-noite (horário de Brasília) e sempre que o sistema inicia:

- bolsas vencidas viram **Vencida** e liberam a posição física;
- se a bolsa vencida estava **reservada**, a solicitação volta para **Pendente** (sem bolsa) para que outra
  bolsa compatível seja escolhida, e o fato fica na auditoria (`RESERVA_DESFEITA_VENCIMENTO`, ação do sistema).

## Listagens

Pacientes, bolsas, estoque, solicitações, lotes e histórico de transfusões são paginados (20 por página,
`?pagina=N`), preservando os filtros da URL. O relatório já é limitado por período e o CSV exporta tudo.

## Arquitetura (MVC)

O projeto segue o padrão **MVC**, com uma camada de serviços para os processos que envolvem várias entidades.
Cada camada tem uma responsabilidade e **não existe SQL fora de `models/` e `services/`**.

```
src/
├── app.js            inicialização: middlewares, rotas, tratamento de erros
├── config/           configuração (conexão com o PostgreSQL)
├── routes/           (R) URLs e permissões exigidas por cada uma
├── controllers/      (C) recebem a requisição, chamam models/services e escolhem a resposta
├── models/           (M) entidades: SQL, validação e regras de cada tabela
│   ├── pacienteModel, loteModel, hemocomponenteModel, solicitacaoModel,
│   ├── equipamentoModel, usuarioModel, auditoriaModel, estoqueModel,
│   └── relatorioModel, dashboardModel
├── services/         processos de negócio que cruzam entidades (transações)
│   ├── compatibilidadeService (regras ABO/Rh) e transfusaoService
│   ├── validadeService (vencimento de bolsas e reservas)
│   └── authService e sessaoService
├── views/            (V) telas EJS (partials/inicio e fim formam o layout)
├── middlewares/      login, permissões, CSRF, validação e tratamento de erros
├── utils/            status HTTP, erros, regex dos campos, paginação
└── scripts/          tarefas de linha de comando e CRON (criar supervisor, validade...)
database/             scripts SQL numerados (rodam na ordem)
public/               CSS e JavaScript do navegador (inclui as máscaras)
```

Fluxo de uma requisição: `routes` → `middlewares` (login, permissão, CSRF, validação) → `controllers` →
`models`/`services` → banco; o controller devolve uma `view` (HTML) ou uma página de erro padronizada.

Atalhos: `npm run supervisor` (cria o administrador), `npm run db:testar` (testa a conexão) e
`npm run db:permissoes` (reaplica as permissões do Supervisor).

## Códigos de status HTTP

Os números ficam centralizados em `src/utils/status.js` e são usados pelo nome no código.

| Código | Nome no código | Quando acontece |
|---|---|---|
| 200 | `OK` | página, CSV ou JSON (`/saude`) entregue |
| 302 | `REDIRECIONAR` | GET que leva a outra página (ex.: sem login → `/login`) |
| 303 | `VER_OUTRO` | POST concluído com sucesso → abre a tela de destino (padrão Post/Redirect/Get) |
| 400 | `REQUISICAO_INVALIDA` | endereço malformado (ex.: id que não é número) |
| 401 | `NAO_AUTENTICADO` | login ou senha incorretos |
| 403 | `PROIBIDO` | sem permissão, ou token CSRF inválido |
| 404 | `NAO_ENCONTRADO` | página ou registro inexistente |
| 409 | `CONFLITO` | conflita com o estado atual: duplicado, lote fechado, posição ocupada, bolsa reservada |
| 422 | `ENTIDADE_INVALIDA` | dados que não passaram na validação (regex, tamanho, data, regra) |
| 429 | `MUITAS_REQUISICOES` | limite de tentativas de login excedido |
| 500 | `ERRO_INTERNO` | falha inesperada (a mensagem técnica fica só no log do servidor) |
| 503 | `INDISPONIVEL` | banco de dados fora do ar (`/saude`) |

Os erros "esperados" são classes em `src/utils/erros.js`: `ErroValidacao` (422), `ErroConflito` (409) e
`ErroNaoEncontrado` (404). A função `enviarErro` mostra a página de erro com o código; quem pede JSON
(`Accept: application/json`) recebe JSON. Ações que terminam em redirecionamento (cancelar, reservar, fechar
lote) mostram o aviso na tela de destino e respondem 303.

## Validação dos campos (regex e máscaras)

Todas as expressões regulares ficam em **um só lugar**, `src/utils/padroes.js`, e são usadas em três camadas:

1. **Servidor** (obrigatória, nunca depende do navegador): models e middlewares recusam com 422.
2. **Atributo HTML `pattern`** + `title`: validação nativa do navegador, com a mensagem do campo.
3. **Máscaras de digitação** (`public/js/mascaras.js`, via `data-mascara`): limpam o que é digitado ou colado.

| Campo | Regra | Máscara |
|---|---|---|
| Nome de pessoa (paciente, usuário, médico) | 3–120; letras com acento, espaço, `'` `.` `-`; começa por letra | só letras, sem espaços repetidos |
| Prontuário | até 30; letras, números, `.` `/` `-` | maiúsculas, remove símbolos |
| Código da bolsa | 3–30; letras, números e `-` | maiúsculas, remove símbolos |
| Login | 3–30; letras, números, `.` `_` `-`, sem espaço | remove espaços e acentos |
| Senha | 8–72, com ao menos 1 letra e 1 número | — (mensagem em tempo real) |
| Nome de equipamento | 2–100; letras, números, espaço, `.` `/` `-` | filtra caracteres |
| Temperatura | `-80`, `4,5`, até 2 decimais | só número; ao sair vira `-80 °C` |
| Gaveta, caixa e posição | até 10; letras, números, `-` | maiúsculas (`A1`, `B12`) |
| Observações e indicação | até 500, sem caracteres de controle | contador de caracteres |
| Datas | AAAA-MM-DD e existente no calendário (nada de 30/02); nascimento não pode ser futuro | — |

O servidor também **normaliza** os valores (remove espaços repetidos, guarda prontuário, código da bolsa e
posição em maiúsculas), evitando duplicados como `ab-12` e `AB-12`.

## Limitações conhecidas / próximos passos

- Cada solicitação pede uma única bolsa (para várias, crie várias solicitações).
- Equipamentos e usuários não são paginados (quantidade pequena por natureza).
- O token CSRF é por sessão (não por formulário); suficiente para este porte de sistema.
- Não há recuperação de senha por e-mail: a redefinição é feita por um administrador.

## Status

Funcional: fluxo completo de ponta a ponta, relatórios, auditoria e permissões por módulo.
