// Middleware para restringir rotas críticas apenas a Supervisores
const apenasSupervisor = (req, res, next) => {
    const usuario = req.session.usuario;

    // Supõe-se que no login salvamos req.session.usuario.permissao (ou .nivel)
    if (usuario && usuario.permissao === 'Supervisor') {
        return next(); // Passa o bastão, o usuário está liberado
    }

    // Se for operador comum, devolvemos uma tela de erro no padrão visual do sistema
    return res.status(403).send(`
        <div style="font-family: 'Share Tech Mono', monospace; max-width: 600px; margin: 40px auto; padding: 30px; background-color: #090a0c; color: #ff2a2a; border: 1px solid #ff2a2a; box-shadow: 0 0 15px rgba(255, 42, 42, 0.2);">
            <h2 style="margin-top: 0; text-transform: uppercase;">Acesso Negado (403)</h2>
            <p>Sua credencial atual não possui privilégios para executar esta ação irreversível.</p>
            <p><strong>Nível exigido:</strong> SUPERVISOR</p>
            <button onclick="history.back()" style="margin-top: 20px; padding: 10px 15px; background-color: #ff2a2a; color: #090a0c; border: none; font-weight: bold; cursor: pointer; text-transform: uppercase;">
                &larr; Retornar
            </button>
        </div>
    `);
};

module.exports = { apenasSupervisor };
