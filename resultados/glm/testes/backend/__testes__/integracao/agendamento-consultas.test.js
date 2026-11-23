// Testes de integração do agendamento de consultas (RF08, RN16–RN24).
const clock = require('../../src/utils/clock');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');

let db, servicos, medicos, pacientes;
let paula, rafael, sandra;
const recepcao = { perfil: 'RECEPCAO' };
const pacienteAtor = (id) => ({ perfil: 'PACIENTE', pacienteId: id });
const capturar = (acao) => { try { return acao(); } catch (erro) { return erro; } };

beforeAll(() => {
  clock.definirAgora(new Date(2026, 9, 19, 8, 0)); // 2026-10-19 08:00, segunda-feira
  db = abrirBanco(':memory:');
  ({ medicos, pacientes } = semear(db));
  servicos = criarServicos(db);
  paula = servicos.cadastroService.registrarPaciente({
    nome: 'Paula Mendes', email: 'paula@email.com', cpf: '123.456.789-06',
    dataNascimento: '1985-03-10', telefone: '(11) 95555-1010', senha: 'Senha123',
  });
  rafael = servicos.cadastroService.registrarPaciente({
    nome: 'Rafael Nunes', email: 'rafael@email.com', cpf: '168.995.350-09',
    dataNascimento: '1975-06-20', telefone: '(11) 95555-2020', senha: 'Senha123',
  });
  sandra = servicos.cadastroService.registrarPaciente({
    nome: 'Sandra Lima', email: 'sandra@email.com', cpf: '987.654.321-00',
    dataNascimento: '1980-01-01', telefone: '(11) 95555-3030', senha: 'Senha123',
  });
});

afterAll(() => {
  clock.definirAgora(null);
  db.close();
});

// Consulta gravada direto no repositório, para estados passados (REALIZADA/FALTA)
// que o fluxo normal não permite criar com o relógio congelado no presente.
function inserirDireta({ pacienteId, medicoId, inicio, fim, status }) {
  const id = servicos.repos.consultas.inserir({
    pacienteId, medicoId, inicio, fim, valorCentavos: 15000, retornoDe: null, agora: '2026-10-19 08:00',
  });
  if (status && status !== 'AGENDADA') servicos.repos.consultas.atualizarStatus(id, status, '2026-10-19 08:00');
  return id;
}

describe('agendar — valores e retorno (RF08.1, RN22, RN23)', () => {
  /**
   * @caso CT-INT-032
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.2, RN22
   * @objetivo Gravar a consulta do adulto com o valor cheio da especialidade
   * @resultadoEsperado consulta AGENDADA com valorCentavos 30000 (Cardiologia) e retornoDe nulo
   */
  test('paciente adulto paga o valor cheio da especialidade', () => {
    const consulta = servicos.consultasService.agendar(recepcao, {
      pacienteId: paula.id, medicoId: medicos[1].id, inicio: '2026-10-21 09:45',
    });
    expect(consulta.status).toBe('AGENDADA');
    expect(consulta.valorCentavos).toBe(30000);
    expect(consulta.retornoDe).toBeNull();
  });

  /**
   * @caso CT-INT-033
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.2, RN23
   * @objetivo Aplicar 10% de desconto ao paciente com 60 anos ou mais
   * @resultadoEsperado João (68 anos) paga 27000 em vez de 30000 na Cardiologia
   */
  test('paciente idoso recebe o desconto de 10%', () => {
    const consulta = servicos.consultasService.agendar(recepcao, {
      pacienteId: pacientes[1].id, medicoId: medicos[1].id, inicio: '2026-10-21 09:00',
    });
    expect(consulta.valorCentavos).toBe(27000);
  });

  /**
   * @caso CT-INT-034
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.2, RN24
   * @objetivo Zerar o valor quando o paciente tem realizada com o médico nos últimos 30 dias
   * @resultadoEsperado consulta gravada com valorCentavos 0 e retornoDe apontando para a consulta realizada
   */
  test('retorno dentro de 30 dias é gratuito e referencia a origem', () => {
    const origem = inserirDireta({
      pacienteId: pacientes[0].id, medicoId: medicos[0].id,
      inicio: '2026-10-10 08:00', fim: '2026-10-10 08:30', status: 'REALIZADA',
    });
    const retorno = servicos.consultasService.agendar(pacienteAtor(pacientes[0].id), {
      medicoId: medicos[0].id, inicio: '2026-10-23 08:00',
    });
    expect(retorno.valorCentavos).toBe(0);
    expect(retorno.retornoDe).toBe(origem);
  });

  /**
   * @caso CT-INT-035
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24, RN23
   * @objetivo Cobrar normalmente quando a última realizada com o médico passou de 30 dias
   * @resultadoEsperado retornoDe nulo e valor de idoso (22500) calculado sobre a Dermatologia
   */
  test('realizada fora da janela de 30 dias não dá retorno', () => {
    inserirDireta({
      pacienteId: pacientes[1].id, medicoId: medicos[2].id,
      inicio: '2026-09-10 13:00', fim: '2026-09-10 13:30', status: 'REALIZADA',
    });
    const consulta = servicos.consultasService.agendar(recepcao, {
      pacienteId: pacientes[1].id, medicoId: medicos[2].id, inicio: '2026-10-22 13:00',
    });
    expect(consulta.retornoDe).toBeNull();
    expect(consulta.valorCentavos).toBe(22500);
  });

  /**
   * @caso CT-INT-036
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Usar como origem do retorno a realizada mais recente do médico
   * @resultadoEsperado retornoDe corresponde à realizada de 2026-10-15 e não à de 2026-10-01
   */
  test('origem do retorno é a realizada mais recente', () => {
    inserirDireta({
      pacienteId: paula.id, medicoId: medicos[0].id,
      inicio: '2026-10-01 08:00', fim: '2026-10-01 08:30', status: 'REALIZADA',
    });
    const recente = inserirDireta({
      pacienteId: paula.id, medicoId: medicos[0].id,
      inicio: '2026-10-15 08:00', fim: '2026-10-15 08:30', status: 'REALIZADA',
    });
    const retorno = servicos.consultasService.agendar(recepcao, {
      pacienteId: paula.id, medicoId: medicos[0].id, inicio: '2026-10-26 08:00',
    });
    expect(retorno.valorCentavos).toBe(0);
    expect(retorno.retornoDe).toBe(recente);
  });

  /**
   * @caso CT-INT-037
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN24
   * @objetivo Reaproveitar a origem do retorno quando o retorno anterior é cancelado
   * @resultadoEsperado após cancelar o retorno, o novo agendamento volta a sair gratuitamente da mesma realizada
   */
  test('cancelamento do retorno libera a origem para reuso', () => {
    const retornoAnterior = servicos.consultasService.agendar(recepcao, {
      pacienteId: paula.id, medicoId: medicos[0].id, inicio: '2026-10-27 08:00',
    });
    servicos.consultasService.cancelar(recepcao, retornoAnterior.id, { motivo: 'Paciente desistiu' });
    const novo = servicos.consultasService.agendar(recepcao, {
      pacienteId: paula.id, medicoId: medicos[0].id, inicio: '2026-10-29 08:00',
    });
    expect(novo.valorCentavos).toBe(0);
    expect(novo.retornoDe).toBe(retornoAnterior.retornoDe);
  });
});

describe('agendar — limites do paciente e da agenda (RN16, RN18–RN21)', () => {
  /**
   * @caso CT-INT-038
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN18
   * @objetivo Recusar agendamento que sobreponha outra consulta ativa do próprio paciente
   * @resultadoEsperado agendar lança CONFLITO (409) com mensagem de horário já ocupado e não grava consulta
   */
  test('recusa dois horários sobrepostos para o mesmo paciente', () => {
    const antes = servicos.repos.consultas.listar({ pacienteId: pacientes[0].id }).length;
    const erro = capturar(() => servicos.consultasService.agendar(recepcao, {
      pacienteId: pacientes[0].id, medicoId: medicos[3].id, inicio: '2026-10-23 08:00',
    }));
    expect(erro.status).toBe(409);
    expect(erro.message).toBe('O paciente já possui outra consulta neste horário.');
    expect(servicos.repos.consultas.listar({ pacienteId: pacientes[0].id }).length).toBe(antes);
  });

  /**
   * @caso CT-INT-039
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Recusar segunda consulta ativa na mesma especialidade
   * @resultadoEsperado agendar lança REGRA_NEGOCIO (422) com a mensagem da RN19
   */
  test('recusa segunda consulta ativa na mesma especialidade', () => {
    const erro = capturar(() => servicos.consultasService.agendar(recepcao, {
      pacienteId: pacientes[0].id, medicoId: medicos[0].id, inicio: '2026-10-27 08:30',
    }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('O paciente já possui uma consulta agendada nesta especialidade.');
  });

  /**
   * @caso CT-INT-040
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Recusar o quarto agendamento ativo futuro do paciente
   * @resultadoEsperado as duas consultas intermediárias são aceitas e a quarta lança REGRA_NEGOCIO (422) citando o limite de 3
   */
  test('recusa o quarto agendamento ativo do paciente', () => {
    const derma = servicos.consultasService.agendar(recepcao, {
      pacienteId: pacientes[0].id, medicoId: medicos[2].id, inicio: '2026-10-20 13:00',
    });
    expect(derma.status).toBe('AGENDADA');
    const pediatria = servicos.consultasService.agendar(recepcao, {
      pacienteId: pacientes[0].id, medicoId: medicos[3].id, inicio: '2026-10-23 07:15',
    });
    expect(pediatria.status).toBe('AGENDADA');
    const erro = capturar(() => servicos.consultasService.agendar(recepcao, {
      pacienteId: pacientes[0].id, medicoId: medicos[0].id, inicio: '2026-11-05 08:00',
    }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('O paciente já possui 3 consultas agendadas, que é o limite.');
  });

  /**
   * @caso CT-INT-041
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Impedir agendamento do paciente com 3 faltas nos últimos 90 dias
   * @resultadoEsperado agendar lança REGRA_NEGOCIO (422) informando a suspensão até 2026-11-06
   */
  test('paciente com 3 faltas fica suspenso', () => {
    for (const dia of ['2026-10-05', '2026-10-06', '2026-10-07']) {
      inserirDireta({
        pacienteId: sandra.id, medicoId: medicos[0].id,
        inicio: `${dia} 08:00`, fim: `${dia} 08:30`, status: 'FALTA',
      });
    }
    const erro = capturar(() => servicos.consultasService.agendar(recepcao, {
      pacienteId: sandra.id, medicoId: medicos[0].id, inicio: '2026-10-30 08:00',
    }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Paciente suspenso por faltas até 2026-11-06.');
  });

  /**
   * @caso CT-INT-042
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Permitir agendamento quando as faltas não somam 3 dentro da janela de 90 dias
   * @resultadoEsperado com 2 faltas recentes e 1 antiga, o agendamento é aceito normalmente
   */
  test('faltas fora da janela de 90 dias não suspendem', () => {
    inserirDireta({
      pacienteId: rafael.id, medicoId: medicos[0].id,
      inicio: '2026-10-05 08:00', fim: '2026-10-05 08:30', status: 'FALTA',
    });
    inserirDireta({
      pacienteId: rafael.id, medicoId: medicos[0].id,
      inicio: '2026-10-06 08:00', fim: '2026-10-06 08:30', status: 'FALTA',
    });
    inserirDireta({
      pacienteId: rafael.id, medicoId: medicos[0].id,
      inicio: '2026-06-01 08:00', fim: '2026-06-01 08:30', status: 'FALTA',
    });
    const consulta = servicos.consultasService.agendar(recepcao, {
      pacienteId: rafael.id, medicoId: medicos[0].id, inicio: '2026-10-28 08:00',
    });
    expect(consulta.status).toBe('AGENDADA');
    expect(consulta.valorCentavos).toBe(15000);
  });

  /**
   * @caso CT-INT-043
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Impedir agendamento para paciente com usuário inativo
   * @resultadoEsperado agendar lança REGRA_NEGOCIO (422) de paciente inativo e a reativação restaura o acesso
   */
  test('paciente inativo não pode agendar', () => {
    const usuario = servicos.repos.usuarios.buscarPorEmail('sandra@email.com');
    servicos.cadastroService.definirUsuarioAtivo(usuario.id, false);
    const erro = capturar(() => servicos.consultasService.agendar(recepcao, {
      pacienteId: sandra.id, medicoId: medicos[3].id, inicio: '2026-10-21 07:00',
    }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Paciente inativo não pode agendar consultas.');
    servicos.cadastroService.definirUsuarioAtivo(usuario.id, true);
  });

  /**
   * @caso CT-INT-044
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Impedir agendamento com médico de usuário inativo
   * @resultadoEsperado agendar lança REGRA_NEGOCIO (422) de médico inativo e a reativação restaura a agenda
   */
  test('médico inativo não recebe agendamentos', () => {
    const usuario = servicos.repos.usuarios.buscarPorEmail('carlos@clinica.com');
    servicos.cadastroService.definirUsuarioAtivo(usuario.id, false);
    const erro = capturar(() => servicos.consultasService.agendar(recepcao, {
      pacienteId: rafael.id, medicoId: medicos[0].id, inicio: '2026-11-03 08:00',
    }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Médico inativo não recebe agendamentos.');
    servicos.cadastroService.definirUsuarioAtivo(usuario.id, true);
  });
});

describe('agendar — antecedência e validação de entrada (RN16, RF08.1)', () => {
  /**
   * @caso CT-INT-045
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Recusar horário com menos de 2 horas de antecedência
   * @resultadoEsperado agendar pelo próprio paciente lança REGRA_NEGOCIO (422) com a mensagem da antecedência mínima
   */
  test('recusa horário com menos de 2 horas de antecedência', () => {
    const erro = capturar(() => servicos.consultasService.agendar(pacienteAtor(rafael.id), {
      medicoId: medicos[0].id, inicio: '2026-10-19 09:30',
    }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('A consulta deve ser agendada com no mínimo 2 horas de antecedência.');
  });

  /**
   * @caso CT-INT-046
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Aceitar exatamente o limite de 60 dias de antecedência
   * @resultadoEsperado agendamento em 2026-12-18 (60 dias depois) é gravado com sucesso
   */
  test('aceita exatamente 60 dias de antecedência', () => {
    const consulta = servicos.consultasService.agendar(recepcao, {
      pacienteId: rafael.id, medicoId: medicos[3].id, inicio: '2026-12-18 07:00',
    });
    expect(consulta.status).toBe('AGENDADA');
    expect(consulta.inicio).toBe('2026-12-18 07:00');
  });

  /**
   * @caso CT-INT-047
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Recusar horário além de 60 dias de antecedência
   * @resultadoEsperado agendar em 2026-12-19 lança REGRA_NEGOCIO (422) com a mensagem do limite máximo
   */
  test('recusa horário além de 60 dias', () => {
    const erro = capturar(() => servicos.consultasService.agendar(recepcao, {
      pacienteId: rafael.id, medicoId: medicos[3].id, inicio: '2026-12-19 08:00',
    }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('A consulta deve ser agendada com no máximo 60 dias de antecedência.');
  });

  /**
   * @caso CT-INT-048
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF08.1
   * @objetivo Tratar horário em formato inválido sem quebrar o serviço
   * @resultadoEsperado agendar lança VALIDACAO (400) pedindo o formato AAAA-MM-DD HH:mm
   */
  test('recusa horário fora do formato AAAA-MM-DD HH:mm', () => {
    const erro = capturar(() => servicos.consultasService.agendar(recepcao, {
      pacienteId: rafael.id, medicoId: medicos[0].id, inicio: '20/10/2026 08:00',
    }));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Horário inválido. Use o formato AAAA-MM-DD HH:mm.');
  });

  /**
   * @caso CT-INT-049
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF08.1
   * @objetivo Exigir o paciente quando quem agenda é a recepção
   * @resultadoEsperado agendar sem pacienteId lança VALIDACAO (400) com 'Informe o paciente.'
   */
  test('recepção sem paciente recebe erro de validação', () => {
    const erro = capturar(() => servicos.consultasService.agendar(recepcao, {
      medicoId: medicos[0].id, inicio: '2026-11-04 08:00',
    }));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Informe o paciente.');
  });

  /**
   * @caso CT-INT-050
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF08.1
   * @objetivo Tratar paciente inexistente com 404
   * @resultadoEsperado agendar com pacienteId 9999 lança NAO_ENCONTRADO (404)
   */
  test('paciente inexistente retorna 404', () => {
    const erro = capturar(() => servicos.consultasService.agendar(recepcao, {
      pacienteId: 9999, medicoId: medicos[0].id, inicio: '2026-11-04 08:00',
    }));
    expect(erro.status).toBe(404);
    expect(erro.codigo).toBe('NAO_ENCONTRADO');
  });

  /**
   * @caso CT-INT-051
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF08.1, RN30
   * @objetivo Impedir que o paciente agende em nome de outro paciente
   * @resultadoEsperado agendar informando pacienteId alheio lança SEM_PERMISSAO (403)
   */
  test('paciente não agenda para outra pessoa', () => {
    const erro = capturar(() => servicos.consultasService.agendar(pacienteAtor(pacientes[0].id), {
      pacienteId: pacientes[1].id, medicoId: medicos[0].id, inicio: '2026-11-04 08:00',
    }));
    expect(erro.status).toBe(403);
    expect(erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-INT-052
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF08.1, RN30
   * @objetivo Bloquear médicos de criar consultas, papel exclusivo do paciente e da recepção
   * @resultadoEsperado agendar com ator médico lança SEM_PERMISSAO (403) com orientação para procurar a recepção
   */
  test('médico não agendra consultas', () => {
    const erro = capturar(() => servicos.consultasService.agendar(
      { perfil: 'MEDICO', medicoId: medicos[0].id },
      { pacienteId: rafael.id, medicoId: medicos[0].id, inicio: '2026-11-04 08:00' },
    ));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Médicos não agendam consultas. Procure a recepção.');
  });
});
