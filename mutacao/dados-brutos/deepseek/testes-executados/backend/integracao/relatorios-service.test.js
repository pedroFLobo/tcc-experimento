// Integração: relatório resumido por período (RF11.1).
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');
const clock = require('../../src/utils/clock');

let ctx;
let recepcao;
let carlos;
let beatriz;
let eduardo;
let ana;
let joao;
let lucas;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  const db = abrirBanco(':memory:');
  const dados = semear(db);
  ctx = { db, ...dados, ...criarServicos(db) };
  recepcao = { perfil: 'RECEPCAO' };
  [carlos, beatriz, eduardo] = ctx.medicos;
  [ana, joao, lucas] = ctx.pacientes;
});

afterEach(() => {
  ctx.db.close();
  clock.definirAgora(null);
});

function agendar(paciente, medico, inicio) {
  return ctx.consultasService.agendar(recepcao, { pacienteId: paciente.id, medicoId: medico.id, inicio });
}

function em(dataHora) {
  clock.definirAgora(new Date(dataHora.replace(' ', 'T')));
}

// Monta um dia com uma consulta realizada, uma falta, uma agendada e uma cancelada.
function cenarioCompleto() {
  const realizada = agendar(ana, carlos, '2026-10-20 09:00');
  const falta = agendar(joao, carlos, '2026-10-20 10:00');
  const agendada = agendar(lucas, eduardo, '2026-10-20 13:00');
  em('2026-10-20 09:00');
  ctx.consultasService.registrarRealizada({ perfil: 'MEDICO', medicoId: carlos.id }, realizada.id);
  em('2026-10-20 10:16');
  ctx.consultasService.registrarFalta(recepcao, falta.id);
  const cancelada = agendar(ana, carlos, '2026-10-20 15:00');
  ctx.consultasService.cancelar(recepcao, cancelada.id, { motivo: 'Paciente desmarcou' });
  return { realizada, falta, agendada, cancelada };
}

describe('resumo', () => {
  /**
   * @caso CT-INT-266
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF11.1
   * @objetivo Contar as consultas do período por status
   * @resultadoEsperado Cada status reflete exatamente uma consulta
   */
  test('conta consultas por status', () => {
    cenarioCompleto();
    const resumo = ctx.relatoriosService.resumo({ dataInicio: '2026-10-20', dataFim: '2026-10-20' });
    expect(resumo.porStatus).toEqual({ AGENDADA: 1, CONFIRMADA: 0, REALIZADA: 1, FALTA: 1, CANCELADA: 1 });
  });

  /**
   * @caso CT-INT-267
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Somar no faturamento apenas as consultas realizadas
   * @resultadoEsperado O faturamento é 15000 centavos
   */
  test('faturamento soma só as realizadas', () => {
    cenarioCompleto();
    expect(ctx.relatoriosService.resumo({ dataInicio: '2026-10-20', dataFim: '2026-10-20' }).faturamentoCentavos).toBe(15000);
  });

  /**
   * @caso CT-INT-268
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Calcular a taxa de faltas sobre as consultas encerradas
   * @resultadoEsperado Carlos tem 1 falta em 2 encerradas, taxa de 50%
   */
  test('taxa de faltas por médico', () => {
    cenarioCompleto();
    const medico = ctx.relatoriosService.resumo({ dataInicio: '2026-10-20', dataFim: '2026-10-20' }).faltasPorMedico[0];
    expect(medico).toMatchObject({ medicoId: carlos.id, medicoNome: 'Dr. Carlos Almeida', faltas: 1, encerradas: 2, taxaFaltas: 50 });
  });

  /**
   * @caso CT-INT-269
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF11.1
   * @objetivo Devolver o período consultado no relatório
   * @resultadoEsperado O relatório ecoa dataInicio e dataFim
   */
  test('relatório devolve o período consultado', () => {
    const resumo = ctx.relatoriosService.resumo({ dataInicio: '2026-10-19', dataFim: '2026-10-25' });
    expect(resumo.periodo).toEqual({ dataInicio: '2026-10-19', dataFim: '2026-10-25' });
  });

  /**
   * @caso CT-INT-270
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Devolver zeros para período sem consultas
   * @resultadoEsperado Todos os status ficam zerados e o faturamento é 0
   */
  test('período vazio devolve zeros', () => {
    const resumo = ctx.relatoriosService.resumo({ dataInicio: '2026-11-01', dataFim: '2026-11-02' });
    expect(resumo.porStatus).toEqual({ AGENDADA: 0, CONFIRMADA: 0, REALIZADA: 0, FALTA: 0, CANCELADA: 0 });
    expect(resumo.faturamentoCentavos).toBe(0);
    expect(resumo.faltasPorMedico).toEqual([]);
  });

  /**
   * @caso CT-INT-271
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Limitar o relatório ao período informado
   * @resultadoEsperado Consultas fora do período não entram na contagem
   */
  test('ignora consultas fora do período', () => {
    cenarioCompleto();
    const resumo = ctx.relatoriosService.resumo({ dataInicio: '2026-10-21', dataFim: '2026-10-21' });
    expect(resumo.porStatus.AGENDADA).toBe(0);
    expect(resumo.faturamentoCentavos).toBe(0);
  });

  /**
   * @caso CT-INT-272
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Ordenar a taxa de faltas por nome do médico
   * @resultadoEsperado Beatriz aparece antes de Carlos
   */
  test.skip('faltas por médico vêm ordenadas por nome', () => {
    cenarioCompleto();
    em('2026-10-21 08:00');
    const consulta = agendar(lucas, beatriz, '2026-10-21 09:00');
    em('2026-10-21 09:16');
    ctx.consultasService.registrarFalta(recepcao, consulta.id);
    const lista = ctx.relatoriosService.resumo({ dataInicio: '2026-10-19', dataFim: '2026-10-21' }).faltasPorMedico;
    expect(lista.map((m) => m.medicoNome)).toEqual(['Dra. Beatriz Souza', 'Dr. Carlos Almeida']);
  });

  /**
   * @caso CT-INT-273
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Calcular taxa de 100% quando todas as encerradas são faltas
   * @resultadoEsperado A taxa da Beatriz é 100
   */
  test.skip('taxa de 100% com apenas faltas', () => {
    em('2026-10-21 08:00');
    const consulta = agendar(lucas, beatriz, '2026-10-21 09:00');
    em('2026-10-21 09:16');
    ctx.consultasService.registrarFalta(recepcao, consulta.id);
    const medico = ctx.relatoriosService.resumo({ dataInicio: '2026-10-19', dataFim: '2026-10-21' }).faltasPorMedico[0];
    expect(medico.taxaFaltas).toBe(100);
  });

  /**
   * @caso CT-INT-274
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF11.1, RNF06
   * @objetivo Exigir dataInicio e dataFim no relatório
   * @resultadoEsperado resumo lança 400 VALIDACAO
   */
  test('período incompleto devolve 400', () => {
    expect(() => ctx.relatoriosService.resumo({ dataInicio: '2026-10-01' })).toThrow(
      expect.objectContaining({ status: 400, codigo: 'VALIDACAO', message: 'Informe dataInicio e dataFim no formato AAAA-MM-DD.' }),
    );
  });

  /**
   * @caso CT-INT-275
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar datas de relatório malformadas
   * @resultadoEsperado resumo lança 400 VALIDACAO
   */
  test('data malformada devolve 400', () => {
    expect(() => ctx.relatoriosService.resumo({ dataInicio: '2026-10-01', dataFim: '31/10/2026' })).toThrow(
      expect.objectContaining({ status: 400, codigo: 'VALIDACAO' }),
    );
  });

  /**
   * @caso CT-INT-276
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF11.1
   * @objetivo Recusar período com data final anterior à inicial
   * @resultadoEsperado resumo lança 400 com mensagem específica
   */
  test('período invertido devolve 400', () => {
    expect(() => ctx.relatoriosService.resumo({ dataInicio: '2026-10-31', dataFim: '2026-10-01' })).toThrow(
      expect.objectContaining({ status: 400, message: 'dataFim não pode ser anterior a dataInicio.' }),
    );
  });

  /**
   * @caso CT-INT-277
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1, RN23
   * @objetivo Somar o valor com desconto de idoso no faturamento
   * @resultadoEsperado O faturamento reflete 13500 centavos para consulta de João
   */
  test('faturamento considera desconto de idoso', () => {
    const consulta = agendar(joao, carlos, '2026-10-20 09:00');
    em('2026-10-20 09:00');
    ctx.consultasService.registrarRealizada({ perfil: 'MEDICO', medicoId: carlos.id }, consulta.id);
    expect(ctx.relatoriosService.resumo({ dataInicio: '2026-10-20', dataFim: '2026-10-20' }).faturamentoCentavos).toBe(13500);
  });

  /**
   * @caso CT-INT-278
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo disponibilidade
   * @requisito RNF04
   * @objetivo Manter o relatório estável após um erro de validação
   * @resultadoEsperado Uma consulta válida seguinte funciona normalmente
   */
  test('erro de validação não afeta a próxima consulta', () => {
    expect(() => ctx.relatoriosService.resumo({ dataInicio: 'x', dataFim: 'y' })).toThrow();
    expect(ctx.relatoriosService.resumo({ dataInicio: '2026-10-19', dataFim: '2026-10-19' }).periodo.dataInicio).toBe('2026-10-19');
  });
});
