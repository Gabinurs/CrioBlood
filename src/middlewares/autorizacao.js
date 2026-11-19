const { enviarErro } = require('../utils/erros');
const STATUS = require('../utils/status');

// Middleware para restringir rotas críticas apenas a Supervisores (administradores)
const apenasSupervisor = (req, res, next) => {
    const usuario = req.session.usuario;

    // A sessão guarda o campo "administrador" (definido no login e conferido a cada requisição)
    if (usuario && usuario.administrador) {
        return next();
    }

    return enviarErro(req, res, STATUS.PROIBIDO,
        'Sua credencial atual não possui privilégios para executar esta ação. Nível exigido: Supervisor.');
};

module.exports = { apenasSupervisor };
