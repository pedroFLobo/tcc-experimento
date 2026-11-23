// Integração: listagem de consultas com filtros e visibilidade por perfil (RF10, RN30).
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
let consultas;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  const db = abrirBanco(':memory:');
  const dados = semear(db);
  ctx = { db, ...dados, ...criarServicos(db) };
  recepcao = { perfil: 'RECEPCAO' };
  [carlos, beatriz, eduardo] = ctx.medicos;
  [ana, joao, lucas] = ctx.pacientes;
  consultas = {
    anaCarlos: ctx.consultasService.agendar(recepcao, { pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-20 09:00' }),
    joaoCarlos: ctx.consultasService.agendar(recepcao, { pacienteId: joao.id, medicoId: carlos.id, inicio: '2026-10-20 10:00' }),
    lucasEduardo: ctx.consultasService.agendar(recepcao, { pacienteId: lucas.id, medicoId: eduardo.id, inicio: '2026-10-20 13:00' }),
  };
});

afterEach(() => {
  ctx.db.close();
  clock.definirAgora(null);
});

describe('listar — recepção', () => {
  /**
   * @caso CT-INT-251
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Listar todas as consultas para a recepção
   * @resultadoEsperado A recepção vê as 3 consultas criadas
   */
  test('recepção vê todas as consultas', () => {
    expect(ctx.consultasService.listar(recepcao)).toHaveLength(3);
  });

  /**
   * @caso CT-INT-252
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Ordenar a listagem pelo horário de início
   * @resultadoEsperado Os horários aparecem em ordem crescente
   */
  test('listagem é ordenada por início', () => {
    expect(ctx.consultasService.listar(recepcao).map((c) => c.inicio)).toEqual([
      '2026-10-20 09:00',
      '2026-10-20 10:00',
      '2026-10-20 13:00',
    ]);
  });

  /**
   * @caso CT-INT-253
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Filtrar a listagem por médico
   * @resultadoEsperado Só as consultas do Carlos são devolvidas
   */
  test('recepção filtra por médico', () => {
    const lista = ctx.consultasService.listar(recepcao, { medicoId: carlos.id });
    expect(lista).toHaveLength(2);
    expect(lista.every((c) => c.medicoId === carlos.id)).toBe(true);
  });

  /**
   * @caso CT-INT-254
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Filtrar a listagem por paciente
   * @resultadoEsperado Só a consulta da Ana é devolvida
   */
  test('recepção filtra por paciente', () => {
    expect(ctx.consultasService.listar(recepcao, { pacienteId: ana.id })).toHaveLength(1);
  });

  /**
   * @caso CT-INT-255
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Filtrar a listagem por status
   * @resultadoEsperado O filtro AGENDADA devolve as 3 consultas
   */
  test('recepção filtra por status', () => {
    expect(ctx.consultasService.listar(recepcao, { status: 'AGENDADA' })).toHaveLength(3);
    expect(ctx.consultasService.listar(recepcao, { status: 'REALIZADA' })).toHaveLength(0);
  });

  /**
   * @caso CT-INT-256
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Filtrar a listagem por período
   * @resultadoEsperado O período de 2026-10-20 devolve as 3 consultas e o período vazio devolve nenhuma
   */
  test('recepção filtra por período', () => {
    expect(ctx.consultasService.listar(recepcao, { dataInicio: '2026-10-20', dataFim: '2026-10-20' })).toHaveLength(3);
    expect(ctx.consultasService.listar(recepcao, { dataInicio: '2026-10-19', dataFim: '2026-10-19' })).toEqual([]);
  });

  /**
   * @caso CT-INT-257
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Combinar filtros de médico, status e período
   * @resultadoEsperado A combinação devolve somente a consulta do Carlos em 20/10
   */
  test('recepção combina filtros', () => {
    const lista = ctx.consultasService.listar(recepcao, {
      medicoId: carlos.id,
      status: 'AGENDADA',
      dataInicio: '2026-10-20',
      dataFim: '2026-10-20',
    });
    expect(lista).toHaveLength(2);
  });

  /**
   * @caso CT-INT-258
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF10.3, RNF06
   * @objetivo Recusar status inexistente no filtro
   * @resultadoEsperado listar lança 400 VALIDACAO
   */
  test('status inválido devolve 400', () => {
    expect(() => ctx.consultasService.listar(recepcao, { status: 'PENDENTE' })).toThrow(
      expect.objectContaining({ status: 400, codigo: 'VALIDACAO', message: 'Status inválido.' }),
    );
  });

  /**
   * @caso CT-INT-259
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar data de filtro em formato inválido
   * @resultadoEsperado listar lança 400 citando AAAA-MM-DD
   */
  test('data de filtro inválida devolve 400', () => {
    expect(() => ctx.consultasService.listar(recepcao, { dataInicio: '20/10/2026' })).toThrow(
      expect.objectContaining({ status: 400, message: 'Datas do filtro devem estar no formato AAAA-MM-DD.' }),
    );
  });

  /**
   * @caso CT-INT-260
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Manter consultas canceladas na listagem da recepção
   * @resultadoEsperado A consulta cancelada aparece no filtro CANCELADA
   */
  test('canceladas continuam listadas', () => {
    ctx.consultasService.cancelar(recepcao, consultas.joaoCarlos.id, { motivo: 'Paciente desmarcou' });
    const lista = ctx.consultasService.listar(recepcao, { status: 'CANCELADA' });
    expect(lista.map((c) => c.id)).toEqual([consultas.joaoCarlos.id]);
  });
});

describe('listar — paciente', () => {
  /**
   * @caso CT-INT-261
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.1, RN30
   * @objetivo Mostrar ao paciente somente as próprias consultas
   * @resultadoEsperado Ana vê apenas a consulta dela
   */
  test('paciente vê somente as próprias consultas', () => {
    const lista = ctx.consultasService.listar({ perfil: 'PACIENTE', pacienteId: ana.id });
    expect(lista).toHaveLength(1);
    expect(lista[0].pacienteId).toBe(ana.id);
  });

  /**
   * @caso CT-INT-262
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Ignorar tentativa do paciente de filtrar por outro paciente
   * @resultadoEsperado Ana continua vendo somente a própria consulta
   */
  test('paciente não consegue espiar outro paciente', () => {
    const lista = ctx.consultasService.listar({ perfil: 'PACIENTE', pacienteId: ana.id }, { pacienteId: joao.id });
    expect(lista).toHaveLength(1);
    expect(lista[0].pacienteId).toBe(ana.id);
  });

  /**
   * @caso CT-INT-263
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.1
   * @objetivo Filtrar as próprias consultas por status
   * @resultadoEsperado O filtro AGENDADA devolve a consulta da Ana
   */
  test('paciente filtra as próprias consultas por status', () => {
    const ator = { perfil: 'PACIENTE', pacienteId: ana.id };
    expect(ctx.consultasService.listar(ator, { status: 'AGENDADA' })).toHaveLength(1);
    expect(ctx.consultasService.listar(ator, { status: 'FALTA' })).toEqual([]);
  });
});

describe('listar — médico', () => {
  /**
   * @caso CT-INT-264
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.2, RN30
   * @objetivo Mostrar ao médico somente as consultas da própria agenda
   * @resultadoEsperado Carlos vê as 2 consultas dele
   */
  test('médico vê somente a própria agenda', () => {
    const lista = ctx.consultasService.listar({ perfil: 'MEDICO', medicoId: carlos.id });
    expect(lista).toHaveLength(2);
    expect(lista.every((c) => c.medicoId === carlos.id)).toBe(true);
  });

  /**
   * @caso CT-INT-265
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Ignorar tentativa do médico de listar consultas de outro
   * @resultadoEsperado Beatriz recebe lista vazia mesmo filtrando por Carlos
   */
  test('médico não lista a agenda de outro', () => {
    expect(ctx.consultasService.listar({ perfil: 'MEDICO', medicoId: beatriz.id }, { medicoId: carlos.id })).toEqual([]);
  });
});
