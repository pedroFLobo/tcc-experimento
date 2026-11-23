// Testes de integração da grade, bloqueios e horários livres (RF05–RF07, RN10–RN15, RN21).
const clock = require('../../src/utils/clock');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');

let db, servicos, medicos, pacientes;
const recepcao = { perfil: 'RECEPCAO' };
const capturar = (acao) => { try { return acao(); } catch (erro) { return erro; } };

beforeAll(() => {
  clock.definirAgora(new Date(2026, 9, 19, 8, 0)); // 2026-10-19 08:00, segunda-feira
  db = abrirBanco(':memory:');
  ({ medicos, pacientes } = semear(db));
  servicos = criarServicos(db);
});

afterAll(() => {
  clock.definirAgora(null);
  db.close();
});

describe('grade semanal (RF05, RN10, RN11)', () => {
  /**
   * @caso CT-INT-015
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.2, RN10
   * @objetivo Substituir a grade anterior por inteiro ao salvar novamente
   * @resultadoEsperado após a segunda gravação restam apenas os 2 blocos novos
   */
  test('salvar a grade substitui a grade anterior', () => {
    const medico = medicos[0];
    servicos.agendaService.salvarGrade(recepcao, medico.id, [{ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' }]);
    const nova = servicos.agendaService.salvarGrade(recepcao, medico.id, [
      { diaSemana: 2, horaInicio: '08:00', horaFim: '10:00' },
      { diaSemana: 3, horaInicio: '08:00', horaFim: '10:00' },
    ]);
    expect(nova).toHaveLength(2);
    expect(nova.map((b) => b.diaSemana)).toEqual([2, 3]);
    expect(servicos.repos.medicos.listarDisponibilidades(medico.id)).toHaveLength(2);
  });

  /**
   * @caso CT-INT-016
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo recuperabilidade
   * @requisito RN10, RN11
   * @objetivo Manter a grade anterior intacta quando a nova grade é inválida
   * @resultadoEsperado salvarGrade lança VALIDACAO para blocos sobrepostos e a grade segue com 2 blocos
   */
  test('grade inválida não apaga a grade atual', () => {
    const medico = medicos[0];
    const erro = capturar(() => servicos.agendaService.salvarGrade(recepcao, medico.id, [
      { diaSemana: 2, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 2, horaInicio: '11:00', horaFim: '14:00' },
    ]));
    expect(erro.status).toBe(400);
    expect(erro.message).toContain('sobrepostos');
    expect(servicos.repos.medicos.listarDisponibilidades(medico.id)).toHaveLength(2);
  });

  /**
   * @caso CT-INT-017
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir que um médico salve a grade de outro médico
   * @resultadoEsperado salvarGrade lança SEM_PERMISSAO (403) quando o dono não corresponde
   */
  test('médico não altera a grade de colega', () => {
    const outro = { perfil: 'MEDICO', medicoId: medicos[1].id };
    const erro = capturar(() => servicos.agendaService.salvarGrade(outro, medicos[0].id, []));
    expect(erro.status).toBe(403);
    expect(erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-INT-018
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF05.1
   * @objetivo Permitir que a recepção salve a grade de qualquer médico
   * @resultadoEsperado salvarGrade da recepção retorna a nova grade do médico escolhido
   */
  test('recepção salva grade de qualquer médico', () => {
    const nova = servicos.agendaService.salvarGrade(recepcao, medicos[1].id, [{ diaSemana: 5, horaInicio: '09:00', horaFim: '15:00' }]);
    expect(nova).toHaveLength(1);
    expect(nova[0].diaSemana).toBe(5);
  });
});

describe('bloqueios (RF06, RN12, RN13)', () => {
  /**
   * @caso CT-INT-019
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.1, RN12
   * @objetivo Criar bloqueio por período de datas com motivo
   * @resultadoEsperado criarBloqueio retorna o bloqueio gravado com motivo 'Férias'
   */
  test('cria bloqueio com período e motivo', () => {
    const bloqueio = servicos.agendaService.criarBloqueio(recepcao, medicos[0].id, {
      dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Férias',
    });
    expect(bloqueio.id).toBeGreaterThan(0);
    expect(bloqueio.motivo).toBe('Férias');
    expect(bloqueio.dataFim).toBe('2026-11-06');
  });

  /**
   * @caso CT-INT-020
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN12
   * @objetivo Recusar bloqueio cuja data final é anterior à inicial
   * @resultadoEsperado criarBloqueio lança VALIDACAO (400)
   */
  test('recusa período invertido', () => {
    const erro = capturar(() => servicos.agendaService.criarBloqueio(recepcao, medicos[0].id, {
      dataInicio: '2026-11-10', dataFim: '2026-11-05', motivo: 'Invertido',
    }));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('A data final do bloqueio não pode ser anterior à inicial.');
  });

  /**
   * @caso CT-INT-021
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN12
   * @objetivo Recusar bloqueio que começa no passado
   * @resultadoEsperado criarBloqueio lança REGRA_NEGOCIO (422) para início em 2026-10-18
   */
  test('recusa bloqueio começando no passado', () => {
    const erro = capturar(() => servicos.agendaService.criarBloqueio(recepcao, medicos[0].id, {
      dataInicio: '2026-10-18', dataFim: '2026-10-20', motivo: 'Passado',
    }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('O bloqueio não pode começar no passado.');
  });

  /**
   * @caso CT-INT-022
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN13
   * @objetivo Recusar bloqueio em período que já tenha consulta ativa do médico
   * @resultadoEsperado criarBloqueio lança REGRA_NEGOCIO (422) citando a quantidade de consultas e não grava o bloqueio
   */
  test('recusa bloqueio sobre consulta ativa', () => {
    const medico = medicos[0];
    servicos.consultasService.agendar({ perfil: 'PACIENTE', pacienteId: pacientes[0].id }, {
      medicoId: medico.id, inicio: '2026-10-21 08:00',
    });
    const erro = capturar(() => servicos.agendaService.criarBloqueio(recepcao, medico.id, {
      dataInicio: '2026-10-20', dataFim: '2026-10-22', motivo: 'Congresso',
    }));
    expect(erro.status).toBe(422);
    expect(erro.message).toContain('1 consulta');
    expect(servicos.repos.medicos.listarBloqueios(medico.id).some((b) => b.motivo === 'Congresso')).toBe(false);
  });

  /**
   * @caso CT-INT-023
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.2
   * @objetivo Remover um bloqueio existente
   * @resultadoEsperado removerBloqueio apaga o registro e buscarBloqueio passa a retornar null
   */
  test('remove bloqueio existente', () => {
    const medico = medicos[0];
    const bloqueio = servicos.agendaService.criarBloqueio(recepcao, medico.id, {
      dataInicio: '2026-12-01', dataFim: '2026-12-02', motivo: 'Folga',
    });
    servicos.agendaService.removerBloqueio(recepcao, medico.id, bloqueio.id);
    expect(servicos.repos.medicos.buscarBloqueio(bloqueio.id)).toBeNull();
  });

  /**
   * @caso CT-INT-024
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF06.2, RN30
   * @objetivo Recusar remoção de bloqueio inexistente com 404
   * @resultadoEsperado removerBloqueio lança NAO_ENCONTRADO (404) para id 9999
   */
  test('recusa remover bloqueio inexistente', () => {
    const erro = capturar(() => servicos.agendaService.removerBloqueio(recepcao, medicos[0].id, 9999));
    expect(erro.status).toBe(404);
    expect(erro.codigo).toBe('NAO_ENCONTRADO');
  });
});

describe('horários livres (RF07, RN14, RN15, RN21)', () => {
  /**
   * @caso CT-INT-025
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1, RN14
   * @objetivo Gerar horários do dia a partir da grade em passos da duração do médico
   * @resultadoEsperado horariosLivres retorna 16 slots para Carlos na terça 2026-10-20, do 08:00 ao 17:30
   */
  test('gera os slots do dia pela grade e duração', () => {
    const horarios = servicos.agendaService.horariosLivres(medicos[0].id, '2026-10-20');
    expect(horarios).toHaveLength(16);
    expect(horarios[0]).toBe('2026-10-20 08:00');
    expect(horarios[15]).toBe('2026-10-20 17:30');
  });

  /**
   * @caso CT-INT-026
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Excluir das horas livres o horário já ocupado por consulta ativa
   * @resultadoEsperado após agendar às 08:00, o slot de 08:00 some e os demais permanecem
   */
  test('exclui horário ocupado por consulta ativa', () => {
    const medico = medicos[0];
    servicos.consultasService.agendar({ perfil: 'PACIENTE', pacienteId: pacientes[1].id }, {
      medicoId: medico.id, inicio: '2026-10-22 08:00',
    });
    const horarios = servicos.agendaService.horariosLivres(medico.id, '2026-10-22');
    expect(horarios).toHaveLength(15);
    expect(horarios).not.toContain('2026-10-22 08:00');
    expect(horarios).toContain('2026-10-22 08:30');
  });

  /**
   * @caso CT-INT-027
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15, RN12
   * @objetivo Retornar nenhum horário nas datas dentro de um bloqueio
   * @resultadoEsperado horariosLivres retorna [] dentro do período bloqueado
   */
  test('não gera horários em data bloqueada', () => {
    const medico = medicos[0];
    servicos.agendaService.criarBloqueio(recepcao, medico.id, {
      dataInicio: '2026-10-27', dataFim: '2026-10-28', motivo: 'Manutenção',
    });
    expect(servicos.agendaService.horariosLivres(medico.id, '2026-10-27')).toEqual([]);
    expect(servicos.agendaService.horariosLivres(medico.id, '2026-10-28')).toEqual([]);
  });

  /**
   * @caso CT-INT-028
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15, RN16
   * @objetivo Excluir horários sem a antecedência mínima de 2 horas
   * @resultadoEsperado para Beatriz hoje (09:00 e 09:45 estão a menos de 2h), o primeiro slot livre é 10:30
   */
  test('exclui horários sem antecedência mínima', () => {
    const horarios = servicos.agendaService.horariosLivres(medicos[1].id, '2026-10-19');
    expect(horarios[0]).toBe('2026-10-19 10:30');
    expect(horarios).not.toContain('2026-10-19 09:00');
    expect(horarios).not.toContain('2026-10-19 09:45');
  });

  /**
   * @caso CT-INT-029
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Não gerar horários de médico inativo
   * @resultadoEsperado horariosLivres retorna [] com o usuário do médico desativado e volta ao normal após reativação
   */
  test('médico inativo não oferece horários', () => {
    const medico = medicos[0];
    const usuario = servicos.repos.usuarios.buscarPorEmail('carlos@clinica.com');
    servicos.cadastroService.definirUsuarioAtivo(usuario.id, false);
    expect(servicos.agendaService.horariosLivres(medico.id, '2026-10-20')).toEqual([]);
    servicos.cadastroService.definirUsuarioAtivo(usuario.id, true);
    expect(servicos.agendaService.horariosLivres(medico.id, '2026-10-20')).toHaveLength(16);
  });

  /**
   * @caso CT-INT-030
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF07.1
   * @objetivo Retornar lista vazia em dia sem blocos na grade do médico
   * @resultadoEsperado horariosLivres retorna [] no domingo 2026-10-25 para Carlos (grade seg–sex)
   */
  test('domingo sem grade não gera horários', () => {
    expect(servicos.agendaService.horariosLivres(medicos[0].id, '2026-10-25')).toEqual([]);
  });

  /**
   * @caso CT-INT-031
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF07.1
   * @objetivo Recusar data de consulta fora do formato AAAA-MM-DD
   * @resultadoEsperado horariosLivres lança VALIDACAO (400) com mensagem orientando o formato
   */
  test('recusa data inválida', () => {
    const erro = capturar(() => servicos.agendaService.horariosLivres(medicos[0].id, '31/10/2026'));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Data inválida. Use o formato AAAA-MM-DD.');
  });
});
