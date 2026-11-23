/**
 * Relatório da recepção (RF11): total por status, taxa de faltas por médico
 * e faturamento das consultas realizadas, com validação do período.
 * Relógio fixado em 2026-10-19 08:00 (segunda-feira).
 */
const clock = require('../../src/utils/clock');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');

let db;
let servicos;
let carlos;
let beatriz;
let fernanda;
let ana;
let joao;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  const dados = semear(db);
  servicos = criarServicos(db);
  [carlos, beatriz, , fernanda] = dados.medicos;
  [ana, joao] = dados.pacientes;
});

afterEach(() => {
  clock.definirAgora(null);
  db.close();
});

function inserirConsulta({ pacienteId, medicoId, inicio, fim, status, valorCentavos = 15000 }) {
  const id = servicos.repos.consultas.inserir({
    pacienteId,
    medicoId,
    inicio,
    fim,
    valorCentavos,
    retornoDe: null,
    agora: '2026-10-19 08:00',
  });
  if (status) db.prepare('UPDATE consultas SET status = ? WHERE id = ?').run(status, id);
  return id;
}

function lancar(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    return e;
  }
}

// Monta a base do relatório de outubro: 3 realizadas, 1 falta, 1 agendada e 1 cancelada.
function popularOutubro() {
  inserirConsulta({
    pacienteId: ana.id,
    medicoId: carlos.id,
    inicio: '2026-10-10 10:00',
    fim: '2026-10-10 10:30',
    status: 'REALIZADA',
    valorCentavos: 15000,
  });
  inserirConsulta({
    pacienteId: joao.id,
    medicoId: carlos.id,
    inicio: '2026-10-20 10:00',
    fim: '2026-10-20 10:30',
    status: 'REALIZADA',
    valorCentavos: 13500,
  });
  inserirConsulta({
    pacienteId: ana.id,
    medicoId: carlos.id,
    inicio: '2026-10-15 10:00',
    fim: '2026-10-15 10:30',
    status: 'FALTA',
    valorCentavos: 15000,
  });
  inserirConsulta({
    pacienteId: ana.id,
    medicoId: beatriz.id,
    inicio: '2026-10-12 09:45',
    fim: '2026-10-12 10:30',
    status: 'REALIZADA',
    valorCentavos: 30000,
  });
  inserirConsulta({
    pacienteId: joao.id,
    medicoId: fernanda.id,
    inicio: '2026-10-27 08:00',
    fim: '2026-10-27 08:15',
    status: 'AGENDADA',
    valorCentavos: 20000,
  });
  inserirConsulta({
    pacienteId: ana.id,
    medicoId: carlos.id,
    inicio: '2026-10-25 11:00',
    fim: '2026-10-25 11:30',
    status: 'CANCELADA',
    valorCentavos: 15000,
  });
}

describe('RF11.1 — total de consultas por status', () => {
  /**
   * @caso CT-INT-131
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF11.1
   * @objetivo Contar as consultas do período separadas por status
   * @resultadoEsperado o relatório devolve 3 realizadas, 1 falta, 1 agendada e 1 cancelada
   */
  test('relatório conta cada status do período', () => {
    popularOutubro();
    const relatorio = servicos.relatoriosService.resumo({ dataInicio: '2026-10-01', dataFim: '2026-10-31' });
    expect(relatorio.porStatus.REALIZADA).toBe(3);
    expect(relatorio.porStatus.FALTA).toBe(1);
    expect(relatorio.porStatus.AGENDADA).toBe(1);
    expect(relatorio.porStatus.CANCELADA).toBe(1);
  });

  /**
   * @caso CT-INT-132
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF11.1
   * @objetivo Devolver todos os status mesmo quando algum deles não tem consulta
   * @resultadoEsperado o status CONFIRMADA aparece com valor zero
   */
  test('status sem consulta aparece zerado', () => {
    popularOutubro();
    const relatorio = servicos.relatoriosService.resumo({ dataInicio: '2026-10-01', dataFim: '2026-10-31' });
    expect(relatorio.porStatus.CONFIRMADA).toBe(0);
    expect(Object.keys(relatorio.porStatus)).toHaveLength(5);
  });

  /**
   * @caso CT-INT-133
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF11.1
   * @objetivo Excluir do relatório as consultas fora do período pedido
   * @resultadoEsperado a consulta de novembro não aparece em nenhum total
   */
  test('consulta fora do período fica fora do relatório', () => {
    popularOutubro();
    inserirConsulta({
      pacienteId: ana.id,
      medicoId: fernanda.id,
      inicio: '2026-11-10 08:00',
      fim: '2026-11-10 08:15',
      status: 'REALIZADA',
      valorCentavos: 99999,
    });

    const relatorio = servicos.relatoriosService.resumo({ dataInicio: '2026-10-01', dataFim: '2026-10-31' });
    expect(relatorio.porStatus.REALIZADA).toBe(3);
    expect(relatorio.faturamentoCentavos).toBe(58500);
  });

  /**
   * @caso CT-INT-134
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF11.1
   * @objetivo Devolver o período exato que foi solicitado
   * @resultadoEsperado o objeto ecoa as datas de início e fim informadas
   */
  test('relatório devolve o período pedido', () => {
    const relatorio = servicos.relatoriosService.resumo({ dataInicio: '2026-10-01', dataFim: '2026-10-31' });
    expect(relatorio.periodo).toEqual({ dataInicio: '2026-10-01', dataFim: '2026-10-31' });
  });
});

describe('RF11.1 — taxa de faltas por médico', () => {
  /**
   * @caso CT-INT-135
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Calcular a taxa de faltas de cada médico no período
   * @resultadoEsperado o médico com 1 falta em 3 encerradas aparece com 33.3 por cento
   */
  test('taxa de faltas usa faltas sobre consultas encerradas', () => {
    popularOutubro();
    const relatorio = servicos.relatoriosService.resumo({ dataInicio: '2026-10-01', dataFim: '2026-10-31' });
    const carlosInfo = relatorio.faltasPorMedico.find((m) => m.medicoId === carlos.id);
    expect(carlosInfo.faltas).toBe(1);
    expect(carlosInfo.encerradas).toBe(3);
    expect(carlosInfo.taxaFaltas).toBe(33.3);
    expect(carlosInfo.medicoNome).toBe('Dr. Carlos Almeida');
  });

  /**
   * @caso CT-INT-136
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Devolver taxa zero para o médico sem faltas no período
   * @resultadoEsperado o médico com apenas consultas realizadas aparece com taxa 0
   */
  test('médico sem faltas tem taxa zero', () => {
    popularOutubro();
    const relatorio = servicos.relatoriosService.resumo({ dataInicio: '2026-10-01', dataFim: '2026-10-31' });
    const beatrizInfo = relatorio.faltasPorMedico.find((m) => m.medicoId === beatriz.id);
    expect(beatrizInfo.faltas).toBe(0);
    expect(beatrizInfo.encerradas).toBe(1);
    expect(beatrizInfo.taxaFaltas).toBe(0);
  });

  /**
   * @caso CT-INT-137
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Zerar a taxa quando o médico só tem consultas que não encerraram
   * @resultadoEsperado o médico com apenas consulta agendada aparece com taxa 0
   */
  test('médico sem consulta encerrada tem taxa zero', () => {
    popularOutubro();
    const relatorio = servicos.relatoriosService.resumo({ dataInicio: '2026-10-01', dataFim: '2026-10-31' });
    const fernandaInfo = relatorio.faltasPorMedico.find((m) => m.medicoId === fernanda.id);
    expect(fernandaInfo.encerradas).toBe(0);
    expect(fernandaInfo.taxaFaltas).toBe(0);
  });

  /**
   * @caso CT-INT-138
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF11.1
   * @objetivo Listar apenas os médicos que têm consulta no período
   * @resultadoEsperado o relatório não traz médico sem nenhuma consulta no período
   */
  test('relatório omite médico sem consultas no período', () => {
    popularOutubro();
    const relatorio = servicos.relatoriosService.resumo({ dataInicio: '2026-10-01', dataFim: '2026-10-31' });
    expect(relatorio.faltasPorMedico.map((m) => m.medicoId).sort()).toEqual(
      [carlos.id, beatriz.id, fernanda.id].sort(),
    );
  });
});

describe('RF11.1 — faturamento das consultas realizadas', () => {
  /**
   * @caso CT-INT-139
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Somar o valor apenas das consultas realizadas dentro do período
   * @resultadoEsperado o faturamento é a soma das três realizadas de outubro
   */
  test('faturamento soma as realizadas do período', () => {
    popularOutubro();
    const relatorio = servicos.relatoriosService.resumo({ dataInicio: '2026-10-01', dataFim: '2026-10-31' });
    expect(relatorio.faturamentoCentavos).toBe(15000 + 13500 + 30000);
  });

  /**
   * @caso CT-INT-140
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF11.1
   * @objetivo Excluir do faturamento as consultas canceladas, com falta ou pendentes
   * @resultadoEsperado os valores de cancelada, falta e agendada não entram na soma
   */
  test('faturamento ignora consulta cancelada, com falta e agendada', () => {
    popularOutubro();
    const relatorio = servicos.relatoriosService.resumo({ dataInicio: '2026-10-01', dataFim: '2026-10-31' });
    expect(relatorio.faturamentoCentavos).toBe(58500);
  });

  /**
   * @caso CT-INT-141
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF11.1
   * @objetivo Devolver zero quando o período não tem nenhuma consulta
   * @resultadoEsperado todos os totais do relatório vêm zerados
   */
  test('período sem consultas devolve tudo zerado', () => {
    const relatorio = servicos.relatoriosService.resumo({ dataInicio: '2026-12-01', dataFim: '2026-12-31' });
    expect(relatorio.porStatus.REALIZADA).toBe(0);
    expect(relatorio.faturamentoCentavos).toBe(0);
    expect(relatorio.faltasPorMedico).toEqual([]);
  });
});

describe('RF11.1 — validação do período do relatório', () => {
  /**
   * @caso CT-INT-142
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF11.1, RNF04
   * @objetivo Rejeitar relatório sem as datas do período
   * @resultadoEsperado a chamada falha com 400 VALIDACAO pedindo dataInicio e dataFim
   */
  test('relatório sem datas é rejeitado', () => {
    const erro = lancar(() => servicos.relatoriosService.resumo({}));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Informe dataInicio e dataFim no formato AAAA-MM-DD.');
  });

  /**
   * @caso CT-INT-143
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF11.1, RNF04
   * @objetivo Rejeitar data fora do formato AAAA-MM-DD
   * @resultadoEsperado a chamada falha com 400 VALIDACAO pedindo o formato de data
   */
  test('relatório com data malformada é rejeitado', () => {
    const erro = lancar(() => servicos.relatoriosService.resumo({ dataInicio: '01/10/2026', dataFim: '2026-10-31' }));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Informe dataInicio e dataFim no formato AAAA-MM-DD.');
  });

  /**
   * @caso CT-INT-144
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF11.1, RNF04
   * @objetivo Rejeitar período cuja data final é anterior à inicial
   * @resultadoEsperado a chamada falha com 400 VALIDACAO explicando a inversão
   */
  test('período invertido é rejeitado', () => {
    const erro = lancar(() => servicos.relatoriosService.resumo({ dataInicio: '2026-10-31', dataFim: '2026-10-01' }));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('dataFim não pode ser anterior a dataInicio.');
  });

  /**
   * @caso CT-INT-145
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF11.1, RNF04
   * @objetivo Aceitar período de um único dia
   * @resultadoEsperado o relatório é devolvido para o dia informado
   */
  test('período de um único dia é aceito', () => {
    popularOutubro();
    const relatorio = servicos.relatoriosService.resumo({ dataInicio: '2026-10-10', dataFim: '2026-10-10' });
    expect(relatorio.porStatus.REALIZADA).toBe(1);
    expect(relatorio.faturamentoCentavos).toBe(15000);
  });
});
