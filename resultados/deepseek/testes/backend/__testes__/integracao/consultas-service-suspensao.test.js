// Integração: suspensão de pacientes por faltas (RF09, RN20, RN21).
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');
const clock = require('../../src/utils/clock');

let ctx;
let recepcao;
let carlos;
let beatriz;
let ana;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  const db = abrirBanco(':memory:');
  const dados = semear(db);
  ctx = { db, ...dados, ...criarServicos(db) };
  recepcao = { perfil: 'RECEPCAO' };
  [carlos, beatriz] = ctx.medicos;
  ana = ctx.pacientes[0];
});

afterEach(() => {
  ctx.db.close();
  clock.definirAgora(null);
});

// Registra uma falta pelo fluxo real: agenda 2h antes, avança para 15 min após o início e marca a falta.
function faltaPeloServico(inicioTexto) {
  const inicio = new Date(`${inicioTexto.replace(' ', 'T')}:00`);
  clock.definirAgora(new Date(inicio.getTime() - 120 * 60000));
  const consulta = ctx.consultasService.agendar(recepcao, { pacienteId: ana.id, medicoId: carlos.id, inicio: inicioTexto });
  clock.definirAgora(new Date(inicio.getTime() + 16 * 60000));
  ctx.consultasService.registrarFalta(recepcao, consulta.id);
  return consulta;
}

// Insere diretamente uma consulta com FALTA, para montar cenários de janela de tempo.
function inserirFalta(inicioTexto) {
  const fim = new Date(`${inicioTexto.replace(' ', 'T')}:00`);
  fim.setMinutes(fim.getMinutes() + 30);
  const fimTexto = `${inicioTexto.slice(0, 11)}${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}`;
  return Number(
    ctx.db
      .prepare(`INSERT INTO consultas (paciente_id, medico_id, inicio, fim, status, valor_centavos, criado_em, atualizado_em)
                VALUES (?, ?, ?, ?, 'FALTA', 15000, ?, ?)`)
      .run(ana.id, carlos.id, inicioTexto, fimTexto, inicioTexto, inicioTexto).lastInsertRowid,
  );
}

function agendarAna(inicio) {
  return ctx.consultasService.agendar(recepcao, { pacienteId: ana.id, medicoId: carlos.id, inicio });
}

describe('suspensão por faltas', () => {
  /**
   * @caso CT-INT-178
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Suspender o paciente após três faltas nos últimos 90 dias
   * @resultadoEsperado O agendamento seguinte é recusado com 422
   */
  test('três faltas suspendem o paciente', () => {
    faltaPeloServico('2026-10-19 10:00');
    faltaPeloServico('2026-10-19 13:00');
    faltaPeloServico('2026-10-19 16:00');
    expect(() => agendarAna('2026-10-20 09:00')).toThrow(
      expect.objectContaining({ status: 422, codigo: 'REGRA_NEGOCIO' }),
    );
  });

  /**
   * @caso CT-INT-179
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Não suspender o paciente com apenas duas faltas
   * @resultadoEsperado O agendamento é aceito
   */
  test('duas faltas não suspendem', () => {
    faltaPeloServico('2026-10-19 10:00');
    faltaPeloServico('2026-10-19 13:00');
    expect(agendarAna('2026-10-20 09:00').status).toBe('AGENDADA');
  });

  /**
   * @caso CT-INT-180
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Calcular a suspensão a partir da falta mais recente
   * @resultadoEsperado A mensagem aponta 30 dias após a última falta (2026-11-18)
   */
  test('suspensão conta 30 dias a partir da última falta', () => {
    faltaPeloServico('2026-10-19 10:00');
    faltaPeloServico('2026-10-19 13:00');
    faltaPeloServico('2026-10-19 16:00');
    expect(() => agendarAna('2026-10-20 09:00')).toThrow(
      expect.objectContaining({ message: 'Paciente suspenso por faltas até 2026-11-18.' }),
    );
  });

  /**
   * @caso CT-INT-181
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Bloquear o paciente suspenso em qualquer especialidade
   * @resultadoEsperado O agendamento com outro médico também é recusado com 422
   */
  test('suspensão vale para todas as especialidades', () => {
    faltaPeloServico('2026-10-19 10:00');
    faltaPeloServico('2026-10-19 13:00');
    faltaPeloServico('2026-10-19 16:00');
    expect(() => ctx.consultasService.agendar(recepcao, { pacienteId: ana.id, medicoId: beatriz.id, inicio: '2026-10-21 09:00' })).toThrow(
      expect.objectContaining({ status: 422, message: 'Paciente suspenso por faltas até 2026-11-18.' }),
    );
  });

  /**
   * @caso CT-INT-182
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Ignorar faltas ocorridas antes da janela de 90 dias
   * @resultadoEsperado Três faltas de 2026-06-21 não suspendem o paciente
   */
  test('faltas fora da janela de 90 dias não suspendem', () => {
    inserirFalta('2026-06-21 09:00');
    inserirFalta('2026-06-22 09:00');
    inserirFalta('2026-06-23 09:00');
    expect(agendarAna('2026-10-20 09:00').status).toBe('AGENDADA');
  });

  /**
   * @caso CT-INT-183
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Contar somente as faltas dentro da janela de 90 dias
   * @resultadoEsperado Duas faltas recentes e uma antiga não suspendem
   */
  test('falta antiga não soma com as recentes', () => {
    inserirFalta('2026-06-21 09:00');
    inserirFalta('2026-10-05 09:00');
    inserirFalta('2026-10-06 09:00');
    expect(agendarAna('2026-10-20 09:00').status).toBe('AGENDADA');
  });

  /**
   * @caso CT-INT-184
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Não contar falta com data futura
   * @resultadoEsperado Duas faltas recentes e uma futura não suspendem
   */
  test('falta futura não entra na contagem', () => {
    inserirFalta('2026-10-05 09:00');
    inserirFalta('2026-10-06 09:00');
    inserirFalta('2026-10-30 09:00');
    expect(agendarAna('2026-10-20 09:00').status).toBe('AGENDADA');
  });

  /**
   * @caso CT-INT-185
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Liberar o paciente quando os 30 dias de suspensão expiram
   * @resultadoEsperado Três faltas de 2026-09-10 já não bloqueiam o agendamento
   */
  test('suspensão expira após 30 dias', () => {
    inserirFalta('2026-09-09 09:00');
    inserirFalta('2026-09-10 09:00');
    inserirFalta('2026-09-11 09:00');
    expect(agendarAna('2026-10-20 09:00').status).toBe('AGENDADA');
  });

  /**
   * @caso CT-INT-186
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Não contar consultas canceladas ou realizadas como falta
   * @resultadoEsperado O paciente continua podendo agendar
   */
  test('cancelamentos e realizações não contam como falta', () => {
    const cancelada = agendarAna('2026-10-20 09:00');
    ctx.consultasService.cancelar(recepcao, cancelada.id, { motivo: 'Paciente avisou' });
    const realizada = agendarAna('2026-10-20 10:00');
    clock.definirAgora(new Date('2026-10-20T10:00:00'));
    ctx.consultasService.registrarRealizada({ perfil: 'MEDICO', medicoId: carlos.id }, realizada.id, { observacoes: 'Ok' });
    clock.definirAgora(new Date('2026-10-20T11:00:00'));
    expect(agendarAna('2026-10-22 09:00').status).toBe('AGENDADA');
  });

  /**
   * @caso CT-INT-187
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN20, RNF04
   * @objetivo Manter o paciente suspenso mesmo após uma tentativa recusada
   * @resultadoEsperado Uma segunda tentativa continua lançando 422
   */
  test('tentativa recusada não limpa a suspensão', () => {
    faltaPeloServico('2026-10-19 10:00');
    faltaPeloServico('2026-10-19 13:00');
    faltaPeloServico('2026-10-19 16:00');
    expect(() => agendarAna('2026-10-20 09:00')).toThrow(expect.objectContaining({ status: 422 }));
    expect(() => agendarAna('2026-10-20 10:00')).toThrow(expect.objectContaining({ status: 422 }));
  });

  /**
   * @caso CT-INT-188
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Suspender apenas o paciente com faltas, sem afetar outros pacientes
   * @resultadoEsperado João continua agendando normalmente
   */
  test('suspensão é individual por paciente', () => {
    faltaPeloServico('2026-10-19 10:00');
    faltaPeloServico('2026-10-19 13:00');
    faltaPeloServico('2026-10-19 16:00');
    const joao = ctx.pacientes[1];
    expect(ctx.consultasService.agendar(recepcao, { pacienteId: joao.id, medicoId: carlos.id, inicio: '2026-10-20 09:00' }).status).toBe(
      'AGENDADA',
    );
  });
});
