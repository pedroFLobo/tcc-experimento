const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');
const clock = require('../../src/utils/clock');

describe('Integração: AgendaService', () => {
  let db;
  let servicos;
  let dados;
  const agoraFixo = new Date('2026-10-19T08:00:00'); // Segunda-feira

  beforeEach(() => {
    clock.definirAgora(agoraFixo);
    db = abrirBanco(':memory:');
    dados = semear(db);
    servicos = criarServicos(db);
  });

  afterEach(() => {
    clock.definirAgora(null);
    db.close();
  });

  /**
   * @caso CT-INT-021
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.1, RF05.2
   * @objetivo Salvar grade semanal substituindo inteiramente a grade anterior
   * @resultadoEsperado A nova grade reflete exatamente os blocos enviados
   */
  test('deve substituir por completo a grade anterior do médico', () => {
    const medico = dados.medicos[0];
    const atorMedico = { perfil: 'MEDICO', medicoId: medico.id };

    const novaGrade = [
      { diaSemana: 1, horaInicio: '09:00', horaFim: '13:00' },
      { diaSemana: 3, horaInicio: '14:00', horaFim: '18:00' },
    ];

    const resultado = servicos.agendaService.salvarGrade(atorMedico, medico.id, novaGrade);
    expect(resultado).toHaveLength(2);
    expect(resultado[0].horaInicio).toBe('09:00');

    const gradeSalva = servicos.agendaService.obterGrade(medico.id);
    expect(gradeSalva).toHaveLength(2);
  });

  /**
   * @caso CT-INT-022
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RF05.1
   * @objetivo Impedir médico de alterar grade de outro médico
   * @resultadoEsperado Lança erro SEM_PERMISSAO
   */
  test('deve proibir médico de alterar a grade de outro médico', () => {
    const medico1 = dados.medicos[0];
    const medico2 = dados.medicos[1];
    const atorMedico1 = { perfil: 'MEDICO', medicoId: medico1.id };

    expect(() => {
      servicos.agendaService.salvarGrade(atorMedico1, medico2.id, [
        { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      ]);
    }).toThrow(/Você só pode gerenciar a sua própria agenda/i);
  });

  /**
   * @caso CT-INT-023
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.1
   * @objetivo Permitir que a recepção salve a grade de qualquer médico
   * @resultadoEsperado Grade atualizada com sucesso pelo ator RECEPCAO
   */
  test('deve permitir que a recepção salve grade para qualquer médico', () => {
    const medico = dados.medicos[0];
    const atorRecepcao = { perfil: 'RECEPCAO' };

    const blocos = [{ diaSemana: 2, horaInicio: '10:00', horaFim: '14:00' }];
    const resultado = servicos.agendaService.salvarGrade(atorRecepcao, medico.id, blocos);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].horaInicio).toBe('10:00');
  });

  /**
   * @caso CT-INT-024
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.1, RN12
   * @objetivo Criar bloqueio de agenda por período de datas futuras
   * @resultadoEsperado Bloqueio inserido e retornado com id e datas
   */
  test('deve criar bloqueio de agenda válido com motivo', () => {
    const medico = dados.medicos[0];
    const atorMedico = { perfil: 'MEDICO', medicoId: medico.id };

    const bloqueio = servicos.agendaService.criarBloqueio(atorMedico, medico.id, {
      dataInicio: '2026-11-01',
      dataFim: '2026-11-15',
      motivo: 'Férias coletivas',
    });

    expect(bloqueio.id).toBeDefined();
    expect(bloqueio.motivo).toBe('Férias coletivas');

    const lista = servicos.agendaService.listarBloqueios(atorMedico, medico.id);
    expect(lista.some((b) => b.id === bloqueio.id)).toBe(true);
  });

  /**
   * @caso CT-INT-025
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN12
   * @objetivo Impedir criação de bloqueio que se inicia no passado
   * @resultadoEsperado Lança erro REGRA_NEGOCIO informando que bloqueio não pode começar no passado
   */
  test('deve rejeitar bloqueio que inicia no passado', () => {
    const medico = dados.medicos[0];
    const ator = { perfil: 'RECEPCAO' };

    expect(() => {
      servicos.agendaService.criarBloqueio(ator, medico.id, {
        dataInicio: '2026-10-18', // ontem em relação a 2026-10-19
        dataFim: '2026-10-25',
        motivo: 'Folga',
      });
    }).toThrow(/não pode começar no passado/i);
  });

  /**
   * @caso CT-INT-026
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN13
   * @objetivo Impedir criação de bloqueio em período que contenha consulta ativa do médico
   * @resultadoEsperado Lança erro REGRA_NEGOCIO indicando existência de consulta agendada
   */
  test('deve rejeitar bloqueio em período que contenha consulta ativa', () => {
    const medico = dados.medicos[0];
    const paciente = dados.pacientes[0];

    // Cria consulta ativa em 2026-10-20 (terça-feira) às 09:00
    servicos.repos.consultas.inserir({
      pacienteId: paciente.id,
      medicoId: medico.id,
      inicio: '2026-10-20 09:00',
      fim: '2026-10-20 09:30',
      valorCentavos: 15000,
      agora: '2026-10-19 08:00',
    });

    const ator = { perfil: 'RECEPCAO' };
    expect(() => {
      servicos.agendaService.criarBloqueio(ator, medico.id, {
        dataInicio: '2026-10-20',
        dataFim: '2026-10-22',
        motivo: 'Congresso',
      });
    }).toThrow(/consulta\(s\) agendada\(s\) no período/i);
  });

  /**
   * @caso CT-INT-027
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.2
   * @objetivo Remover bloqueio de agenda existente
   * @resultadoEsperado Bloqueio deixa de existir na listagem
   */
  test('deve remover bloqueio com sucesso', () => {
    const medico = dados.medicos[0];
    const ator = { perfil: 'RECEPCAO' };
    const b = servicos.agendaService.criarBloqueio(ator, medico.id, {
      dataInicio: '2026-11-20',
      dataFim: '2026-11-22',
      motivo: 'Folga pontual',
    });

    servicos.agendaService.removerBloqueio(ator, medico.id, b.id);
    const lista = servicos.agendaService.listarBloqueios(ator, medico.id);
    expect(lista.some((item) => item.id === b.id)).toBe(false);
  });

  /**
   * @caso CT-INT-028
   * @nivel integracao
   * @atributo eficiencia-de-desempenho
   * @subatributo comportamento-no-tempo
   * @requisito RF07.1, RNF05
   * @objetivo Listar horários livres respeitando a grade semanal em menos de 500 ms
   * @resultadoEsperado Retorna horários válidos e tempo de execução inferior a 500ms
   */
  test('deve listar horários livres respeitando grade e antecedência em menos de 500ms', () => {
    const inicioExec = Date.now();
    const medico = dados.medicos[0]; // Dr Carlos, seg-sex 08-12 e 14-18
    // Hoje é 2026-10-19 08:00. Antecedência mínima de 2 horas exclui 08:00, 08:30, 09:00, 09:30.
    // Primeiro horário livre de hoje deve ser a partir das 10:00
    const horarios = servicos.agendaService.horariosLivres(medico.id, '2026-10-19');
    const duracao = Date.now() - inicioExec;

    expect(duracao).toBeLessThan(500);
    expect(horarios).toContain('2026-10-19 10:00');
    expect(horarios).not.toContain('2026-10-19 08:00');
    expect(horarios).not.toContain('2026-10-19 09:30');
  });

  /**
   * @caso CT-INT-029
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1, RN15
   * @objetivo Omitir horários que já estejam ocupados por consulta ativa ou dentro de bloqueio
   * @resultadoEsperado Horário ocupado não aparece na lista de livres
   */
  test('deve omitir horários já ocupados por consulta ativa', () => {
    const medico = dados.medicos[0];
    const paciente = dados.pacientes[0];

    // Ocupa 2026-10-20 10:00
    servicos.repos.consultas.inserir({
      pacienteId: paciente.id,
      medicoId: medico.id,
      inicio: '2026-10-20 10:00',
      fim: '2026-10-20 10:30',
      valorCentavos: 15000,
      agora: '2026-10-19 08:00',
    });

    const horarios = servicos.agendaService.horariosLivres(medico.id, '2026-10-20');
    expect(horarios).not.toContain('2026-10-20 10:00');
    expect(horarios).toContain('2026-10-20 10:30');
  });

  /**
   * @caso CT-INT-030
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN21
   * @objetivo Retornar lista vazia de horários livres quando o médico estiver inativo
   * @resultadoEsperado Array vazio
   */
  test('médico inativo não deve fornecer horários livres', () => {
    const medico = dados.medicos[0];
    servicos.cadastroService.definirUsuarioAtivo(medico.usuarioId, false);

    const horarios = servicos.agendaService.horariosLivres(medico.id, '2026-10-20');
    expect(horarios).toEqual([]);
  });
});
