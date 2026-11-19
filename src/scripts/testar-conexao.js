
require('dotenv').config();

const pool = require('../config/database');

async function testarConexao() {
    try {
        const resultado = await pool.query('SELECT NOW() AS horario');

        console.log('Conexão com o PostgreSQL realizada com sucesso!');
        console.log('Horário do banco:', resultado.rows[0].horario);
    } catch (erro) {
        console.error('Erro ao conectar ao banco:', erro.message);
    } finally {
        await pool.end();
    }
}

testarConexao();
