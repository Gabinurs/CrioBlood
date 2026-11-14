const test = require('node:test');
const assert = require('node:assert/strict');

const { ErroNegocio, avisar, tratar } = require('./erros');

test('avisar stores a flash message for the view middleware', () => {
    const req = { session: {} };

    avisar(req, 'ok', 'Operação concluída.');

    assert.deepEqual(req.session.flash, {
        tipo: 'ok',
        texto: 'Operação concluída.'
    });
});

test('tratar logs unexpected errors, flashes a safe message, and redirects', () => {
    const req = { session: {} };
    const res = {
        redirect(rota) {
            this.rota = rota;
            return this;
        }
    };
    const erro = new Error('database connection failed');
    const originalConsoleError = console.error;
    const logged = [];
    console.error = (...args) => logged.push(args);

    try {
        const resultado = tratar(req, res, erro, '/dashboard', 'Falha ao carregar.');

        assert.equal(resultado, res);
        assert.equal(res.rota, '/dashboard');
        assert.deepEqual(req.session.flash, {
            tipo: 'erro',
            texto: 'Falha ao carregar.'
        });
        assert.deepEqual(logged, [['Falha ao carregar.:', erro]]);
    } finally {
        console.error = originalConsoleError;
    }
});

test('tratar shows business errors without logging them as unexpected', () => {
    const req = { session: {} };
    const res = { redirect: rota => rota };

    const resultado = tratar(
        req,
        res,
        new ErroNegocio('Solicitação inválida.'),
        '/solicitacoes',
        'Falha inesperada.'
    );

    assert.equal(resultado, '/solicitacoes');
    assert.deepEqual(req.session.flash, {
        tipo: 'aviso',
        texto: 'Solicitação inválida.'
    });
});
