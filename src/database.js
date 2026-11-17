
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'crioblood',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    // CURRENT_DATE passa a ser a data de Brasília (e não a UTC). Sem isso, a validade
    // das bolsas "virava" às 21h do último dia de validade.
    options: '-c timezone=America/Sao_Paulo'
});

module.exports = pool;
