// Integração: ciclo de vida da consulta — confirmar, cancelar, remarcar, realizar e falta (RF09, RN25–RN29).
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');
const clock = require('../../src/utils/clock');

let ctx;
let recepcao;
let carlos;
let beatriz;
let ana;
let joao;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  const db = abrirBanco(':memory:');
  const dados = semear(db);
  ctx = { db, ...dados, ...criarServicos(db) };
  recepcao = { perfil: 'RECEPCAO' };
  [carlos, beatriz] = ctx.medicos;
  [ana, joao] = ctx.pacientes;
});

afterEach(() => {
  ctx.db.close();
  clock.definirAgora(null);
});

function agendar(paciente = ana, medico = carlos, inicio = '2026-10-20 09:00') {
  return ctx.consultasService.agendar(recepcao, { pacienteId: paciente.id, medicoId: medico.id, inicio });
}

function em(dataHora) {
  clock.definirAgora(new Date(dataHora.replace(' ', 'T')));
}

const atorPaciente = (paciente) => ({ perfil: 'PACIENTE', pacienteId: paciente.id });
const atorMedico = (medico) => ({ perfil: 'MEDICO', medicoId: medico.id });

describe('confirmar', () => {
  /**
   * @caso CT-INT-203
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.1, RN25
   * @objetivo Confirmar presença pela recepção dentro de 48 horas
   * @resultadoEsperado A consulta passa para CONFIRMADA
   */
  test('recepção confirma consulta agendada', () => {
    const consulta = agendar();
    expect(ctx.consultasService.confirmar(recepcao, consulta.id).status).toBe('CONFIRMADA');
  });

  /**
   * @caso CT-INT-204
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.1, RN25
   * @objetivo Confirmar presença pelo próprio paciente
   * @resultadoEsperado A consulta do paciente fica CONFIRMADA
   */
  test('paciente confirma a própria consulta', () => {
    const consulta = agendar();
    expect(ctx.consultasService.confirmar(atorPaciente(ana), consulta.id).status).toBe('CONFIRMADA');
  });

  /**
   * @caso CT-INT-205
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Recusar confirmação antes da janela de 48 horas
   * @resultadoEsperado confirmar lança 422 citando as 48 horas
   */
  test('recusa confirmação com mais de 48 horas', () => {
    const consulta = agendar(ana, carlos, '2026-10-22 09:00');
    expect(() => ctx.consultasService.confirmar(recepcao, consulta.id)).toThrow(
      expect.objectContaining({ status: 422, message: 'A confirmação só é permitida nas 48 horas anteriores à consulta.' }),
    );
  });

  /**
   * @caso CT-INT-206
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Recusar confirmação de consulta já confirmada
   * @resultadoEsperado confirmar lança 422 sobre consultas agendadas
   */
  test('não confirma duas vezes', () => {
    const consulta = agendar();
    ctx.consultasService.confirmar(recepcao, consulta.id);
    expect(() => ctx.consultasService.confirmar(recepcao, consulta.id)).toThrow(
      expect.objectContaining({ status: 422, message: 'Somente consultas agendadas podem ser confirmadas.' }),
    );
  });

  /**
   * @caso CT-INT-207
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN25, RN30
   * @objetivo Impedir que o médico confirme consulta
   * @resultadoEsperado confirmar lança 403 SEM_PERMISSAO
   */
  test('médico não confirma consulta', () => {
    const consulta = agendar();
    expect(() => ctx.consultasService.confirmar(atorMedico(carlos), consulta.id)).toThrow(
      expect.objectContaining({ status: 403, message: 'Somente o paciente da consulta ou a recepção podem confirmar.' }),
    );
  });

  /**
   * @caso CT-INT-208
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir que outro paciente confirme a consulta
   * @resultadoEsperado confirmar lança 403 SEM_PERMISSAO
   */
  test('outro paciente não confirma', () => {
    const consulta = agendar();
    expect(() => ctx.consultasService.confirmar(atorPaciente(joao), consulta.id)).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  /**
   * @caso CT-INT-209
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Recusar confirmação depois de a consulta começar
   * @resultadoEsperado confirmar lança 422 com "A consulta já começou."
   */
  test('não confirma consulta iniciada', () => {
    const consulta = agendar();
    em('2026-10-20 09:01');
    expect(() => ctx.consultasService.confirmar(recepcao, consulta.id)).toThrow(
      expect.objectContaining({ status: 422, message: 'A consulta já começou.' }),
    );
  });

  /**
   * @caso CT-INT-210
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN25, RNF04
   * @objetivo Recusar confirmação de consulta inexistente
   * @resultadoEsperado confirmar lança 404 NAO_ENCONTRADO
   */
  test('consulta inexistente devolve 404', () => {
    expect(() => ctx.consultasService.confirmar(recepcao, 9999)).toThrow(
      expect.objectContaining({ status: 404, message: 'Consulta não encontrada.' }),
    );
  });
});

describe('cancelar', () => {
  /**
   * @caso CT-INT-211
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.2, RN26
   * @objetivo Cancelar pelo paciente com mais de 24 horas de antecedência
   * @resultadoEsperado A consulta fica CANCELADA, sem motivo e com canceladoPor PACIENTE
   */
  test('paciente cancela com antecedência', () => {
    const consulta = agendar();
    const cancelada = ctx.consultasService.cancelar(atorPaciente(ana), consulta.id);
    expect(cancelada).toMatchObject({ status: 'CANCELADA', motivoCancelamento: null, canceladoPor: 'PACIENTE' });
  });

  /**
   * @caso CT-INT-212
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Recusar cancelamento do paciente com menos de 24 horas
   * @resultadoEsperado cancelar lança 422 orientando procurar a recepção
   */
  test('paciente não cancela em cima da hora', () => {
    const consulta = agendar();
    em('2026-10-20 08:00');
    expect(() => ctx.consultasService.cancelar(atorPaciente(ana), consulta.id)).toThrow(
      expect.objectContaining({
        status: 422,
        message: 'O paciente só pode cancelar com no mínimo 24 horas de antecedência. Procure a recepção.',
      }),
    );
  });

  /**
   * @caso CT-INT-213
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN26
   * @objetivo Exigir motivo quando a recepção cancela
   * @resultadoEsperado cancelar lança 422 "Informe o motivo do cancelamento."
   */
  test('recepção precisa informar motivo', () => {
    const consulta = agendar();
    expect(() => ctx.consultasService.cancelar(recepcao, consulta.id)).toThrow(
      expect.objectContaining({ status: 422, message: 'Informe o motivo do cancelamento.' }),
    );
  });

  /**
   * @caso CT-INT-214
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.2, RN26
   * @objetivo Cancelar pela recepção com motivo
   * @resultadoEsperado O motivo e o perfil que cancelou ficam gravados
   */
  test('recepção cancela com motivo', () => {
    const consulta = agendar();
    const cancelada = ctx.consultasService.cancelar(recepcao, consulta.id, { motivo: 'Médico precisou sair' });
    expect(cancelada).toMatchObject({
      status: 'CANCELADA',
      motivoCancelamento: 'Médico precisou sair',
      canceladoPor: 'RECEPCAO',
    });
  });

  /**
   * @caso CT-INT-215
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN26
   * @objetivo Remover espaços em volta do motivo informado
   * @resultadoEsperado O motivo é gravado sem espaços extras
   */
  test('motivo é normalizado com trim', () => {
    const consulta = agendar();
    const cancelada = ctx.consultasService.cancelar(recepcao, consulta.id, { motivo: '   Urgência   ' });
    expect(cancelada.motivoCancelamento).toBe('Urgência');
  });

  /**
   * @caso CT-INT-216
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN26
   * @objetivo Permitir que o médico cancele consulta da própria agenda
   * @resultadoEsperado A consulta fica CANCELADA com canceladoPor MEDICO
   */
  test('médico cancela consulta da própria agenda', () => {
    const consulta = agendar();
    const cancelada = ctx.consultasService.cancelar(atorMedico(carlos), consulta.id, { motivo: 'Cirurgia de emergência' });
    expect(cancelada).toMatchObject({ status: 'CANCELADA', canceladoPor: 'MEDICO' });
  });

  /**
   * @caso CT-INT-217
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN26, RN30
   * @objetivo Impedir que o médico cancele consulta de outro médico
   * @resultadoEsperado cancelar lança 403 SEM_PERMISSAO
   */
  test('médico não cancela consulta de outro', () => {
    const consulta = agendar();
    expect(() => ctx.consultasService.cancelar(atorMedico(beatriz), consulta.id, { motivo: 'Não é minha' })).toThrow(
      expect.objectContaining({ status: 403, message: 'Você não pode cancelar esta consulta.' }),
    );
  });

  /**
   * @caso CT-INT-218
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir que outro paciente cancele a consulta
   * @resultadoEsperado cancelar lança 403 SEM_PERMISSAO
   */
  test('outro paciente não cancela', () => {
    const consulta = agendar();
    expect(() => ctx.consultasService.cancelar(atorPaciente(joao), consulta.id, { motivo: 'Engano' })).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  /**
   * @caso CT-INT-219
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Recusar cancelamento de consulta já cancelada
   * @resultadoEsperado cancelar lança 422 sobre o estado da consulta
   */
  test('não cancela duas vezes', () => {
    const consulta = agendar();
    ctx.consultasService.cancelar(recepcao, consulta.id, { motivo: 'Primeiro cancelamento' });
    expect(() => ctx.consultasService.cancelar(recepcao, consulta.id, { motivo: 'Segundo' })).toThrow(
      expect.objectContaining({ status: 422, message: 'Esta consulta não pode mais ser cancelada.' }),
    );
  });

  /**
   * @caso CT-INT-220
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Recusar cancelamento depois do início da consulta
   * @resultadoEsperado cancelar lança 422 com "A consulta já começou"
   */
  test('não cancela consulta iniciada', () => {
    const consulta = agendar();
    em('2026-10-20 09:05');
    expect(() => ctx.consultasService.cancelar(recepcao, consulta.id, { motivo: 'Tarde demais' })).toThrow(
      expect.objectContaining({ status: 422, message: 'A consulta já começou e não pode ser cancelada.' }),
    );
  });
});

describe('remarcar', () => {
  /**
   * @caso CT-INT-221
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.3, RN27
   * @objetivo Remarcar a consulta pela recepção para outro horário
   * @resultadoEsperado A consulta muda de horário, volta a AGENDADA e conta 1 remarcação
   */
  test('recepção remarca para outro horário', () => {
    const consulta = agendar();
    const remarcada = ctx.consultasService.remarcar(recepcao, consulta.id, { inicio: '2026-10-20 10:00' });
    expect(remarcada).toMatchObject({ inicio: '2026-10-20 10:00', fim: '2026-10-20 10:30', status: 'AGENDADA', remarcacoes: 1 });
  });

  /**
   * @caso CT-INT-222
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN27
   * @objetivo Remarcar a própria consulta como paciente
   * @resultadoEsperado A consulta é remarcada com sucesso
   */
  test('paciente remarca a própria consulta', () => {
    const consulta = agendar();
    expect(ctx.consultasService.remarcar(atorPaciente(ana), consulta.id, { inicio: '2026-10-20 11:00' }).inicio).toBe(
      '2026-10-20 11:00',
    );
  });

  /**
   * @caso CT-INT-223
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Recalcular o valor no momento da remarcação
   * @resultadoEsperado O valor permanece o preço da especialidade para paciente adulto
   */
  test('remarcação recalcula o valor', () => {
    const consulta = agendar();
    expect(ctx.consultasService.remarcar(recepcao, consulta.id, { inicio: '2026-10-20 10:00' }).valorCentavos).toBe(15000);
  });

  /**
   * @caso CT-INT-224
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Impedir remarcação com menos de 24 horas de antecedência
   * @resultadoEsperado remarcar lança 422 citando as 24 horas
   */
  test('recusa remarcação em cima da hora', () => {
    const consulta = agendar();
    em('2026-10-20 08:00');
    expect(() => ctx.consultasService.remarcar(recepcao, consulta.id, { inicio: '2026-10-21 09:00' })).toThrow(
      expect.objectContaining({ status: 422, message: 'A remarcação só é permitida até 24 horas antes da consulta.' }),
    );
  });

  /**
   * @caso CT-INT-225
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN27, RN30
   * @objetivo Impedir que o médico remarque consultas
   * @resultadoEsperado remarcar lança 403 SEM_PERMISSAO
   */
  test('médico não remarca consulta', () => {
    const consulta = agendar();
    expect(() => ctx.consultasService.remarcar(atorMedico(carlos), consulta.id, { inicio: '2026-10-20 10:00' })).toThrow(
      expect.objectContaining({ status: 403, message: 'Somente o paciente da consulta ou a recepção podem remarcar.' }),
    );
  });

  /**
   * @caso CT-INT-226
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir remarcação por outro paciente
   * @resultadoEsperado remarcar lança 403 SEM_PERMISSAO
   */
  test('outro paciente não remarca', () => {
    const consulta = agendar();
    expect(() => ctx.consultasService.remarcar(atorPaciente(joao), consulta.id, { inicio: '2026-10-20 10:00' })).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  /**
   * @caso CT-INT-227
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Limitar a consulta a duas remarcações
   * @resultadoEsperado A terceira remarcação lança 422
   */
  test('limite de duas remarcações', () => {
    const consulta = agendar();
    ctx.consultasService.remarcar(recepcao, consulta.id, { inicio: '2026-10-21 09:00' });
    ctx.consultasService.remarcar(recepcao, consulta.id, { inicio: '2026-10-22 09:00' });
    expect(() => ctx.consultasService.remarcar(recepcao, consulta.id, { inicio: '2026-10-23 09:00' })).toThrow(
      expect.objectContaining({ status: 422, message: 'Esta consulta já atingiu o limite de 2 remarcações.' }),
    );
  });

  /**
   * @caso CT-INT-228
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Recusar remarcação para horário ocupado por outra consulta
   * @resultadoEsperado remarcar lança 409 CONFLITO
   */
  test('não remarca para horário ocupado', () => {
    const consulta = agendar();
    agendar(joao, carlos, '2026-10-20 10:00');
    expect(() => ctx.consultasService.remarcar(recepcao, consulta.id, { inicio: '2026-10-20 10:00' })).toThrow(
      expect.objectContaining({ status: 409, message: 'Horário indisponível para este médico.' }),
    );
  });

  /**
   * @caso CT-INT-229
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Permitir remarcar para o mesmo horário já ocupado pela própria consulta
   * @resultadoEsperado A remarcação é aceita e incrementa o contador
   */
  test('remarcar para o mesmo horário ignora a própria consulta', () => {
    const consulta = agendar();
    const remarcada = ctx.consultasService.remarcar(recepcao, consulta.id, { inicio: '2026-10-20 09:00' });
    expect(remarcada).toMatchObject({ inicio: '2026-10-20 09:00', remarcacoes: 1 });
  });

  /**
   * @caso CT-INT-230
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN27
   * @objetivo Fazer a consulta confirmada voltar para AGENDADA ao remarcar
   * @resultadoEsperado O status depois da remarcação é AGENDADA
   */
  test('remarcação volta o status para AGENDADA', () => {
    const consulta = agendar();
    ctx.consultasService.confirmar(recepcao, consulta.id);
    expect(ctx.consultasService.remarcar(recepcao, consulta.id, { inicio: '2026-10-20 10:00' }).status).toBe('AGENDADA');
  });

  /**
   * @caso CT-INT-231
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Recusar remarcação de consulta cancelada
   * @resultadoEsperado remarcar lança 422 sobre consultas ativas
   */
  test('não remarca consulta cancelada', () => {
    const consulta = agendar();
    ctx.consultasService.cancelar(recepcao, consulta.id, { motivo: 'Desistiu' });
    expect(() => ctx.consultasService.remarcar(recepcao, consulta.id, { inicio: '2026-10-20 10:00' })).toThrow(
      expect.objectContaining({ status: 422, message: 'Somente consultas agendadas ou confirmadas podem ser remarcadas.' }),
    );
  });

  /**
   * @caso CT-INT-232
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN27, RNF04
   * @objetivo Manter o horário original quando a remarcação falha
   * @resultadoEsperado A consulta continua em 2026-10-20 09:00 após tentativa inválida
   */
  test('remarcação recusada preserva o horário original', () => {
    const consulta = agendar();
    expect(() => ctx.consultasService.remarcar(recepcao, consulta.id, { inicio: '2026-10-20 09:07' })).toThrow();
    expect(ctx.consultasService.obter(recepcao, consulta.id)).toMatchObject({ inicio: '2026-10-20 09:00', remarcacoes: 0 });
  });
});

describe('registrar realizada', () => {
  /**
   * @caso CT-INT-233
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.4, RN28
   * @objetivo Registrar atendimento pelo médico no horário da consulta
   * @resultadoEsperado A consulta fica REALIZADA com observações gravadas
   */
  test('médico registra atendimento com observações', () => {
    const consulta = agendar();
    em('2026-10-20 09:00');
    const realizada = ctx.consultasService.registrarRealizada(atorMedico(carlos), consulta.id, { observacoes: '  Paciente estável  ' });
    expect(realizada).toMatchObject({ status: 'REALIZADA', observacoes: 'Paciente estável' });
  });

  /**
   * @caso CT-INT-234
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF09.4
   * @objetivo Aceitar atendimento sem observações
   * @resultadoEsperado As observações ficam nulas
   */
  test('observações são opcionais', () => {
    const consulta = agendar();
    em('2026-10-20 09:10');
    expect(ctx.consultasService.registrarRealizada(atorMedico(carlos), consulta.id).observacoes).toBeNull();
  });

  /**
   * @caso CT-INT-235
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN28
   * @objetivo Recusar registro antes do início da consulta
   * @resultadoEsperado registrarRealizada lança 422
   */
  test('não registra atendimento antes do horário', () => {
    const consulta = agendar();
    expect(() => ctx.consultasService.registrarRealizada(atorMedico(carlos), consulta.id)).toThrow(
      expect.objectContaining({ status: 422, message: 'O atendimento só pode ser registrado a partir do horário da consulta.' }),
    );
  });

  /**
   * @caso CT-INT-236
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN28, RN30
   * @objetivo Impedir que a recepção registre atendimento
   * @resultadoEsperado registrarRealizada lança 403 SEM_PERMISSAO
   */
  test('recepção não registra atendimento', () => {
    const consulta = agendar();
    em('2026-10-20 09:00');
    expect(() => ctx.consultasService.registrarRealizada(recepcao, consulta.id)).toThrow(
      expect.objectContaining({ status: 403, message: 'Somente o médico da consulta pode registrar o atendimento.' }),
    );
  });

  /**
   * @caso CT-INT-237
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir que outro médico registre o atendimento
   * @resultadoEsperado registrarRealizada lança 403 SEM_PERMISSAO
   */
  test('outro médico não registra atendimento', () => {
    const consulta = agendar();
    em('2026-10-20 09:00');
    expect(() => ctx.consultasService.registrarRealizada(atorMedico(beatriz), consulta.id)).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  /**
   * @caso CT-INT-238
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN28
   * @objetivo Recusar atendimento de consulta cancelada
   * @resultadoEsperado registrarRealizada lança 422
   */
  test('não registra atendimento de consulta cancelada', () => {
    const consulta = agendar();
    ctx.consultasService.cancelar(recepcao, consulta.id, { motivo: 'Cancelada antes' });
    em('2026-10-20 09:00');
    expect(() => ctx.consultasService.registrarRealizada(atorMedico(carlos), consulta.id)).toThrow(
      expect.objectContaining({ status: 422, message: 'Esta consulta não pode ser marcada como realizada.' }),
    );
  });

  /**
   * @caso CT-INT-239
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN28
   * @objetivo Registrar atendimento de consulta confirmada
   * @resultadoEsperado A consulta confirmada passa para REALIZADA
   */
  test('consulta confirmada pode ser realizada', () => {
    const consulta = agendar();
    ctx.consultasService.confirmar(recepcao, consulta.id);
    em('2026-10-20 09:30');
    expect(ctx.consultasService.registrarRealizada(atorMedico(carlos), consulta.id).status).toBe('REALIZADA');
  });
});

describe('registrar falta', () => {
  /**
   * @caso CT-INT-240
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.5, RN29
   * @objetivo Registrar falta 15 minutos após o início pela recepção
   * @resultadoEsperado A consulta fica com status FALTA
   */
  test('recepção registra falta após a tolerância', () => {
    const consulta = agendar();
    em('2026-10-20 09:15');
    expect(ctx.consultasService.registrarFalta(recepcao, consulta.id).status).toBe('FALTA');
  });

  /**
   * @caso CT-INT-241
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Recusar falta antes dos 15 minutos de tolerância
   * @resultadoEsperado registrarFalta lança 422 citando os 15 minutos
   */
  test('não registra falta antes de 15 minutos', () => {
    const consulta = agendar();
    em('2026-10-20 09:14');
    expect(() => ctx.consultasService.registrarFalta(recepcao, consulta.id)).toThrow(
      expect.objectContaining({ status: 422, message: 'A falta só pode ser registrada 15 minutos após o início da consulta.' }),
    );
  });

  /**
   * @caso CT-INT-242
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN29
   * @objetivo Registrar falta pelo médico da consulta
   * @resultadoEsperado A consulta fica com status FALTA
   */
  test('médico registra falta', () => {
    const consulta = agendar();
    em('2026-10-20 10:00');
    expect(ctx.consultasService.registrarFalta(atorMedico(carlos), consulta.id).status).toBe('FALTA');
  });

  /**
   * @caso CT-INT-243
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN29, RN30
   * @objetivo Impedir que o paciente registre falta
   * @resultadoEsperado registrarFalta lança 403 SEM_PERMISSAO
   */
  test('paciente não registra falta', () => {
    const consulta = agendar();
    em('2026-10-20 10:00');
    expect(() => ctx.consultasService.registrarFalta(atorPaciente(ana), consulta.id)).toThrow(
      expect.objectContaining({ status: 403, message: 'Somente o médico da consulta ou a recepção podem registrar falta.' }),
    );
  });

  /**
   * @caso CT-INT-244
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Recusar falta de consulta já realizada
   * @resultadoEsperado registrarFalta lança 422
   */
  test('não registra falta de consulta realizada', () => {
    const consulta = agendar();
    em('2026-10-20 09:00');
    ctx.consultasService.registrarRealizada(atorMedico(carlos), consulta.id);
    expect(() => ctx.consultasService.registrarFalta(recepcao, consulta.id)).toThrow(
      expect.objectContaining({ status: 422, message: 'Esta consulta não pode ser marcada como falta.' }),
    );
  });

  /**
   * @caso CT-INT-245
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Recusar falta de consulta cancelada
   * @resultadoEsperado registrarFalta lança 422
   */
  test('não registra falta de consulta cancelada', () => {
    const consulta = agendar();
    ctx.consultasService.cancelar(recepcao, consulta.id, { motivo: 'Avisou antes' });
    em('2026-10-20 09:30');
    expect(() => ctx.consultasService.registrarFalta(recepcao, consulta.id)).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });
});

describe('obter', () => {
  /**
   * @caso CT-INT-246
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.1, RN30
   * @objetivo Deixar o paciente ler a própria consulta
   * @resultadoEsperado obter devolve o registro
   */
  test('paciente lê a própria consulta', () => {
    const consulta = agendar();
    expect(ctx.consultasService.obter(atorPaciente(ana), consulta.id).id).toBe(consulta.id);
  });

  /**
   * @caso CT-INT-247
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30
   * @objetivo Impedir que o paciente leia consulta de outro
   * @resultadoEsperado obter lança 403 SEM_PERMISSAO
   */
  test('paciente não lê consulta de outro', () => {
    const consulta = agendar();
    expect(() => ctx.consultasService.obter(atorPaciente(joao), consulta.id)).toThrow(
      expect.objectContaining({ status: 403, message: 'Você não tem acesso a esta consulta.' }),
    );
  });

  /**
   * @caso CT-INT-248
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.2, RN30
   * @objetivo Deixar o médico ler consulta da própria agenda
   * @resultadoEsperado obter devolve o registro
   */
  test('médico lê consulta da própria agenda', () => {
    const consulta = agendar();
    expect(ctx.consultasService.obter(atorMedico(carlos), consulta.id).medicoId).toBe(carlos.id);
  });

  /**
   * @caso CT-INT-249
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30
   * @objetivo Impedir que o médico leia consulta de outro médico
   * @resultadoEsperado obter lança 403 SEM_PERMISSAO
   */
  test('médico não lê consulta de outro médico', () => {
    const consulta = agendar();
    expect(() => ctx.consultasService.obter(atorMedico(beatriz), consulta.id)).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  /**
   * @caso CT-INT-250
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN30, RNF04
   * @objetivo Devolver 404 para consulta inexistente
   * @resultadoEsperado obter lança 404 NAO_ENCONTRADO
   */
  test('consulta inexistente devolve 404', () => {
    expect(() => ctx.consultasService.obter(recepcao, 9999)).toThrow(
      expect.objectContaining({ status: 404, message: 'Consulta não encontrada.' }),
    );
  });
});
