require('dotenv').config();

const pool = require('../config/database');

async function corrigirPermissoes() {
    try {
        const resultado = await pool.query(`
            UPDATE permissoes
            SET descricao = CASE codigo
                WHEN 'usuarios.visualizar' THEN 'Visualizar usuários'
                WHEN 'usuarios.cadastrar' THEN 'Cadastrar usuários'
                WHEN 'usuarios.editar' THEN 'Editar usuários'
                WHEN 'usuarios.desativar' THEN 'Desativar usuários'
                WHEN 'usuarios.permissoes' THEN 'Gerenciar permissões'
                ELSE descricao
            END
            WHERE codigo IN (
                'usuarios.visualizar',
                'usuarios.cadastrar',
                'usuarios.editar',
                'usuarios.desativar',
                'usuarios.permissoes'
            )
        `);

        console.log('Permissões atualizadas:', resultado.rowCount);

        const consulta = await pool.query(
            'SELECT codigo, descricao FROM permissoes ORDER BY id'
        );

        console.table(consulta.rows);
    } catch (erro) {
        console.error('Erro ao corrigir permissões:', erro.message);
    } finally {
        await pool.end();
    }
}

corrigirPermissoes();