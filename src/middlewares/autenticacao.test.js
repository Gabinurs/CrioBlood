const test = require('node:test');
const assert = require('node:assert/strict');

const { exigirPermissao, exigirAdministrador } = require('./autenticacao');

function simular(usuario, permissoes = []) {
    const req = { session: { usuario }, permissoes: new Set(permissoes) };
    const res = {
        status(codigo) { this.codigo = codigo; return this; },
        render(view) { this.view = view; return this; },
        redirect(codigo, rota) { this.codigoRedirect = codigo; this.rota = rota; return this; }
    };
    let passou = false;
    return { req, res, next: () => { passou = true; }, passou: () => passou };
}

test('sem login, redireciona para /login', () => {
    const t = simular(null);
    exigirPermissao('pacientes.gerenciar')(t.req, t.res, t.next);
    assert.equal(t.res.rota, '/login');
    assert.equal(t.res.codigoRedirect, 302);
    assert.equal(t.passou(), false);
});

test('administrador passa em qualquer permissão', () => {
    const t = simular({ id: 1, administrador: true });
    exigirPermissao('relatorios.visualizar')(t.req, t.res, t.next);
    assert.equal(t.passou(), true);
});

test('usuário com a permissão passa; sem ela recebe 403', () => {
    const com = simular({ id: 2, administrador: false }, ['pacientes.gerenciar']);
    exigirPermissao('pacientes.gerenciar')(com.req, com.res, com.next);
    assert.equal(com.passou(), true);

    const sem = simular({ id: 3, administrador: false }, ['lotes.gerenciar']);
    exigirPermissao('pacientes.gerenciar')(sem.req, sem.res, sem.next);
    assert.equal(sem.res.codigo, 403);
    assert.equal(sem.res.view, 'erro/erro');
    assert.equal(sem.passou(), false);
});

test('área de administração barra quem não é administrador', () => {
    const t = simular({ id: 2, administrador: false });
    exigirAdministrador(t.req, t.res, t.next);
    assert.equal(t.res.codigo, 403);
    assert.equal(t.passou(), false);
});
