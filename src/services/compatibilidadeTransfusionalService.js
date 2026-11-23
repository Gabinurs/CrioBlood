'use strict';

// Matriz de unidades doadoras por grupo ABO do receptor.
// Fonte normativa: Portaria GM/MS 11.685/2026, art. 185.
// Em produtos plasmáticos, a regra considera os anticorpos do plasma do doador.
const DOADORES_HEMACIAS = Object.freeze({
    O: ['O'],
    A: ['A', 'O'],
    B: ['B', 'O'],
    AB: ['A', 'B', 'AB', 'O']
});

const DOADORES_PLASMA = Object.freeze({
    O: ['O', 'A', 'B', 'AB'],
    A: ['A', 'AB'],
    B: ['B', 'AB'],
    AB: ['AB']
});

function resultado(permitido, status, mensagem, extras = {}) {
    return { permitido, status, mensagem, ...extras };
}

function avaliarComponente({ paciente, bolsa, tipo, pesoReceptorKg = null }) {
    const aboPaciente = String(paciente.abo || '').toUpperCase();
    const rhPaciente = String(paciente.fator_rh || '');
    const aboBolsa = String(bolsa.abo || '').toUpperCase();
    const rhBolsa = String(bolsa.fator_rh || '');
    const idade = Number(paciente.idade);
    const sexo = String(paciente.sexo || '').toUpperCase();

    if (!['O', 'A', 'B', 'AB'].includes(aboPaciente) ||
        !['+', '-'].includes(rhPaciente) ||
        !['O', 'A', 'B', 'AB'].includes(aboBolsa) ||
        !['+', '-'].includes(rhBolsa)) {
        return resultado(false, 'TIPAGEM_PENDENTE', 'A tipagem ABO/Rh do receptor ou da bolsa está ausente ou inválida.');
    }

    if (tipo === 'CH') {
        if (!DOADORES_HEMACIAS[aboPaciente].includes(aboBolsa)) {
            return resultado(false, 'INCOMPATIVEL', 'ABO incompatível para concentrado de hemácias. Não é permitido vincular esta bolsa.');
        }

        if (rhPaciente === '-' && rhBolsa === '+') {
            const excecaoOPositivo = aboPaciente === 'O' && aboBolsa === 'O' &&
                sexo === 'M' && Number.isFinite(idade) && idade > 60;

            if (excecaoOPositivo) {
                return resultado(
                    false,
                    'EXCECAO_RHD_HOMEM_MAIS_60',
                    'Exceção RhD identificada: receptor masculino com mais de 60 anos, O negativo, e bolsa O positivo. A bolsa só poderá ser vinculada com autorização médica/hemoterápica documentada e confirmação de ausência de sensibilização prévia anti-D.',
                    { excecaoPossivel: true, tipoVerificacao: 'PROVA_CRUZADA' }
                );
            }

            return resultado(false, 'INCOMPATIVEL_RHD', 'Receptor RhD negativo deve receber hemácias RhD negativas. Bolsa RhD positiva bloqueada; exceções exigem justificativa formal, ausência de sensibilização prévia e protocolo institucional.');
        }

        return resultado(true, aboPaciente === aboBolsa && rhPaciente === rhBolsa ? 'ISOGRUPO' : 'COMPATIVEL', 'ABO/RhD compatível para concentrado de hemácias. A prova cruzada laboratorial continua obrigatória.', { tipoVerificacao: 'PROVA_CRUZADA' });
    }

    if (tipo === 'PLASMA') {
        if (!DOADORES_PLASMA[aboPaciente].includes(aboBolsa)) {
            return resultado(false, 'INCOMPATIVEL_ABO', 'Plasma ABO incompatível com as hemácias do receptor. A bolsa não pode ser vinculada.');
        }
        return resultado(true, aboPaciente === aboBolsa ? 'ISOGRUPO' : 'COMPATIVEL', 'Compatibilidade ABO do plasma confirmada pela regra de anticorpos do doador. RhD não é critério para plasma.', { tipoVerificacao: 'CONFERENCIA_COMPATIBILIDADE' });
    }

    if (tipo === 'PLAQUETAS') {
        if (!DOADORES_PLASMA[aboPaciente].includes(aboBolsa)) {
            return resultado(false, 'INCOMPATIVEL_ABO', 'O plasma desta unidade de plaquetas não é ABO compatível com as hemácias do receptor. A inclusão está bloqueada; exceções exigem avaliação de volume plasmático, títulos anti-A/anti-B, peso e protocolo do serviço.');
        }

        if (rhPaciente === '-' && rhBolsa === '+' && sexo === 'F' && Number.isFinite(idade) && idade < 50) {
            return resultado(false, 'AVALIACAO_RHD_PLAQUETAS', 'Receptora RhD negativa com menos de 50 anos: priorize plaquetas RhD negativas. Plaquetas RhD positivas exigem pesquisa de anticorpos e avaliação da profilaxia anti-D conforme protocolo institucional.');
        }

        return resultado(true, aboPaciente === aboBolsa ? 'ISOGRUPO' : 'COMPATIVEL', 'Plasma da unidade ABO compatível com as hemácias do receptor. Confira o cuidado RhD aplicável ao perfil da pessoa.', { tipoVerificacao: 'CONFERENCIA_COMPATIBILIDADE' });
    }

    if (tipo === 'CRIO') {
        const precisaABO = (Number.isFinite(idade) && idade <= 10) ||
            (pesoReceptorKg !== null && Number.isFinite(Number(pesoReceptorKg)) && Number(pesoReceptorKg) <= 35);

        if (Number.isFinite(idade) && idade > 10 &&
            (pesoReceptorKg === null || pesoReceptorKg === undefined || pesoReceptorKg === '')) {
            return resultado(false, 'PESO_NECESSARIO', 'Informe o peso atual do receptor para avaliar crioprecipitado em pacientes acima de 10 anos; a regra ABO especial também se aplica a pessoas com até 35 kg.');
        }

        if (precisaABO && !DOADORES_PLASMA[aboPaciente].includes(aboBolsa)) {
            return resultado(false, 'INCOMPATIVEL_ABO', 'Para criança até 10 anos ou receptor com até 35 kg, o crioprecipitado deve ser isogrupo ou ABO compatível. Bolsa bloqueada.');
        }

        return resultado(true, precisaABO && aboPaciente === aboBolsa ? 'ISOGRUPO' : 'COMPATIVEL', precisaABO
            ? 'Crioprecipitado ABO compatível para o perfil pediátrico/baixo peso. RhD não é critério.'
            : 'Para este perfil adulto e acima de 35 kg, o crioprecipitado não exige compatibilidade ABO/Rh nem prova de compatibilidade. Confirme indicação e identificação conforme protocolo.', { tipoVerificacao: 'CONFERENCIA_COMPATIBILIDADE' });
    }

    return resultado(false, 'TIPO_INVALIDO', 'Tipo de hemocomponente não reconhecido pelo avaliador transfusional.');
}

module.exports = { avaliarComponente, DOADORES_HEMACIAS, DOADORES_PLASMA };
