
require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');
const { carregarPermissoes, exigirAutenticacao, exigirPermissao } = require('./middlewares/autenticacao');
const RequisicaoController = require('./controllers/requisicaoController');
const { protegerCsrf } = require('./middlewares/csrf');
const { rotaNaoEncontrada, tratarErros } = require('./middlewares/erros');
const { paraViews } = require('./utils/padroes');

// Importação das rotas
const usuarioRoutes = require('./routes/usuarioRoutes');
const contaRoutes = require('./routes/contaRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const loteRoutes = require('./routes/loteRoutes');
const hemocomponenteRoutes = require('./routes/hemocomponenteRoutes');
const modulosRoutes = require('./routes/modulosRoutes');
const iniciarRotinaValidade = require('./scripts/cronValidade');

const STATUS = require('./utils/status');
const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// O Codespaces e a produção recebem tráfego através de proxy reverso.
// Confie somente no número configurado de saltos (nunca use trust proxy = true).
const trustProxyConfig = String(process.env.TRUST_PROXY_HOPS || '').trim();
let trustProxyHops = false;
if (trustProxyConfig) {
    const parsedHops = Number(trustProxyConfig);
    if (!Number.isInteger(parsedHops) || parsedHops < 0 || parsedHops > 10) {
        throw new Error('TRUST_PROXY_HOPS deve ser um número inteiro entre 0 e 10.');
    }
    trustProxyHops = parsedHops;
} else if (isProduction || process.env.CODESPACES === 'true') {
    trustProxyHops = 1;
}

// Configurações gerais
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', trustProxyHops);

// Proteções e leitura das requisições
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Arquivos públicos: CSS, JavaScript e imagens
app.use(express.static(path.join(__dirname, '..', 'public')));

// Limite básico de requisições
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: 'draft-7',
    legacyHeaders: false
}));

// Limite mais rígido para tentativas de login (só conta as que falham)
const limitarLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(STATUS.MUITAS_REQUISICOES).render('auth/login', {
        erro: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.'
    })
});

// Verifica se a chave de sessão está configurada
if (!process.env.SESSION_SECRET) {
    throw new Error('Configure SESSION_SECRET no arquivo .env');
}

// Configuração das sessões
app.use(session({
    // Sessões guardadas no PostgreSQL: continuam válidas se o servidor reiniciar
    store: new PgSession({
        pool,
        tableName: 'session',
        createTableIfMissing: true,
        pruneSessionInterval: 60 * 15
    }),
    name: 'crioblood.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 30
    }
}));

const PADROES_VIEWS = paraViews();

// Disponibiliza o usuário logado e a mensagem de aviso (flash) para todas as telas
app.use((req, res, next) => {
    res.locals.rot = require('./utils/rotulos');
    res.locals.usuario = req.session.usuario || null;
    res.locals.flash = req.session.flash || null;
    res.locals.query = req.query;
    res.locals.rotaAtual = req.path;
    res.locals.padroes = PADROES_VIEWS; // regex, tamanhos e mensagens dos campos (pattern + máscara)
    delete req.session.flash;
    next();
});

// Atualiza as permissões do usuário logado e barra contas desativadas
app.use(carregarPermissoes);

// Exige o token CSRF em todos os formulários (POST)
app.use(protegerCsrf);

// Associação de bolsa à unidade da requisição.
// Registrada antes dos demais roteadores para garantir que o POST
// seja tratado pelo fluxo de associação e não por outra rota genérica.
app.post(
    '/solicitacoes/:id/itens/:solicitacaoId/associar-bolsa',
    exigirAutenticacao,
    exigirPermissao('solicitacoes.gerenciar'),
    (req, res, next) => {
        if (!/^\d+$/.test(req.params.id) || !/^\d+$/.test(req.params.solicitacaoId)) {
            return res.status(400).render('errors/erro', {
                status: 400,
                titulo: 'Requisição inválida',
                mensagem: 'Identificador da requisição ou da unidade inválido.'
            });
        }
        return RequisicaoController.associarBolsa(req, res, next);
    }
);

// Página de login
app.get('/login', (req, res) => {
    res.render('auth/login');
});

// Rotas do painel protegido
app.use(dashboardRoutes);
app.use(loteRoutes);

// Rotas de autenticação: login e logout
app.post('/login', limitarLogin);
app.use(authRoutes);

// Troca da própria senha
app.use(contaRoutes);

// Rotas de gerenciamento de usuários
app.use(usuarioRoutes);

// Rotas de hemocomponentes
app.use('/hemocomponentes', hemocomponenteRoutes);

// Pacientes, estoque, solicitações, compatibilidade, transfusão e relatórios
app.use(modulosRoutes);

// Página inicial redireciona para o login
app.get('/', (req, res) => {
    res.redirect(STATUS.REDIRECIONAR, '/login');
});

// Verificação de saúde (sem dados internos): usada por monitoramento/Docker
app.get('/saude', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(STATUS.OK).json({ status: 'ok' });
    } catch (erro) {
        console.error('Erro na conexão:', erro.message);
        res.status(STATUS.INDISPONIVEL).json({ status: 'erro' });
    }
});

// Rotas inexistentes (404) e erros inesperados (500): páginas de erro padronizadas
app.use(rotaNaoEncontrada);
app.use(tratarErros);

// Rotina diária que marca bolsas vencidas
iniciarRotinaValidade();

// Inicialização do servidor
app.listen(PORT, () => {
    console.log(`CrioBlood disponível em http://localhost:${PORT}`);
});
