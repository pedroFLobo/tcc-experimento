const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');
const clock = require('../../src/utils/clock');
const { somarDias, somarMinutos, formatarDataHora } = require('../../src/utils/datas');

describe('Integração: ConsultasService', () => {
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
   * @caso CT-INT-031
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1, RF08.2, RN22
   * @objetivo Agendar consulta para o próprio paciente e calcular o valor padrão
   * @resultadoEsperado Consulta gravada como AGENDADA com valor integral da especialidade
   */
  test('deve agendar consulta calculando valor base da especialidade', () => {
    const paciente = dados.pacientes[0]; // Ana Pereira (nascida em 1990)
    const medico = dados.medicos[0]; // Clínica Geral (R$ 150,00 -> 15000 centavos)
    const ator = { perfil: 'PACIENTE', pacienteId: paciente.id };

    const consulta = servicos.consultasService.agendar(ator, {
      pacienteId: paciente.id,
      medicoId: medico.id,
      inicio: '2026-10-20 09:00',
    });

    expect(consulta.id).toBeDefined();
    expect(consulta.status).toBe('AGENDADA');
    expect(consulta.valorCentavos).toBe(15000);
    expect(consulta.retornoDe).toBeNull();
  });

  /**
   * @caso CT-INT-032
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.2, RN23
   * @objetivo Aplicar desconto de 10% para paciente idoso (>= 60 anos)
   * @resultadoEsperado Valor gravado é 90% do preço base
   */
  test('deve calcular desconto de idoso de 10% no agendamento', () => {
    const pacienteIdoso = dados.pacientes[1]; // João Santos, nascido em 1958 (68 anos)
    const medico = dados.medicos[0]; // Clínica Geral (R$ 150,00 -> 13500 com 10%)
    const ator = { perfil: 'PACIENTE', pacienteId: pacienteIdoso.id };

    const consulta = servicos.consultasService.agendar(ator, {
      pacienteId: pacienteIdoso.id,
      medicoId: medico.id,
      inicio: '2026-10-20 09:30',
    });

    expect(consulta.valorCentavos).toBe(13500);
  });

  /**
   * @caso CT-INT-033
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.2, RN24
   * @objetivo Conceder retorno gratuito com valor zero após consulta REALIZADA no mesmo médico
   * @resultadoEsperado valorCentavos = 0 e retornoDe apontando para o id da consulta realizada
   */
  test('deve conceder retorno gratuito após consulta realizada com mesmo médico em 30 dias', () => {
    const paciente = dados.pacientes[0];
    const medico = dados.medicos[0];
    const ator = { perfil: 'RECEPCAO' };

    // Insere consulta realizada há 10 dias
    const consultaRealizadaId = servicos.repos.consultas.inserir({
      pacienteId: paciente.id,
      medicoId: medico.id,
      inicio: '2026-10-09 09:00',
      fim: '2026-10-09 09:30',
      valorCentavos: 15000,
      agora: '2026-10-09 08:00',
    });
    servicos.repos.consultas.atualizarStatus(consultaRealizadaId, 'REALIZADA', '2026-10-09 09:30');

    // Novo agendamento dentro dos 30 dias
    const nova = servicos.consultasService.agendar(ator, {
      pacienteId: paciente.id,
      medicoId: medico.id,
      inicio: '2026-10-20 10:00',
    });

    expect(nova.valorCentavos).toBe(0);
    expect(nova.retornoDe).toBe(consultaRealizadaId);
  });

  /**
   * @caso CT-INT-034
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN18
   * @objetivo Impedir paciente de agendar duas consultas no mesmo horário (conflito de agenda do paciente)
   * @resultadoEsperado Lança erro CONFLITO
   */
  test('deve impedir que o paciente tenha duas consultas ativas no mesmo horário', () => {
    const paciente = dados.pacientes[0];
    const medico1 = dados.medicos[0];
    const medico2 = dados.medicos[1]; // Dra. Beatriz (atende seg/qua/sex 09-15)
    const ator = { perfil: 'PACIENTE', pacienteId: paciente.id };

    // Primeira consulta na quarta-feira 2026-10-21 09:00
    servicos.consultasService.agendar(ator, {
      pacienteId: paciente.id,
      medicoId: medico1.id,
      inicio: '2026-10-21 09:00',
    });

    // Tentativa no mesmo horário com outro médico
    expect(() => {
      servicos.consultasService.agendar(ator, {
        pacienteId: paciente.id,
        medicoId: medico2.id,
        inicio: '2026-10-21 09:00',
      });
    }).toThrow(/já possui outra consulta neste horário/i);
  });

  /**
   * @caso CT-INT-035
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN19
   * @objetivo Bloquear agendamento ao exceder o limite de consultas por especialidade
   * @resultadoEsperado Lança erro REGRA_NEGOCIO de especialidade repetida
   */
  test('deve bloquear mais de 1 consulta ativa futura na mesma especialidade', () => {
    const paciente = dados.pacientes[0];
    const medico1 = dados.medicos[0]; // Clínica Geral
    const ator = { perfil: 'PACIENTE', pacienteId: paciente.id };

    servicos.consultasService.agendar(ator, {
      pacienteId: paciente.id,
      medicoId: medico1.id,
      inicio: '2026-10-20 09:00',
    });

    // Segunda consulta na mesma especialidade
    expect(() => {
      servicos.consultasService.agendar(ator, {
        pacienteId: paciente.id,
        medicoId: medico1.id,
        inicio: '2026-10-21 09:00',
      });
    }).toThrow(/já possui uma consulta agendada nesta especialidade/i);
  });

  /**
   * @caso CT-INT-036
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN20
   * @objetivo Bloquear agendamento de paciente com 3 ou mais faltas nos últimos 90 dias
   * @resultadoEsperado Lança erro REGRA_NEGOCIO informando suspensão por faltas
   */
  test('deve suspender agendamento de paciente com 3 faltas recentes', () => {
    const paciente = dados.pacientes[0];
    const medico = dados.medicos[0];
    const ator = { perfil: 'RECEPCAO' };

    // Insere 3 faltas
    for (const diasAtras of [30, 20, 5]) {
      const dataHora = formatarDataHora(somarDias(agoraFixo, -diasAtras));
      const id = servicos.repos.consultas.inserir({
        pacienteId: paciente.id,
        medicoId: medico.id,
        inicio: dataHora,
        fim: formatarDataHora(somarMinutos(somarDias(agoraFixo, -diasAtras), 30)),
        valorCentavos: 15000,
        agora: dataHora,
      });
      servicos.repos.consultas.atualizarStatus(id, 'FALTA', dataHora);
    }

    expect(() => {
      servicos.consultasService.agendar(ator, {
        pacienteId: paciente.id,
        medicoId: medico.id,
        inicio: '2026-10-20 11:00',
      });
    }).toThrow(/Paciente suspenso por faltas até/i);
  });

  /**
   * @caso CT-INT-037
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN21
   * @objetivo Bloquear agendamento para paciente com conta inativa
   * @resultadoEsperado Lança erro REGRA_NEGOCIO de paciente inativo
   */
  test('deve impedir agendamento para paciente inativo', () => {
    const paciente = dados.pacientes[0];
    const medico = dados.medicos[0];
    servicos.cadastroService.definirUsuarioAtivo(paciente.usuarioId, false);

    expect(() => {
      servicos.consultasService.agendar({ perfil: 'RECEPCAO' }, {
        pacienteId: paciente.id,
        medicoId: medico.id,
        inicio: '2026-10-20 11:00',
      });
    }).toThrow(/Paciente inativo não pode agendar consultas/i);
  });

  /**
   * @caso CT-INT-038
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.1, RN25
   * @objetivo Confirmar consulta agendada dentro da janela de 48 horas
   * @resultadoEsperado Status da consulta atualizado para CONFIRMADA
   */
  test('deve confirmar consulta nas 48h anteriores pelo paciente dono', () => {
    const paciente = dados.pacientes[0];
    const medico = dados.medicos[0];
    const ator = { perfil: 'PACIENTE', pacienteId: paciente.id };

    // Consulta em 24h (2026-10-20 08:00)
    const c = servicos.consultasService.agendar(ator, {
      pacienteId: paciente.id,
      medicoId: medico.id,
      inicio: '2026-10-20 08:00',
    });

    const confirmada = servicos.consultasService.confirmar(ator, c.id);
    expect(confirmada.status).toBe('CONFIRMADA');
  });

  /**
   * @caso CT-INT-039
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.2, RN26
   * @objetivo Cancelar consulta pelo paciente com mais de 24 horas de antecedência
   * @resultadoEsperado Status passa para CANCELADA e canceladoPor fica PACIENTE
   */
  test('deve cancelar consulta pelo paciente com mais de 24 horas de antecedência', () => {
    const paciente = dados.pacientes[0];
    const medico = dados.medicos[0];
    const ator = { perfil: 'PACIENTE', pacienteId: paciente.id };

    // Consulta em 48h (2026-10-21 09:00)
    const c = servicos.consultasService.agendar(ator, {
      pacienteId: paciente.id,
      medicoId: medico.id,
      inicio: '2026-10-21 09:00',
    });

    const cancelada = servicos.consultasService.cancelar(ator, c.id, {});
    expect(cancelada.status).toBe('CANCELADA');
    expect(cancelada.canceladoPor).toBe('PACIENTE');
  });

  /**
   * @caso CT-INT-040
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Consulta cancelada deve devolver o direito ao retorno gratuito
   * @resultadoEsperado Paciente pode usar novamente a consulta realizada para obter retorno
   */
  test('deve devolver direito a retorno caso consulta com retorno seja cancelada', () => {
    const paciente = dados.pacientes[0];
    const medico = dados.medicos[0];
    const ator = { perfil: 'RECEPCAO' };

    // Consulta realizada
    const cRealizadaId = servicos.repos.consultas.inserir({
      pacienteId: paciente.id,
      medicoId: medico.id,
      inicio: '2026-10-05 09:00',
      fim: '2026-10-05 09:30',
      valorCentavos: 15000,
      agora: '2026-10-05 08:00',
    });
    servicos.repos.consultas.atualizarStatus(cRealizadaId, 'REALIZADA', '2026-10-05 09:30');

    // Agenda retorno para 2026-10-20 09:00
    const retorno = servicos.consultasService.agendar(ator, {
      pacienteId: paciente.id,
      medicoId: medico.id,
      inicio: '2026-10-20 09:00',
    });
    expect(retorno.valorCentavos).toBe(0);

    // Cancela o retorno
    servicos.consultasService.cancelar(ator, retorno.id, { motivo: 'Paciente não pode ir' });

    // Novo agendamento deve ser retorno gratuito novamente
    const novoRetorno = servicos.consultasService.agendar(ator, {
      pacienteId: paciente.id,
      medicoId: medico.id,
      inicio: '2026-10-21 09:00',
    });
    expect(novoRetorno.valorCentavos).toBe(0);
    expect(novoRetorno.retornoDe).toBe(cRealizadaId);
  });

  /**
   * @caso CT-INT-041
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.3, RN27
   * @objetivo Remarcar consulta para outro horário válido recalculando valor e incrementando remarcacoes
   * @resultadoEsperado Consulta com novo horário, status AGENDADA e remarcacoes = 1
   */
  test.skip('deve remarcar consulta atualizando horário e contador de remarcações', () => {
    const paciente = dados.pacientes[0];
    const medico = dados.medicos[0];
    const ator = { perfil: 'PACIENTE', pacienteId: paciente.id };

    const c = servicos.consultasService.agendar(ator, {
      pacienteId: paciente.id,
      medicoId: medico.id,
      inicio: '2026-10-21 09:00',
    });
    servicos.consultasService.confirmar(ator, c.id);

    const remarcada = servicos.consultasService.remarcar(ator, c.id, {
      inicio: '2026-10-21 10:00',
    });

    expect(remarcada.inicio).toBe('2026-10-21 10:00');
    expect(remarcada.status).toBe('AGENDADA'); // volta para AGENDADA
    expect(remarcada.remarcacoes).toBe(1);
  });

  /**
   * @caso CT-INT-042
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.4, RN28
   * @objetivo Registrar atendimento médico realizado a partir do início da consulta
   * @resultadoEsperado Status REALIZADA e observações gravadas
   */
  test('deve registrar atendimento realizado pelo médico dono após o horário', () => {
    const paciente = dados.pacientes[0];
    const medico = dados.medicos[0];
    const cId = servicos.repos.consultas.inserir({
      pacienteId: paciente.id,
      medicoId: medico.id,
      inicio: '2026-10-19 08:00', // agora
      fim: '2026-10-19 08:30',
      valorCentavos: 15000,
      agora: '2026-10-18 08:00',
    });

    const atorMedico = { perfil: 'MEDICO', medicoId: medico.id };
    const realizada = servicos.consultasService.registrarRealizada(atorMedico, cId, {
      observacoes: 'Paciente medicado e orientado.',
    });

    expect(realizada.status).toBe('REALIZADA');
    expect(realizada.observacoes).toBe('Paciente medicado e orientado.');
  });

  /**
   * @caso CT-INT-043
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.5, RN29
   * @objetivo Registrar falta do paciente após 15 minutos do início
   * @resultadoEsperado Status FALTA registrado com sucesso
   */
  test('deve registrar falta do paciente após a tolerância de 15 minutos', () => {
    const paciente = dados.pacientes[0];
    const medico = dados.medicos[0];
    // Consulta iniciada às 07:30 (há 30 minutos em relação a 08:00)
    const cId = servicos.repos.consultas.inserir({
      pacienteId: paciente.id,
      medicoId: medico.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
      valorCentavos: 15000,
      agora: '2026-10-18 08:00',
    });

    const ator = { perfil: 'RECEPCAO' };
    const falta = servicos.consultasService.registrarFalta(ator, cId);
    expect(falta.status).toBe('FALTA');
  });

  /**
   * @caso CT-INT-044
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.1, RN30
   * @objetivo Impedir paciente de obter detalhes de consulta pertencente a outro paciente
   * @resultadoEsperado Lança erro SEM_PERMISSAO
   */
  test('deve impedir paciente de acessar consulta alheia', () => {
    const paciente1 = dados.pacientes[0];
    const paciente2 = dados.pacientes[1];
    const medico = dados.medicos[0];

    const cId = servicos.repos.consultas.inserir({
      pacienteId: paciente2.id,
      medicoId: medico.id,
      inicio: '2026-10-20 09:00',
      fim: '2026-10-20 09:30',
      valorCentavos: 15000,
      agora: '2026-10-19 08:00',
    });

    const atorPaciente1 = { perfil: 'PACIENTE', pacienteId: paciente1.id };
    expect(() => servicos.consultasService.obter(atorPaciente1, cId)).toThrow(/Você não tem acesso a esta consulta/i);
  });

  /**
   * @caso CT-INT-045
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.2
   * @objetivo Listar consultas filtradas apenas para o médico logado
   * @resultadoEsperado Lista contém apenas consultas associadas ao médico ator
   */
  test('médico lista somente consultas da própria agenda', () => {
    const p = dados.pacientes[0];
    const m1 = dados.medicos[0];
    const m2 = dados.medicos[1];

    servicos.repos.consultas.inserir({ pacienteId: p.id, medicoId: m1.id, inicio: '2026-10-20 09:00', fim: '2026-10-20 09:30', valorCentavos: 15000, agora: '2026-10-19 08:00' });
    servicos.repos.consultas.inserir({ pacienteId: p.id, medicoId: m2.id, inicio: '2026-10-20 09:00', fim: '2026-10-20 09:45', valorCentavos: 30000, agora: '2026-10-19 08:00' });

    const listaM1 = servicos.consultasService.listar({ perfil: 'MEDICO', medicoId: m1.id });
    expect(listaM1).toHaveLength(1);
    expect(listaM1[0].medicoId).toBe(m1.id);
  });
});
