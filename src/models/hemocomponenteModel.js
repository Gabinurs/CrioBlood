const db = require('../config/database');
const { ErroValidacao, ErroConflito } = require('../utils/erros');
const { PADROES, LIMITE_TEXTO_LIVRE, textoLivreValido, normalizarEspacos } = require('../utils/padroes');
const { sqlLimite } = require('../utils/paginacao');

// Colunas de data já formatadas (evita problemas de fuso horário nas telas)
const COLUNAS_DATAS = `
    to_char(h.data_coleta, 'DD/MM/YYYY')   AS data_coleta_br,
    to_char(h.data_validade, 'DD/MM/YYYY') AS data_validade_br,
    to_char(h.data_coleta, 'YYYY-MM-DD')   AS data_coleta_iso,
    to_char(h.data_validade, 'YYYY-MM-DD') AS data_validade_iso
`;

// Status que só mudam pelos fluxos próprios (reserva, transfusão, descarte e validade).
const STATUS_FINAIS = ['RESERVADA', 'TRANSFUNDIDA', 'DESCARTADA', 'VENCIDA'];
// Únicos status que a tela de edição pode escolher.
const STATUS_EDITAVEIS = ['EM_CONFERENCIA', 'DISPONIVEL'];

// Decide qual status vale numa edição: bolsa em status final nunca "volta" pela tela
// de edição, e a tela nunca coloca a bolsa em descartada, vencida, reservada ou transfundida.
function resolverStatusEdicao(statusAtual, statusSolicitado) {
    if (STATUS_FINAIS.includes(statusAtual)) return statusAtual;
    if (!STATUS_EDITAVEIS.includes(statusSolicitado)) return statusAtual;
    return statusSolicitado;
}

// Traduz erros do PostgreSQL em erros com mensagem e status HTTP adequados
function traduzirErroBanco(erro) {
    if (erro.code === '23505') return new ErroConflito('Já existe uma bolsa cadastrada com esse código original.');
    if (erro.code === '23503') return new ErroValidacao('O lote informado não existe. Confira o lote selecionado.');
    if (erro.code === '23514') {
        return new ErroValidacao(
            'Para marcar a bolsa como DISPONÍVEL é preciso confirmar a inspeção visual, ' +
            'a integridade e a tipagem, e informar ABO e Rh. A validade também não pode ' +
            'ser anterior à coleta.');
    }
    return erro;
}

class HemocomponenteModel {
    static resolverStatusEdicao = resolverStatusEdicao;
    static STATUS_FINAIS = STATUS_FINAIS;

    // Lotes que ainda aceitam bolsas (para o formulário de cadastro)
    static async listarLotesAbertos() {
        const { rows } = await db.query(`
            SELECT id, codigo,
                   to_char(data_recebimento AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') AS data_br
            FROM lotes_recebimento
            WHERE status = 'ABERTO'
            ORDER BY id DESC
        `);
        return rows;
    }

    // Lista os hemocomponentes, com filtro opcional por lote ou status
    static async listarTodos(filtros = {}, pag = {}) {
        let query = `
            SELECT h.*, l.codigo AS codigo_lote, ${COLUNAS_DATAS}
            FROM hemocomponentes h
            LEFT JOIN lotes_recebimento l ON h.lote_id = l.id
            WHERE 1=1
        `;
        const params = [];

        if (filtros.lote_id) {
            params.push(filtros.lote_id);
            query += ` AND h.lote_id = $${params.length}`;
        }

        if (filtros.status) {
            params.push(filtros.status);
            query += ` AND h.status = $${params.length}`;
        }

        query += ` ORDER BY h.data_validade ASC, h.id DESC ${sqlLimite(pag)}`;

        const { rows } = await db.query(query, params);
        return rows;
    }

    static async contarTodos(filtros = {}) {
        let query = 'SELECT COUNT(*)::int AS total FROM hemocomponentes h WHERE 1=1';
        const params = [];

        if (filtros.lote_id) {
            params.push(filtros.lote_id);
            query += ` AND h.lote_id = $${params.length}`;
        }

        if (filtros.status) {
            params.push(filtros.status);
            query += ` AND h.status = $${params.length}`;
        }

        const { rows } = await db.query(query, params);
        return rows[0].total;
    }

    static async buscarPorId(id) {
        const { rows } = await db.query(
            `SELECT h.*, ${COLUNAS_DATAS} FROM hemocomponentes h WHERE h.id = $1`,
            [id]
        );
        return rows[0];
    }

    static async criar(dados, usuarioId) {
        const codigo = normalizarEspacos(dados.codigo_original).toUpperCase();
        if (!PADROES.codigoBolsa.regex.test(codigo)) throw new ErroValidacao(`Código da bolsa inválido. ${PADROES.codigoBolsa.mensagem}`);
        if (!textoLivreValido((dados.observacoes || '').trim())) throw new ErroValidacao(`Observações: use até ${LIMITE_TEXTO_LIVRE} caracteres, sem caracteres de controle.`);
        const volume = Number(dados.volume_ml);
        if (!Number.isInteger(volume) || volume < 1 || volume > 5000) throw new ErroValidacao('Informe um volume válido em mL.');
        if (!['A','B','AB','O'].includes(dados.abo) || !['+','-'].includes(dados.fator_rh)) throw new ErroValidacao('Informe o grupo ABO e o fator Rh da bolsa.');
        const lote = (await db.query('SELECT status FROM lotes_recebimento WHERE id = $1', [dados.lote_id])).rows[0];
        if (!lote) throw new ErroValidacao('O lote informado não existe. Confira o lote selecionado.');
        if (lote.status !== 'ABERTO') throw new ErroConflito('Esse lote já está fechado e não recebe novas bolsas.');
        const prazos = { CH: {dias:42}, PLAQUETAS: {dias:7}, PLASMA: {anos:1}, CRIO: {anos:1} };
        const prazo = prazos[dados.tipo];
        if (!prazo) throw new ErroValidacao('Tipo de hemocomponente inválido.');
        const partes = String(dados.data_coleta || '').split('-').map(Number);
        if (partes.length !== 3 || partes.some(Number.isNaN)) throw new ErroValidacao('Informe uma data de coleta válida.');
        const data = new Date(Date.UTC(partes[0], partes[1]-1, partes[2]));
        if (data.getUTCFullYear()!==partes[0] || data.getUTCMonth()!==partes[1]-1 || data.getUTCDate()!==partes[2]) throw new ErroValidacao('A data de coleta informada não é válida.');
        if (prazo.dias) data.setUTCDate(data.getUTCDate()+prazo.dias);
        if (prazo.anos) data.setUTCFullYear(data.getUTCFullYear()+prazo.anos);
        const dataValidade = data.toISOString().slice(0,10);
        const exames = ['anti_hbc','anti_hcv','anti_hiv_1_2','anti_htlv_i_ii','chagas','hbsag','nat_hbv','nat_hcv','nat_hiv','nat_malaria','sifilis','pesquisa_hbs','pai_negativo'];
        const codigoInterno = (await db.query(
            `SELECT 'CB-' || to_char(CURRENT_DATE,'YY') || '-' || lpad(nextval('hemocomponentes_codigo_interno_seq')::text,7,'0') AS codigo`
        )).rows[0].codigo;
        const colunasExames = exames.join(', ');
        const placeholdersExames = exames.map((_,i)=>`$${16+i}`).join(', ');
        const query = `
            INSERT INTO hemocomponentes
                (lote_id,codigo_original,codigo_interno,tipo,abo,fator_rh,data_coleta,data_validade,volume_ml,
                 inspecao_visual,integridade_confirmada,tipagem_confirmada,status,observacoes,cadastrado_por,${colunasExames})
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,${placeholdersExames})
            RETURNING id,codigo_interno
        `;
        try {
            const { rows } = await db.query(query, [
                dados.lote_id,codigo,codigoInterno,dados.tipo,dados.abo,dados.fator_rh,dados.data_coleta,
                dataValidade,volume,dados.inspecao_visual==='on',dados.integridade_confirmada==='on',
                dados.tipagem_confirmada==='on',dados.status||'EM_CONFERENCIA',
                (dados.observacoes||'').trim()||null,usuarioId,...exames.map(k=>dados[k]==='on')
            ]);
            return rows[0].id;
        } catch (erro) { throw traduzirErroBanco(erro); }
    }

    static async atualizar(id, dados) {
        const atual = await HemocomponenteModel.buscarPorId(id);
        if (!atual) return false;

        const status = resolverStatusEdicao(atual.status, dados.status);

        let resultado;
        try {
            resultado = await db.query(`
            UPDATE hemocomponentes
            SET tipo = $1,
                abo = $2,
                fator_rh = $3,
                data_validade = $4,
                inspecao_visual = $5,
                integridade_confirmada = $6,
                tipagem_confirmada = $7,
                status = $8,
                observacoes = $9,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $10
        `, [
            dados.tipo,
            dados.abo || null,
            dados.fator_rh || null,
            dados.data_validade,
            dados.inspecao_visual === 'on',
            dados.integridade_confirmada === 'on',
            dados.tipagem_confirmada === 'on',
            status,
            dados.observacoes || null,
            id
        ]);
        } catch (erro) {
            throw traduzirErroBanco(erro);
        }
        return resultado.rowCount > 0;
    }

    // Descarte lógico: a bolsa continua registrada, com status DESCARTADA
    static async deletar(id) {
        const atual = await HemocomponenteModel.buscarPorId(id);
        if (!atual) return false;
        if (atual.status === 'RESERVADA') {
            throw new ErroConflito('Essa bolsa está reservada para um paciente. Cancele a solicitação antes de descartá-la.');
        }
        if (['TRANSFUNDIDA', 'DESCARTADA'].includes(atual.status)) {
            throw new ErroConflito('Essa bolsa já foi transfundida ou descartada.');
        }
        const resultado = await db.query(
            `UPDATE hemocomponentes
             SET status = 'DESCARTADA', atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [id]
        );
        await db.query('DELETE FROM armazenamento WHERE hemocomponente_id = $1', [id]);
        return resultado.rowCount > 0;
    }
}

module.exports = HemocomponenteModel;
