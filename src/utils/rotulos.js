// Rótulos e etiquetas de status usados nas telas (retornam HTML seguro, só com textos internos)
const TIPOS = {
    CH: 'Concentrado de hemácias',
    PLASMA: 'Plasma',
    PLAQUETAS: 'Plaquetas',
    CRIO: 'Crioprecipitado'
};

const STATUS_BOLSA = {
    EM_CONFERENCIA: ['Em conferência', 's-amarelo'],
    DISPONIVEL: ['Disponível', 's-verde'],
    RESERVADA: ['Reservada', 's-azul'],
    TRANSFUNDIDA: ['Transfundida', 's-cinza'],
    DESCARTADA: ['Descartada', 's-vermelho'],
    VENCIDA: ['Vencida', 's-vermelho']
};

const STATUS_SOLICITACAO = {
    PENDENTE: ['Pendente', 's-amarelo'],
    RESERVADA: ['Bolsa reservada', 's-azul'],
    ATENDIDA: ['Atendida', 's-verde'],
    CANCELADA: ['Cancelada', 's-cinza']
};

const URGENCIAS = {
    ROTINA: ['Rotina', 's-cinza'],
    URGENTE: ['Urgente', 's-amarelo'],
    EMERGENCIA: ['Emergência', 's-vermelho']
};

function escapar(valor) {
    return String(valor)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function etiqueta(par, padrao) {
    const [texto, classe] = par || [padrao, 's-cinza'];
    return `<span class="status ${classe}">${escapar(texto)}</span>`;
}

module.exports = {
    tipo: chave => TIPOS[chave] || chave,
    tipagem: (abo, rh) => (abo ? abo + (rh || '') : '—'),
    statusBolsa: chave => etiqueta(STATUS_BOLSA[chave], chave),
    statusSolicitacao: chave => etiqueta(STATUS_SOLICITACAO[chave], chave),
    urgencia: chave => etiqueta(URGENCIAS[chave], chave),
    validade(dias) {
        const n = Number(dias);
        if (n < 0) return etiqueta(['Vencida', 's-vermelho']);
        if (n === 0) return etiqueta(['Vence hoje', 's-vermelho']);
        if (n <= 7) return etiqueta([`${n} dia(s)`, 's-amarelo']);
        return etiqueta([`${n} dias`, 's-verde']);
    },
    // Texto do local físico da bolsa: "Freezer 1 · gav. 2 · cx. 3 · A1"
    local(b) {
        if (!b || !b.equipamento) return '—';
        const partes = [b.equipamento];
        if (b.gaveta) partes.push('gav. ' + b.gaveta);
        if (b.caixa) partes.push('cx. ' + b.caixa);
        if (b.posicao_exata) partes.push(b.posicao_exata);
        return partes.join(' · ');
    },
    nomeStatusBolsa: chave => (STATUS_BOLSA[chave] || [chave])[0]
};
