

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const pool = require('./database');

// Importação das rotas
const usuarioRoutes = require('./routes/usuarioRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const loteRoutes = require('./routes/loteRoutes');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Configurações gerais
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
if (isProduction) {
    app.set('trust proxy', 1);
}

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

// Verifica se a chave de sessão está configurada
if (!process.env.SESSION_SECRET) {
    throw new Error('Configure SESSION_SECRET no arquivo .env');
}

// Configuração das sessões
app.use(session({
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

// Página de login
app.get('/login', (req, res) => {
    res.render('auth/login');
});

// Rotas do painel protegido
app.use(dashboardRoutes);
app.use(loteRoutes);

// Rotas de autenticação: login e logout
app.use(authRoutes);

// Rotas de gerenciamento de usuários
app.use(usuarioRoutes);

// Página inicial redireciona para o login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Rota para verificar a conexão com o PostgreSQL
app.get('/teste-banco', async (req, res) => {
    try {
        const resultado = await pool.query(
            'SELECT current_database() AS banco'
        );

        res.json({
            sucesso: true,
            mensagem: 'CrioBlood conectado ao PostgreSQL!',
            banco: resultado.rows[0].banco
        });
    } catch (erro) {
        console.error('Erro na conexão:', erro.message);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao conectar ao banco de dados.'
        });
    }
});

// Tratamento de rotas inexistentes
app.use((req, res) => {
    res.status(404).send('Página não encontrada.');
});

// Inicialização do servidor
app.listen(PORT, () => {
    console.log(`CrioBlood disponível em http://localhost:${PORT}`);
});


// Importe o arquivo de rotas
const hemocomponenteRoutes = require('./routes/hemocomponenteRoutes');

// Registre no Express
app.use('/hemocomponentes', hemocomponenteRoutes);
require('dotenv').config();


// Adicione isso junto às suas importações no topo do app.js
const iniciarRotinaValidade = require('./scripts/cronValidade');

// Adicione isso antes de iniciar o servidor (app.listen)
iniciarRotinaValidade();
