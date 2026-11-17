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
2. Execute, **nesta ordem**, os scripts de `database/` (`01_...sql` até `08_...sql`).
3. `cp .env.example .env` e preencha os valores.
4. `npm install`
5. `node src/scripts/criar-supervisor.js` (cria o administrador)
6. `npm run dev` (ou `npm start`) e acesse `http://localhost:<PORT>`.

Verificação de saúde: `GET /saude`.

## Testes

```bash
npm test
```

Cobrem as regras de compatibilidade ABO/Rh, a proteção dos status das bolsas, as regras de senha e o
controle de permissões.

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
- Cookie de sessão `httpOnly`, `sameSite=lax` e `secure` em produção. Atrás de proxy HTTPS use `NODE_ENV=production`.
- Ações importantes são registradas na tabela `logs_auditoria`.
- Nunca versione o `.env`; o `.dockerignore` impede que ele entre na imagem.

### Atualizar a senha do Supervisor (pela linha de comando)

1. Altere `SUPERVISOR_PASSWORD` no `.env`.
2. `node src/scripts/criar-supervisor.js --atualizar-senha`

## Organização do código

```
database/        scripts SQL numerados (rodam na ordem)
src/routes/      URLs e permissões exigidas
src/controllers/ recebem a requisição e escolhem a tela
src/services/    regras de negócio e acesso ao banco
src/middlewares/ login, permissões e validações
src/views/       telas EJS (partials/inicio e fim formam o layout)
public/          CSS e JavaScript do navegador
```

## Limitações conhecidas / próximos passos

- A sessão fica na memória do servidor: reiniciar o app desloga todos. Em produção, usar um *session store*
  (ex.: `connect-pg-simple`).
- Não há tokens CSRF (a proteção hoje é o `sameSite=lax` do cookie).
- Listagens sem paginação; indicadas para o volume de um hemocentro pequeno.
- Cada solicitação pede uma única bolsa (para várias, crie várias solicitações).
- Redefinir a senha de alguém não encerra as sessões já abertas dessa pessoa (desativar a conta encerra).

## Status

Funcional: fluxo completo de ponta a ponta, relatórios, auditoria e permissões por módulo.
