// Testes unitários das verificações de remarcação, atendimento realizado e falta (RN27, RN28, RN29).
const { verificarRemarcacao, verificarRealizacao, verificarFalta } = require('../../src/domain/consultas');

const AGORA = new Date(2026, 9, 19, 8, 0); // 2026-10-19 08:00 (segunda-feira)
const pacienteDono = { perfil: 'PACIENTE', ehDono: true };
const outroPaciente = { perfil: 'PACIENTE', ehDono: false };
const recepcao = { perfil: 'RECEPCAO' };
const medicoDono = { perfil: 'MEDICO', ehDono: true };
const outroMedico = { perfil: 'MEDICO', ehDono: false };
const consulta = (dia, hora, status = 'AGENDADA', remarcacoes = 0) => ({ id: 1, status, remarcacoes, inicio: new Date(2026, 9, dia, hora, 0) });

describe('verificarRemarcacao (RN27)', () => {
  /**
   * @caso CT-UNI-101
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Permitir remarcação pelo paciente com mais de 24 horas e sem remarcações anteriores
   * @resultadoEsperado verificarRemarcacao retorna null para consulta ativa em 2026-10-20 10:00
   */
  test('paciente remarca com mais de 24 horas', () => {
    expect(verificarRemarcacao(consulta(20, 10), pacienteDono, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-102
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Recusar remarcação com menos de 24 horas do início atual
   * @resultadoEsperado verificarRemarcacao retorna erro de regra para consulta no mesmo dia às 12:00
   */
  test('recusa remarcação com menos de 24 horas', () => {
    const resultado = verificarRemarcacao(consulta(19, 12), pacienteDono, AGORA);
    expect(resultado.tipo).toBe('REGRA');
    expect(resultado.mensagem).toBe('A remarcação só é permitida até 24 horas antes da consulta.');
  });

  /**
   * @caso CT-UNI-103
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Recusar a terceira remarcação da mesma consulta (limite de 2)
   * @resultadoEsperado verificarRemarcacao retorna erro de regra com remarcacoes = 2 e aceita com 1
   */
  test('aplica limite de 2 remarcações', () => {
    const comUma = verificarRemarcacao(consulta(20, 10, 'AGENDADA', 1), pacienteDono, AGORA);
    expect(comUma).toBeNull();
    const comDuas = verificarRemarcacao(consulta(20, 10, 'AGENDADA', 2), pacienteDono, AGORA);
    expect(comDuas.mensagem).toBe('Esta consulta já atingiu o limite de 2 remarcações.');
  });

  /**
   * @caso CT-UNI-104
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Recusar remarcação de consulta em estado final
   * @resultadoEsperado verificarRemarcacao retorna erro de regra para status CANCELADA
   */
  test('recusa remarcação de consulta cancelada', () => {
    const resultado = verificarRemarcacao(consulta(20, 10, 'CANCELADA'), pacienteDono, AGORA);
    expect(resultado.mensagem).toBe('Somente consultas agendadas ou confirmadas podem ser remarcadas.');
  });

  /**
   * @caso CT-UNI-105
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN27, RN30
   * @objetivo Impedir que terceiros remarquem a consulta
   * @resultadoEsperado verificarRemarcacao retorna erro de permissão para paciente não dono e médico dono
   */
  test('recusa remarcação por terceiros', () => {
    expect(verificarRemarcacao(consulta(20, 10), outroPaciente, AGORA).tipo).toBe('PERMISSAO');
    expect(verificarRemarcacao(consulta(20, 10), medicoDono, AGORA).tipo).toBe('PERMISSAO');
  });
});

describe('verificarRealizacao (RN28)', () => {
  /**
   * @caso CT-UNI-106
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN28
   * @objetivo Permitir que o médico da consulta registre o atendimento a partir do horário de início
   * @resultadoEsperado verificarRealizacao retorna null para médico dono com agora igual ao início
   */
  test('médico dono registra no horário da consulta', () => {
    expect(verificarRealizacao(consulta(19, 8), medicoDono, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-107
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN28
   * @objetivo Recusar registro de atendimento antes do horário de início
   * @resultadoEsperado verificarRealizacao retorna erro de regra para consulta futura
   */
  test('recusa registro antes do início', () => {
    const resultado = verificarRealizacao(consulta(19, 10), medicoDono, AGORA);
    expect(resultado.mensagem).toBe('O atendimento só pode ser registrado a partir do horário da consulta.');
  });

  /**
   * @caso CT-UNI-108
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN28, RN30
   * @objetivo Impedir a recepção, outro médico ou o paciente de registrarem o atendimento
   * @resultadoEsperado verificarRealizacao retorna erro de permissão nos três casos
   */
  test('só o médico da consulta registra o atendimento', () => {
    expect(verificarRealizacao(consulta(19, 8), recepcao, AGORA).tipo).toBe('PERMISSAO');
    expect(verificarRealizacao(consulta(19, 8), outroMedico, AGORA).tipo).toBe('PERMISSAO');
    expect(verificarRealizacao(consulta(19, 8), pacienteDono, AGORA).tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-109
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN28
   * @objetivo Recusar registro de atendimento em consulta cancelada
   * @resultadoEsperado verificarRealizacao retorna erro de regra para status CANCELADA
   */
  test('recusa atendimento em consulta cancelada', () => {
    const resultado = verificarRealizacao(consulta(19, 8, 'CANCELADA'), medicoDono, AGORA);
    expect(resultado.mensagem).toBe('Esta consulta não pode ser marcada como realizada.');
  });
});

describe('verificarFalta (RN29)', () => {
  /**
   * @caso CT-UNI-110
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Aceitar registro de falta com exatamente 15 minutos após o início (valor-limite)
   * @resultadoEsperado verificarFalta retorna null para consulta iniciada às 07:45 registrada às 08:00
   */
  test('aceita falta com exatamente 15 minutos de tolerância', () => {
    const consultaNoLimite = { id: 1, status: 'AGENDADA', inicio: new Date(2026, 9, 19, 7, 45) };
    expect(verificarFalta(consultaNoLimite, medicoDono, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-111
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Recusar registro de falta dentro dos 15 minutos de tolerância
   * @resultadoEsperado verificarFalta retorna erro de regra para consulta iniciada às 07:46
   */
  test('recusa falta dentro da tolerância de 15 minutos', () => {
    const consultaRecente = { id: 1, status: 'AGENDADA', inicio: new Date(2026, 9, 19, 7, 46) };
    const resultado = verificarFalta(consultaRecente, medicoDono, AGORA);
    expect(resultado.tipo).toBe('REGRA');
    expect(resultado.mensagem).toBe('A falta só pode ser registrada 15 minutos após o início da consulta.');
  });

  /**
   * @caso CT-UNI-112
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN29, RN30
   * @objetivo Impedir o paciente e um médico de fora de registrarem falta
   * @resultadoEsperado verificarFalta retorna erro de permissão para paciente dono e médico não dono
   */
  test('só médico da consulta ou recepção registram falta', () => {
    const consultaPassada = { id: 1, status: 'AGENDADA', inicio: new Date(2026, 9, 19, 7, 0) };
    expect(verificarFalta(consultaPassada, pacienteDono, AGORA).tipo).toBe('PERMISSAO');
    expect(verificarFalta(consultaPassada, outroMedico, AGORA).tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-113
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN29, RF09.5
   * @objetivo Permitir que a recepção registre a falta após a tolerância
   * @resultadoEsperado verificarFalta retorna null para ator RECEPCAO em consulta iniciada às 07:00
   */
  test('recepção pode registrar falta após a tolerância', () => {
    const consultaPassada = { id: 1, status: 'AGENDADA', inicio: new Date(2026, 9, 19, 7, 0) };
    expect(verificarFalta(consultaPassada, recepcao, AGORA)).toBeNull();
  });
});
