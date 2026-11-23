// Regras puras de autorização e janelas de tempo do ciclo de vida (RN25–RN29).
const {
  STATUS,
  verificarConfirmacao,
  verificarCancelamento,
  verificarRemarcacao,
  verificarRealizacao,
  verificarFalta,
} = require('../../src/domain/consultas');

const AGORA = new Date(2026, 9, 19, 8, 0);
const pacienteDono = { perfil: 'PACIENTE', ehDono: true };
const pacienteOutro = { perfil: 'PACIENTE', ehDono: false };
const medicoDono = { perfil: 'MEDICO', ehDono: true };
const medicoOutro = { perfil: 'MEDICO', ehDono: false };
const recepcao = { perfil: 'RECEPCAO', ehDono: false };

function consulta({ status = STATUS.AGENDADA, inicio = new Date(2026, 9, 19, 10, 0), remarcacoes = 0 } = {}) {
  return { status, inicio, remarcacoes };
}

describe('verificarConfirmacao', () => {
  /**
   * @caso CT-UNI-185
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Permitir confirmação pelo paciente dono dentro de 48 horas
   * @resultadoEsperado verificarConfirmacao devolve null
   */
  test('paciente confirma dentro da janela', () => {
    expect(verificarConfirmacao(consulta(), pacienteDono, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-186
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Aceitar confirmação exatamente 48 horas antes
   * @resultadoEsperado verificarConfirmacao devolve null no limite
   */
  test('aceita exatamente 48 horas antes', () => {
    expect(verificarConfirmacao(consulta({ inicio: new Date(2026, 9, 21, 8, 0) }), pacienteDono, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-187
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Recusar confirmação 48 horas e 1 minuto antes
   * @resultadoEsperado verificarConfirmacao devolve erro de REGRA citando 48 horas
   */
  test('recusa 48 horas e 1 minuto antes', () => {
    const r = verificarConfirmacao(consulta({ inicio: new Date(2026, 9, 21, 8, 1) }), pacienteDono, AGORA);
    expect(r.tipo).toBe('REGRA');
    expect(r.mensagem).toContain('48 horas');
  });

  /**
   * @caso CT-UNI-188
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Recusar confirmação depois de a consulta ter começado
   * @resultadoEsperado verificarConfirmacao devolve erro citando que já começou
   */
  test('recusa confirmação após o início', () => {
    const r = verificarConfirmacao(consulta({ inicio: new Date(2026, 9, 19, 7, 30) }), pacienteDono, AGORA);
    expect(r.mensagem).toBe('A consulta já começou.');
  });

  /**
   * @caso CT-UNI-189
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Recusar confirmação de consulta já confirmada
   * @resultadoEsperado verificarConfirmacao devolve erro de status
   */
  test('recusa confirmação de consulta já confirmada', () => {
    const r = verificarConfirmacao(consulta({ status: STATUS.CONFIRMADA }), pacienteDono, AGORA);
    expect(r.mensagem).toBe('Somente consultas agendadas podem ser confirmadas.');
  });

  /**
   * @caso CT-UNI-190
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN25, RN30
   * @objetivo Impedir que o médico confirme a consulta
   * @resultadoEsperado verificarConfirmacao devolve erro de PERMISSAO
   */
  test('médico não pode confirmar', () => {
    const r = verificarConfirmacao(consulta(), medicoDono, AGORA);
    expect(r.tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-191
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN25, RN30
   * @objetivo Impedir que outro paciente confirme a consulta
   * @resultadoEsperado verificarConfirmacao devolve erro de PERMISSAO
   */
  test('paciente que não é o dono não pode confirmar', () => {
    const r = verificarConfirmacao(consulta(), pacienteOutro, AGORA);
    expect(r.tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-192
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Permitir que a recepção confirme a consulta
   * @resultadoEsperado verificarConfirmacao devolve null
   */
  test('recepção pode confirmar', () => {
    expect(verificarConfirmacao(consulta(), recepcao, AGORA)).toBeNull();
  });
});

describe('verificarCancelamento', () => {
  /**
   * @caso CT-UNI-193
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Permitir cancelamento pelo paciente exatamente 24 horas antes
   * @resultadoEsperado verificarCancelamento devolve null
   */
  test('paciente cancela no limite de 24 horas', () => {
    expect(verificarCancelamento(consulta({ inicio: new Date(2026, 9, 20, 8, 0) }), pacienteDono, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-194
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Recusar cancelamento pelo paciente 23 horas e 59 minutos antes
   * @resultadoEsperado verificarCancelamento devolve erro citando 24 horas
   */
  test('paciente não cancela com menos de 24 horas', () => {
    const r = verificarCancelamento(consulta({ inicio: new Date(2026, 9, 20, 7, 59) }), pacienteDono, AGORA);
    expect(r.mensagem).toContain('24 horas');
  });

  /**
   * @caso CT-UNI-195
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Permitir cancelamento pela recepção até o início, com motivo
   * @resultadoEsperado verificarCancelamento devolve null
   */
  test('recepção cancela com motivo até o início', () => {
    expect(verificarCancelamento(consulta({ inicio: new Date(2026, 9, 19, 8, 1) }), recepcao, AGORA, 'Médico de urgência')).toBeNull();
  });

  /**
   * @caso CT-UNI-196
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN26, RNF06
   * @objetivo Exigir motivo quando a recepção cancela
   * @resultadoEsperado verificarCancelamento devolve "Informe o motivo do cancelamento."
   */
  test('recepção precisa informar motivo', () => {
    const r = verificarCancelamento(consulta(), recepcao, AGORA, '   ');
    expect(r.mensagem).toBe('Informe o motivo do cancelamento.');
  });

  /**
   * @caso CT-UNI-197
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Permitir cancelamento pelo médico dono com motivo
   * @resultadoEsperado verificarCancelamento devolve null
   */
  test('médico dono cancela com motivo', () => {
    expect(verificarCancelamento(consulta(), medicoDono, AGORA, 'Cirurgia de emergência')).toBeNull();
  });

  /**
   * @caso CT-UNI-198
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN26, RN30
   * @objetivo Impedir cancelamento por médico de outra agenda
   * @resultadoEsperado verificarCancelamento devolve erro de PERMISSAO
   */
  test('médico de outra agenda não cancela', () => {
    const r = verificarCancelamento(consulta(), medicoOutro, AGORA, 'Motivo');
    expect(r.tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-199
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Recusar cancelamento após o início
   * @resultadoEsperado verificarCancelamento devolve erro citando que já começou
   */
  test('não cancela consulta já iniciada', () => {
    const r = verificarCancelamento(consulta({ inicio: new Date(2026, 9, 19, 7, 0) }), recepcao, AGORA, 'Motivo');
    expect(r.mensagem).toContain('já começou');
  });

  /**
   * @caso CT-UNI-200
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Recusar cancelamento de consulta já realizada
   * @resultadoEsperado verificarCancelamento devolve erro de estado final
   */
  test('não cancela consulta realizada', () => {
    const r = verificarCancelamento(consulta({ status: STATUS.REALIZADA }), recepcao, AGORA, 'Motivo');
    expect(r.mensagem).toBe('Esta consulta não pode mais ser cancelada.');
  });

  /**
   * @caso CT-UNI-201
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Permitir cancelar consulta confirmada
   * @resultadoEsperado verificarCancelamento devolve null para status CONFIRMADA
   */
  test('cancela consulta confirmada', () => {
    expect(verificarCancelamento(consulta({ status: STATUS.CONFIRMADA }), pacienteDono, AGORA)).toBeNull();
  });
});

describe('verificarRemarcacao', () => {
  /**
   * @caso CT-UNI-202
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Permitir remarcação exatamente 24 horas antes
   * @resultadoEsperado verificarRemarcacao devolve null
   */
  test('permite remarcação no limite de 24 horas', () => {
    expect(verificarRemarcacao(consulta({ inicio: new Date(2026, 9, 20, 8, 0) }), pacienteDono, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-203
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Recusar remarcação com menos de 24 horas
   * @resultadoEsperado verificarRemarcacao devolve erro citando 24 horas
   */
  test('recusa remarcação com menos de 24 horas', () => {
    const r = verificarRemarcacao(consulta({ inicio: new Date(2026, 9, 20, 7, 59) }), pacienteDono, AGORA);
    expect(r.mensagem).toContain('24 horas');
  });

  /**
   * @caso CT-UNI-204
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Recusar a terceira remarcação
   * @resultadoEsperado verificarRemarcacao devolve erro de limite de 2 remarcações
   */
  test('recusa terceira remarcação', () => {
    const r = verificarRemarcacao(consulta({ remarcacoes: 2 }), pacienteDono, AGORA);
    expect(r.mensagem).toBe('Esta consulta já atingiu o limite de 2 remarcações.');
  });

  /**
   * @caso CT-UNI-205
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Permitir a segunda remarcação
   * @resultadoEsperado verificarRemarcacao devolve null com 1 remarcação anterior
   */
  test('permite segunda remarcação', () => {
    expect(verificarRemarcacao(consulta({ remarcacoes: 1 }), pacienteDono, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-206
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Recusar remarcação de consulta cancelada
   * @resultadoEsperado verificarRemarcacao devolve erro de status
   */
  test('recusa remarcação de consulta cancelada', () => {
    const r = verificarRemarcacao(consulta({ status: STATUS.CANCELADA }), pacienteDono, AGORA);
    expect(r.mensagem).toBe('Somente consultas agendadas ou confirmadas podem ser remarcadas.');
  });

  /**
   * @caso CT-UNI-207
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN27, RN30
   * @objetivo Impedir remarcação pelo médico
   * @resultadoEsperado verificarRemarcacao devolve erro de PERMISSAO
   */
  test('médico não remarca consulta', () => {
    expect(verificarRemarcacao(consulta(), medicoDono, AGORA).tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-208
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN27, RN30
   * @objetivo Impedir remarcação por outro paciente
   * @resultadoEsperado verificarRemarcacao devolve erro de PERMISSAO
   */
  test('outro paciente não remarca', () => {
    expect(verificarRemarcacao(consulta(), pacienteOutro, AGORA).tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-209
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Permitir que a recepção remarque qualquer consulta ativa
   * @resultadoEsperado verificarRemarcacao devolve null
   */
  test('recepção remarca', () => {
    expect(verificarRemarcacao(consulta({ status: STATUS.CONFIRMADA }), recepcao, AGORA)).toBeNull();
  });
});

describe('verificarRealizacao', () => {
  /**
   * @caso CT-UNI-210
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN28
   * @objetivo Permitir atendimento pelo médico dono no horário de início
   * @resultadoEsperado verificarRealizacao devolve null
   */
  test('médico registra atendimento no início', () => {
    expect(verificarRealizacao(consulta({ inicio: AGORA }), medicoDono, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-211
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN28
   * @objetivo Recusar atendimento antes do horário
   * @resultadoEsperado verificarRealizacao devolve erro citando o horário da consulta
   */
  test('não registra atendimento antes do horário', () => {
    const r = verificarRealizacao(consulta({ inicio: new Date(2026, 9, 19, 8, 1) }), medicoDono, AGORA);
    expect(r.mensagem).toBe('O atendimento só pode ser registrado a partir do horário da consulta.');
  });

  /**
   * @caso CT-UNI-212
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN28, RN30
   * @objetivo Impedir que a recepção registre o atendimento
   * @resultadoEsperado verificarRealizacao devolve erro de PERMISSAO
   */
  test('recepção não registra atendimento', () => {
    expect(verificarRealizacao(consulta({ inicio: AGORA }), recepcao, AGORA).tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-213
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN28, RN30
   * @objetivo Impedir que outro médico registre o atendimento
   * @resultadoEsperado verificarRealizacao devolve erro de PERMISSAO
   */
  test('médico de outra agenda não registra atendimento', () => {
    expect(verificarRealizacao(consulta({ inicio: AGORA }), medicoOutro, AGORA).tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-214
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN28, RN25
   * @objetivo Recusar atendimento de consulta já realizada
   * @resultadoEsperado verificarRealizacao devolve erro de transição
   */
  test('não registra atendimento de consulta realizada', () => {
    const r = verificarRealizacao(consulta({ status: STATUS.REALIZADA, inicio: AGORA }), medicoDono, AGORA);
    expect(r.mensagem).toBe('Esta consulta não pode ser marcada como realizada.');
  });
});

describe('verificarFalta', () => {
  /**
   * @caso CT-UNI-215
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Permitir falta exatamente 15 minutos após o início
   * @resultadoEsperado verificarFalta devolve null
   */
  test('médico registra falta após a tolerância', () => {
    expect(verificarFalta(consulta({ inicio: new Date(2026, 9, 19, 7, 45) }), medicoDono, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-216
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Recusar falta 14 minutos após o início
   * @resultadoEsperado verificarFalta devolve erro citando 15 minutos
   */
  test('não registra falta antes de 15 minutos', () => {
    const r = verificarFalta(consulta({ inicio: new Date(2026, 9, 19, 7, 46) }), medicoDono, AGORA);
    expect(r.mensagem).toBe('A falta só pode ser registrada 15 minutos após o início da consulta.');
  });

  /**
   * @caso CT-UNI-217
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Permitir que a recepção registre a falta
   * @resultadoEsperado verificarFalta devolve null
   */
  test('recepção registra falta', () => {
    expect(verificarFalta(consulta({ inicio: new Date(2026, 9, 19, 7, 0) }), recepcao, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-218
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN29, RN30
   * @objetivo Impedir que o paciente registre a própria falta
   * @resultadoEsperado verificarFalta devolve erro de PERMISSAO
   */
  test('paciente não registra falta', () => {
    expect(verificarFalta(consulta({ inicio: new Date(2026, 9, 19, 7, 0) }), pacienteDono, AGORA).tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-219
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN29, RN30
   * @objetivo Impedir falta por médico de outra agenda
   * @resultadoEsperado verificarFalta devolve erro de PERMISSAO
   */
  test('médico de outra agenda não registra falta', () => {
    expect(verificarFalta(consulta({ inicio: new Date(2026, 9, 19, 7, 0) }), medicoOutro, AGORA).tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-220
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Recusar falta em consulta já realizada
   * @resultadoEsperado verificarFalta devolve erro de transição
   */
  test('não registra falta de consulta realizada', () => {
    const r = verificarFalta(consulta({ status: STATUS.REALIZADA, inicio: new Date(2026, 9, 19, 7, 0) }), recepcao, AGORA);
    expect(r.mensagem).toBe('Esta consulta não pode ser marcada como falta.');
  });
});
