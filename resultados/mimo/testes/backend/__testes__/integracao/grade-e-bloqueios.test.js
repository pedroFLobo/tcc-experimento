/**
 * Grade de disponibilidade (RF05) e bloqueios de agenda (RF06) com as regras RN10–RN13.
 */
const clock = require('../../src/utils/clock');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');

let db;
let servicos;
let carlos;
let beatriz;
let ana;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  const dados = semear(db);
  servicos = criarServicos(db);
  [carlos, beatriz] = dados.medicos;
  [ana] = dados.pacientes;
});

afterEach(() => {
  clock.definirAgora(null);
  db.close();
});

const bloco = (diaSemana, horaInicio, horaFim) => ({ diaSemana, horaInicio, horaFim });
const recepcao = { perfil: 'RECEPCAO' };
const comoMedico = (m) => ({ perfil: 'MEDICO', medicoId: m.id });

describe('RF05 — grade semanal', () => {
  /**
   * @caso CT-INT-024
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.1, RN10
   * @objetivo Salvar a grade e devolver os blocos ordenados por dia e horário
   * @resultadoEsperado a grade lida de volta contém exatamente os blocos salvos
   */
  test('grade salva é devolvida pela consulta', () => {
    const salvos = servicos.agendaService.salvarGrade(recepcao, carlos.id, [
      bloco(3, '14:00', '18:00'),
      bloco(1, '08:00', '12:00'),
    ]);
    expect(salvos).toEqual([
      { id: expect.any(Number), diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { id: expect.any(Number), diaSemana: 3, horaInicio: '14:00', horaFim: '18:00' },
    ]);
    expect(servicos.agendaService.obterGrade(carlos.id)).toHaveLength(2);
  });

  /**
   * @caso CT-INT-025
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.2
   * @objetivo Substituir a grade anterior por inteiro ao salvar de novo
   * @resultadoEsperado após a segunda gravação resta apenas o bloco novo
   */
  test('salvar a grade substitui a anterior por inteiro', () => {
    servicos.agendaService.salvarGrade(recepcao, carlos.id, [
      bloco(1, '08:00', '12:00'),
      bloco(1, '14:00', '18:00'),
    ]);
    const depois = servicos.agendaService.salvarGrade(recepcao, carlos.id, [bloco(5, '08:00', '12:00')]);
    expect(depois).toHaveLength(1);
    expect(depois[0]).toMatchObject({ diaSemana: 5, horaInicio: '08:00', horaFim: '12:00' });
    expect(servicos.agendaService.obterGrade(carlos.id)).toHaveLength(1);
  });

  /**
   * @caso CT-INT-026
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo recuperabilidade
   * @requisito RN10, RF05.2
   * @objetivo Manter a grade anterior quando a nova grade é inválida
   * @resultadoEsperado a gravação falha com 400 e a grade salva anteriormente permanece intacta
   */
  test('grade inválida não sobrescreve a grade anterior', () => {
    servicos.agendaService.salvarGrade(recepcao, carlos.id, [bloco(1, '08:00', '12:00')]);
    let erro;
    try {
      servicos.agendaService.salvarGrade(recepcao, carlos.id, [bloco(9, '08:00', '12:00')]);
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Dia da semana deve ser um inteiro de 0 (domingo) a 6 (sábado).');
    expect(servicos.agendaService.obterGrade(carlos.id)).toEqual([
      { id: expect.any(Number), diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
    ]);
  });

  /**
   * @caso CT-INT-027
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RF05.1
   * @objetivo Permitir que cada médico salve apenas a própria grade
   * @resultadoEsperado o dono salva com sucesso e o médico de outra agenda recebe 403
   */
  test('médico gerencia somente a própria grade', () => {
    const ok = servicos.agendaService.salvarGrade(comoMedico(carlos), carlos.id, [bloco(1, '08:00', '12:00')]);
    expect(ok).toHaveLength(1);

    let negado;
    try {
      servicos.agendaService.salvarGrade(comoMedico(beatriz), carlos.id, [bloco(2, '08:00', '12:00')]);
    } catch (e) {
      negado = e;
    }
    expect(negado.status).toBe(403);
    expect(negado.codigo).toBe('SEM_PERMISSAO');
    expect(servicos.agendaService.obterGrade(carlos.id)).toHaveLength(1);
  });

  /**
   * @caso CT-INT-028
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN11
   * @objetivo Recusar grade com blocos sobrepostos no mesmo dia
   * @resultadoEsperado a gravação falha com 400 e nenhuma linha é inserida
   */
  test('grade com sobreposição não é gravada', () => {
    let erro;
    try {
      servicos.agendaService.salvarGrade(recepcao, carlos.id, [
        bloco(1, '08:00', '12:00'),
        bloco(1, '11:00', '14:00'),
      ]);
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(400);
    expect(erro.message).toContain('Blocos sobrepostos no dia 1');
    expect(servicos.agendaService.obterGrade(carlos.id)).toHaveLength(0);
  });

  /**
   * @caso CT-INT-029
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RF05.1
   * @objetivo Recusar que paciente altere a grade de um médico
   * @resultadoEsperado o ator PACIENTE recebe 403 SEM_PERMISSAO
   */
  test('paciente não altera grade de médico', () => {
    let erro;
    try {
      servicos.agendaService.salvarGrade({ perfil: 'PACIENTE', pacienteId: ana.id }, carlos.id, [bloco(1, '08:00', '12:00')]);
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(403);
  });

  /**
   * @caso CT-INT-030
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN30
   * @objetivo Devolver 404 ao consultar a grade de médico inexistente
   * @resultadoEsperado obterGrade lança erro com código NAO_ENCONTRADO
   */
  test('grade de médico inexistente devolve 404', () => {
    let erro;
    try {
      servicos.agendaService.obterGrade(99999);
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(404);
    expect(erro.codigo).toBe('NAO_ENCONTRADO');
  });
});

describe('RF06 — bloqueios de agenda', () => {
  /**
   * @caso CT-INT-031
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.1, RN12
   * @objetivo Criar bloqueio por período com motivo
   * @resultadoEsperado o bloqueio é gravado com as datas e o motivo informados
   */
  test('bloqueio válido é criado com motivo', () => {
    const bloqueio = servicos.agendaService.criarBloqueio(recepcao, carlos.id, {
      dataInicio: '2026-11-02',
      dataFim: '2026-11-06',
      motivo: '  Congresso  ',
    });
    expect(bloqueio).toMatchObject({ medicoId: carlos.id, dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Congresso' });
    expect(servicos.agendaService.listarBloqueios(recepcao, carlos.id)).toHaveLength(1);
  });

  /**
   * @caso CT-INT-032
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN12
   * @objetivo Recusar bloqueio cuja data final é anterior à inicial
   * @resultadoEsperado a criação falha com 400 VALIDACAO e nada é gravado
   */
  test('bloqueio com data final anterior é rejeitado', () => {
    let erro;
    try {
      servicos.agendaService.criarBloqueio(recepcao, carlos.id, {
        dataInicio: '2026-11-06',
        dataFim: '2026-11-02',
        motivo: 'Férias',
      });
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('A data final do bloqueio não pode ser anterior à inicial.');
    expect(servicos.agendaService.listarBloqueios(recepcao, carlos.id)).toHaveLength(0);
  });

  /**
   * @caso CT-INT-033
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN12
   * @objetivo Recusar bloqueio que começa no passado (relógio fixado em 2026-10-19)
   * @resultadoEsperado a criação falha com 422 REGRA_NEGOCIO
   */
  test('bloqueio que começa no passado é rejeitado', () => {
    let erro;
    try {
      servicos.agendaService.criarBloqueio(recepcao, carlos.id, {
        dataInicio: '2026-10-10',
        dataFim: '2026-10-15',
        motivo: 'Férias',
      });
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(422);
    expect(erro.codigo).toBe('REGRA_NEGOCIO');
    expect(erro.message).toBe('O bloqueio não pode começar no passado.');
  });

  /**
   * @caso CT-INT-034
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN13
   * @objetivo Recusar bloqueio em período com consulta ativa do médico
   * @resultadoEsperado a criação falha com 422 informando a quantidade de consultas e nada é gravado
   */
  test('bloqueio em período com consulta ativa é rejeitado', () => {
    servicos.repos.consultas.inserir({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-11-03 10:00',
      fim: '2026-11-03 10:30',
      valorCentavos: 15000,
      retornoDe: null,
      agora: '2026-10-19 08:00',
    });

    let erro;
    try {
      servicos.agendaService.criarBloqueio(recepcao, carlos.id, {
        dataInicio: '2026-11-02',
        dataFim: '2026-11-05',
        motivo: 'Férias',
      });
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Existem 1 consulta(s) agendada(s) no período. Cancele ou remarque antes de bloquear.');
    expect(servicos.agendaService.listarBloqueios(recepcao, carlos.id)).toHaveLength(0);
  });

  /**
   * @caso CT-INT-035
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN13
   * @objetivo Permitir bloqueio quando as consultas do período estão canceladas
   * @resultadoEsperado o bloqueio é criado porque consulta cancelada não é ativa
   */
  test('bloqueio é permitido quando a consulta do período está cancelada', () => {
    const id = servicos.repos.consultas.inserir({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-11-03 10:00',
      fim: '2026-11-03 10:30',
      valorCentavos: 15000,
      retornoDe: null,
      agora: '2026-10-19 08:00',
    });
    db.prepare("UPDATE consultas SET status = 'CANCELADA' WHERE id = ?").run(id);

    const bloqueio = servicos.agendaService.criarBloqueio(recepcao, carlos.id, {
      dataInicio: '2026-11-02',
      dataFim: '2026-11-05',
      motivo: 'Férias',
    });
    expect(bloqueio.id).toBeGreaterThan(0);
  });

  /**
   * @caso CT-INT-036
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.2
   * @objetivo Remover um bloqueio existente
   * @resultadoEsperado a listagem fica vazia após a remoção
   */
  test('bloqueio é removido', () => {
    const bloqueio = servicos.agendaService.criarBloqueio(recepcao, carlos.id, {
      dataInicio: '2026-11-02',
      dataFim: '2026-11-06',
      motivo: 'Férias',
    });
    servicos.agendaService.removerBloqueio(recepcao, carlos.id, bloqueio.id);
    expect(servicos.agendaService.listarBloqueios(recepcao, carlos.id)).toHaveLength(0);
  });

  /**
   * @caso CT-INT-037
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF06.2, RN30
   * @objetivo Recusar remoção de bloqueio inexistente ou de outro médico
   * @resultadoEsperado os dois casos falham com 404 NAO_ENCONTRADO
   */
  test('remover bloqueio inexistente ou de outro médico devolve 404', () => {
    const doCarlos = servicos.agendaService.criarBloqueio(recepcao, carlos.id, {
      dataInicio: '2026-11-02',
      dataFim: '2026-11-06',
      motivo: 'Férias',
    });

    let inexistente;
    try {
      servicos.agendaService.removerBloqueio(recepcao, carlos.id, 99999);
    } catch (e) {
      inexistente = e;
    }
    expect(inexistente.status).toBe(404);

    let deOutro;
    try {
      servicos.agendaService.removerBloqueio(recepcao, beatriz.id, doCarlos.id);
    } catch (e) {
      deOutro = e;
    }
    expect(deOutro.status).toBe(404);
    expect(servicos.agendaService.listarBloqueios(recepcao, carlos.id)).toHaveLength(1);
  });

  /**
   * @caso CT-INT-038
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RF06.1
   * @objetivo Permitir que o médico crie bloqueio apenas na própria agenda
   * @resultadoEsperado o dono cria o bloqueio e o outro médico recebe 403
   */
  test('médico cria bloqueio só na própria agenda', () => {
    const ok = servicos.agendaService.criarBloqueio(comoMedico(carlos), carlos.id, {
      dataInicio: '2026-11-10',
      dataFim: '2026-11-12',
      motivo: 'Férias',
    });
    expect(ok.id).toBeGreaterThan(0);

    let negado;
    try {
      servicos.agendaService.criarBloqueio(comoMedico(beatriz), carlos.id, {
        dataInicio: '2026-11-10',
        dataFim: '2026-11-12',
        motivo: 'Férias',
      });
    } catch (e) {
      negado = e;
    }
    expect(negado.status).toBe(403);
    expect(servicos.agendaService.listarBloqueios(recepcao, carlos.id)).toHaveLength(1);
  });

  /**
   * @caso CT-INT-039
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN12, RNF04
   * @objetivo Rejeitar data de bloqueio malformada com mensagem em português
   * @resultadoEsperado a criação falha com 400 e a mensagem explica o formato esperado
   */
  test('data de bloqueio malformada é rejeitada', () => {
    let erro;
    try {
      servicos.agendaService.criarBloqueio(recepcao, carlos.id, {
        dataInicio: 'amanha',
        dataFim: 'depois',
        motivo: 'Férias',
      });
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Datas do bloqueio devem estar no formato AAAA-MM-DD.');
  });
});
