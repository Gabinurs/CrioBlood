const crypto = require('crypto');

const METODOS_SEGUROS = ['GET', 'HEAD', 'OPTIONS'];

function tokensIguais(enviado, esperado) {
    if (typeof enviado !== 'string' || typeof esperado !== 'string') return false;

    const a = Buffer.from(enviado);
    const b = Buffer.from(esperado);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Proteção contra CSRF (formulário forjado em outro site):
// cada sessão tem um token secreto, colocado em todos os formulários (campo "_csrf"),
// e todo POST precisa devolver esse token.
function protegerCsrf(req, res, next) {
    const logado = Boolean(req.session.usuario);
    const ehLogin = req.path === '/login';

    // Só cria sessão para quem está logado ou abrindo o login (evita sessão por visita de robô).
    if (logado || ehLogin) {
        if (!req.session.csrfToken) {
            req.session.csrfToken = crypto.randomBytes(32).toString('hex');
        }
        res.locals.csrfToken = req.session.csrfToken;
    }

    if (METODOS_SEGUROS.includes(req.method)) return next();

    // Sem sessão e fora do login não há nada a proteger (as rotas já exigem autenticação).
    if (!logado && !ehLogin) return next();

    const enviado = (req.body && req.body._csrf) || req.get('x-csrf-token');
    if (tokensIguais(enviado, req.session.csrfToken)) return next();

    return res.status(403).render('erro/403', {
        mensagem: 'Formulário inválido ou sessão expirada. Volte à página anterior, recarregue e tente de novo.'
    });
}

module.exports = { protegerCsrf, tokensIguais };
