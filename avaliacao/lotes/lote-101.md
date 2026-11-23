# lote-101

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 27 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0152 | CT-INT-053 | paciente confirma consulta dentro das 48 horas | passou |  |
| glm-0153 | CT-INT-054 | recusa confirmação antes da janela de 48 horas | passou |  |
| glm-0154 | CT-INT-055 | médico não confirma consultas | passou |  |
| glm-0155 | CT-INT-056 | paciente não confirma consulta alheia | passou |  |
| glm-0156 | CT-INT-057 | paciente cancela com 24 horas ou mais de antecedência | passou |  |
| glm-0157 | CT-INT-058 | paciente não cancela com menos de 24 horas | passou |  |
| glm-0158 | CT-INT-059 | recepção cancela registrando motivo e autor | passou |  |
| glm-0159 | CT-INT-060 | recepção sem motivo recebe erro e a consulta segue ativa | passou |  |
| glm-0160 | CT-INT-061 | não cancela consulta que já começou | passou |  |
| glm-0161 | CT-INT-062 | paciente remarca e a consulta volta a AGENDADA | passou |  |
| glm-0162 | CT-INT-063 | remarcação para fora da janela de retorno cobra novamente | passou |  |
| glm-0163 | CT-INT-064 | recusa a terceira remarcação | passou |  |
| glm-0164 | CT-INT-065 | recusa remarcação a menos de 24 horas | passou |  |
| glm-0165 | CT-INT-066 | não remarca consulta cancelada | passou |  |
| glm-0166 | CT-INT-067 | médico não remarca consultas | passou |  |
| glm-0167 | CT-INT-068 | médico registra atendimento com observações | passou |  |
| glm-0168 | CT-INT-069 | não realiza consulta futura | passou |  |
| glm-0169 | CT-INT-070 | outro médico não registra o atendimento | passou |  |
| glm-0170 | CT-INT-071 | recepção registra falta após a tolerância | passou |  |
| glm-0171 | CT-INT-072 | não registra falta antes de 15 minutos do início | passou |  |
| glm-0172 | CT-INT-073 | paciente não registra a própria falta | passou |  |
| glm-0173 | CT-INT-074 | paciente lista somente as próprias consultas | passou |  |
| glm-0174 | CT-INT-075 | médico lista somente as próprias consultas | passou |  |
| glm-0175 | CT-INT-076 | recepção filtra por status cancelada | passou |  |
| glm-0176 | CT-INT-077 | recepção filtra por período | passou |  |
| glm-0177 | CT-INT-078 | recusa status de filtro inválido | passou |  |
| glm-0178 | CT-INT-079 | paciente não acessa consulta alheia por id | passou |  |

## Arquivo: backend/__testes__/integracao/ciclo-vida-consultas.test.js

```js
// Testes de integração do ciclo de vida da consulta (RF09, RF10, RN25–RN30).
const clock = require('../../src/utils/clock');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');

let db, servicos, medicos, pacientes, rafael;
let cardioId, cgId, pediatriaId, passadaId;
const recepcao = { perfil: 'RECEPCAO' };
const pacienteAtor = (id) => ({ perfil: 'PACIENTE', pacienteId: id });
const medicoAtor = (id) => ({ perfil: 'MEDICO', medicoId: id });
const capturar = (acao) => { try { return acao(); } catch (erro) { return erro; } };

beforeAll(() => {
  clock.definirAgora(new Date(2026, 9, 19, 8, 0)); // 2026-10-19 08:00, segunda-feira
  db = abrirBanco(':memory:');
  ({ medicos, pacientes } = semear(db));
  servicos = criarServicos(db);
  rafael = servicos.cadastroService.registrarPaciente({
    nome: 'Rafael Nunes', email: 'rafael@email.com', cpf: '168.995.350-09',
    dataNascimento: '1975-06-20', telefone: '(11) 95555-2020', senha: 'Senha123',
  });
});

afterAll(() => {
  clock.definirAgora(null);
  db.close();
});

// Consulta gravada direto no repositório, para estados passados que o fluxo normal não cria com o relógio congelado.
function inserirDireta({ pacienteId, medicoId, inicio, fim, status }) {
  const id = servicos.repos.consultas.inserir({
    pacienteId, medicoId, inicio, fim, valorCentavos: 15000, retornoDe: null, agora: '2026-10-19 08:00',
  });
  if (status && status !== 'AGENDADA') servicos.repos.consultas.atualizarStatus(id, status, '2026-10-19 08:00');
  return id;
}

describe('confirmação (RF09, RN25, RN30)', () => {
  /**
   * @caso CT-INT-053
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Confirmar consulta agendada pelo próprio paciente dentro das 48 horas
   * @resultadoEsperado consulta sai de AGENDADA para CONFIRMADA com o horário de atualização preenchido
   */
  test('paciente confirma consulta dentro das 48 horas', () => {
    const consulta = servicos.consultasService.agendar(recepcao, {
      pacienteId: rafael.id, medicoId: medicos[1].id, inicio: '2026-10-19 10:30',
    });
    cardioId = consulta.id;
    const confirmada = servicos.consultasService.confirmar(pacienteAtor(rafael.id), cardioId);
    expect(confirmada.status).toBe('CONFIRMADA');
    expect(confirmada.atualizadoEm).toBe('2026-10-19 08:00');
  });

  /**
   * @caso CT-INT-054
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Recusar confirmação fora da janela de 48 horas
   * @resultadoEsperado confirmar consulta de 9 dias depois lança REGRA_NEGOCIO (422) e o status segue AGENDADA
   */
  test('recusa confirmação antes da janela de 48 horas', () => {
    const consulta = servicos.consultasService.agendar(recepcao, {
      pacienteId: rafael.id, medicoId: medicos[0].id, inicio: '2026-10-28 08:00',
    });
    cgId = consulta.id;
    const erro = capturar(() => servicos.consultasService.confirmar(pacienteAtor(rafael.id), cgId));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('A confirmação só é permitida nas 48 horas anteriores à consulta.');
    expect(servicos.repos.consultas.buscarPorId(cgId).status).toBe('AGENDADA');
  });

  /**
   * @caso CT-INT-055
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN25, RN30
   * @objetivo Impedir que o médico confirme consultas, papel do paciente e da recepção
   * @resultadoEsperado confirmar com ator médico lança SEM_PERMISSAO (403)
   */
  test('médico não confirma consultas', () => {
    const erro = capturar(() => servicos.consultasService.confirmar(medicoAtor(medicos[0].id), cgId));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Somente o paciente da consulta ou a recepção podem confirmar.');
  });

  /**
   * @caso CT-INT-056
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN25, RN30
   * @objetivo Impedir que um paciente confirme consulta de outro paciente
   * @resultadoEsperado confirmar com paciente não dono lança SEM_PERMISSAO (403)
   */
  test('paciente não confirma consulta alheia', () => {
    const erro = capturar(() => servicos.consultasService.confirmar(pacienteAtor(pacientes[0].id), cgId));
    expect(erro.status).toBe(403);
    expect(erro.codigo).toBe('SEM_PERMISSAO');
  });
});

describe('cancelamento (RF09, RN26, RN30)', () => {
  /**
   * @caso CT-INT-057
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Permitir o cancelamento pelo paciente com 24 horas ou mais de antecedência
   * @resultadoEsperado consulta fica CANCELADA com canceladoPor 'PACIENTE' e sem motivo obrigatório
   */
  test('paciente cancela com 24 horas ou mais de antecedência', () => {
    const consulta = servicos.consultasService.agendar(recepcao, {
      pacienteId: rafael.id, medicoId: medicos[3].id, inicio: '2026-10-21 07:00',
    });
    pediatriaId = consulta.id;
    const cancelada = servicos.consultasService.cancelar(pacienteAtor(rafael.id), pediatriaId);
    expect(cancelada.status).toBe('CANCELADA');
    expect(cancelada.canceladoPor).toBe('PACIENTE');
    expect(cancelada.motivoCancelamento).toBeNull();
  });

  /**
   * @caso CT-INT-058
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Recusar cancelamento do paciente com menos de 24 horas
   * @resultadoEsperado cancelar lança REGRA_NEGOCIO (422) orientando a procurar a recepção
   */
  test('paciente não cancela com menos de 24 horas', () => {
    const erro = capturar(() => servicos.consultasService.cancelar(pacienteAtor(rafael.id), cardioId));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('O paciente só pode cancelar com no mínimo 24 horas de antecedência. Procure a recepção.');
  });

  /**
   * @caso CT-INT-059
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF09.2, RN26
   * @objetivo Registrar o motivo e o autor quando a recepção cancela
   * @resultadoEsperado consulta CANCELADA com canceladoPor 'RECEPCAO' e o motivo informado gravado
   */
  test('recepção cancela registrando motivo e autor', () => {
    const cancelada = servicos.consultasService.cancelar(recepcao, cardioId, { motivo: 'Paciente solicitou por telefone' });
    expect(cancelada.status).toBe('CANCELADA');
    expect(cancelada.canceladoPor).toBe('RECEPCAO');
    expect(cancelada.motivoCancelamento).toBe('Paciente solicitou por telefone');
  });

  /**
   * @caso CT-INT-060
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN26
   * @objetivo Exigir motivo no cancelamento feito pela recepção
   * @resultadoEsperado cancelar sem motivo lança REGRA_NEGOCIO (422) e a consulta segue ativa
   */
  test('recepção sem motivo recebe erro e a consulta segue ativa', () => {
    const erro = capturar(() => servicos.consultasService.cancelar(recepcao, cgId));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Informe o motivo do cancelamento.');
    expect(servicos.repos.consultas.buscarPorId(cgId).status).toBe('AGENDADA');
  });

  /**
   * @caso CT-INT-061
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Impedir cancelamento de consulta cujo horário já passou
   * @resultadoEsperado cancelar lança REGRA_NEGOCIO (422) de consulta já começada
   */
  test('não cancela consulta que já começou', () => {
    passadaId = inserirDireta({
      pacienteId: rafael.id, medicoId: medicos[0].id,
      inicio: '2026-10-16 08:00', fim: '2026-10-16 08:30',
    });
    const erro = capturar(() => servicos.consultasService.cancelar(recepcao, passadaId, { motivo: 'Após o horário' }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('A consulta já começou e não pode ser cancelada.');
  });
});

describe('remarcação (RF09, RN27, RN30)', () => {
  /**
   * @caso CT-INT-062
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.3, RN27
   * @objetivo Remarcar a consulta pelo paciente voltando ao status AGENDADA
   * @resultadoEsperado nova data gravada, remarcacoes incrementado para 1 e valor recalculado
   */
  test('paciente remarca e a consulta volta a AGENDADA', () => {
    const remarcada = servicos.consultasService.remarcar(pacienteAtor(rafael.id), cgId, { inicio: '2026-10-29 08:00' });
    expect(remarcada.status).toBe('AGENDADA');
    expect(remarcada.inicio).toBe('2026-10-29 08:00');
    expect(remarcada.remarcacoes).toBe(1);
    expect(remarcada.valorCentavos).toBe(15000);
  });

  /**
   * @caso CT-INT-063
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27, RN24
   * @objetivo Recalcular o valor na remarcação, perdendo a gratuidade do retorno fora da janela
   * @resultadoEsperado retorno de 2026-10-23 remarcado para 2026-11-10 passa a custar 15000 com retornoDe nulo
   */
  test('remarcação para fora da janela de retorno cobra novamente', () => {
    const origem = inserirDireta({
      pacienteId: pacientes[0].id, medicoId: medicos[0].id,
      inicio: '2026-10-10 08:00', fim: '2026-10-10 08:30', status: 'REALIZADA',
    });
    const retorno = servicos.consultasService.agendar(recepcao, {
      pacienteId: pacientes[0].id, medicoId: medicos[0].id, inicio: '2026-10-23 08:00',
    });
    expect(retorno.valorCentavos).toBe(0);
    expect(retorno.retornoDe).toBe(origem);
    const remarcada = servicos.consultasService.remarcar(recepcao, retorno.id, { inicio: '2026-11-10 08:00' });
    expect(remarcada.status).toBe('AGENDADA');
    expect(remarcada.remarcacoes).toBe(1);
    expect(remarcada.valorCentavos).toBe(15000);
    expect(remarcada.retornoDe).toBeNull();
  });

  /**
   * @caso CT-INT-064
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Bloquear a terceira remarcação da mesma consulta
   * @resultadoEsperado segunda remarcação aceita (remarcacoes 2) e a terceira lança REGRA_NEGOCIO (422)
   */
  test('recusa a terceira remarcação', () => {
    const segunda = servicos.consultasService.remarcar(recepcao, cgId, { inicio: '2026-11-03 08:00' });
    expect(segunda.remarcacoes).toBe(2);
    const erro = capturar(() => servicos.consultasService.remarcar(recepcao, cgId, { inicio: '2026-11-04 08:00' }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Esta consulta já atingiu o limite de 2 remarcações.');
  });

  /**
   * @caso CT-INT-065
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Recusar remarcação a menos de 24 horas do início
   * @resultadoEsperado remarcar lança REGRA_NEGOCIO (422) com a mensagem do prazo
   */
  test('recusa remarcação a menos de 24 horas', () => {
    const consulta = servicos.consultasService.agendar(recepcao, {
      pacienteId: rafael.id, medicoId: medicos[1].id, inicio: '2026-10-19 11:15',
    });
    const erro = capturar(() => servicos.consultasService.remarcar(pacienteAtor(rafael.id), consulta.id, {
      inicio: '2026-10-20 11:15',
    }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('A remarcação só é permitida até 24 horas antes da consulta.');
  });

  /**
   * @caso CT-INT-066
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Impedir remarcação de consulta cancelada
   * @resultadoEsperado remarcar lança REGRA_NEGOCIO (422) de status não remarcável
   */
  test('não remarca consulta cancelada', () => {
    const erro = capturar(() => servicos.consultasService.remarcar(recepcao, cardioId, { inicio: '2026-10-21 10:30' }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Somente consultas agendadas ou confirmadas podem ser remarcadas.');
  });

  /**
   * @caso CT-INT-067
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN27, RN30
   * @objetivo Impedir que o médico remarque consultas
   * @resultadoEsperado remarcar com ator médico lança SEM_PERMISSAO (403)
   */
  test('médico não remarca consultas', () => {
    const erro = capturar(() => servicos.consultasService.remarcar(medicoAtor(medicos[0].id), cgId, { inicio: '2026-11-05 08:00' }));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Somente o paciente da consulta ou a recepção podem remarcar.');
  });
});

describe('atendimento e falta (RF09, RN28, RN29, RN30)', () => {
  /**
   * @caso CT-INT-068
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.4, RN28
   * @objetivo Registrar o atendimento pelo médico dono a partir do horário da consulta
   * @resultadoEsperado consulta fica REALIZADA com as observações informadas gravadas
   */
  test('médico registra atendimento com observações', () => {
    const realizada = servicos.consultasService.registrarRealizada(medicoAtor(medicos[0].id), passadaId, {
      observacoes: 'Paciente saudável.',
    });
    expect(realizada.status).toBe('REALIZADA');
    expect(realizada.observacoes).toBe('Paciente saudável.');
  });

  /**
   * @caso CT-INT-069
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN28
   * @objetivo Recusar registro de atendimento antes do horário da consulta
   * @resultadoEsperado registrarRealizada lança REGRA_NEGOCIO (422)
   */
  test('não realiza consulta futura', () => {
    const erro = capturar(() => servicos.consultasService.registrarRealizada(medicoAtor(medicos[0].id), cgId, {}));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('O atendimento só pode ser registrado a partir do horário da consulta.');
  });

  /**
   * @caso CT-INT-070
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN28, RN30
   * @objetivo Impedir que outro médico registre atendimento na consulta alheia
   * @resultadoEsperado registrarRealizada por médico não dono lança SEM_PERMISSAO (403)
   */
  test('outro médico não registra o atendimento', () => {
    const id = inserirDireta({
      pacienteId: rafael.id, medicoId: medicos[0].id,
      inicio: '2026-10-16 09:00', fim: '2026-10-16 09:30',
    });
    const erro = capturar(() => servicos.consultasService.registrarRealizada(medicoAtor(medicos[1].id), id, {}));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Somente o médico da consulta pode registrar o atendimento.');
  });
});

describe('falta do paciente (RN29, RN30)', () => {
  /**
   * @caso CT-INT-071
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Registrar falta após a tolerância de 15 minutos do início
   * @resultadoEsperado consulta passada fica com status FALTA ao registrar pela recepção
   */
  test('recepção registra falta após a tolerância', () => {
    const id = inserirDireta({
      pacienteId: pacientes[2].id, medicoId: medicos[3].id,
      inicio: '2026-10-16 07:00', fim: '2026-10-16 07:15',
    });
    const falta = servicos.consultasService.registrarFalta(recepcao, id);
    expect(falta.status).toBe('FALTA');
  });

  /**
   * @caso CT-INT-072
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Recusar registro de falta dentro da tolerância de 15 minutos
   * @resultadoEsperado registrarFalta em consulta futura lança REGRA_NEGOCIO (422)
   */
  test('não registra falta antes de 15 minutos do início', () => {
    const consulta = servicos.consultasService.agendar(recepcao, {
      pacienteId: pacientes[2].id, medicoId: medicos[3].id, inicio: '2026-10-20 07:00',
    });
    const erro = capturar(() => servicos.consultasService.registrarFalta(medicoAtor(medicos[3].id), consulta.id));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('A falta só pode ser registrada 15 minutos após o início da consulta.');
  });

  /**
   * @caso CT-INT-073
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN29, RN30
   * @objetivo Impedir o próprio paciente de registrar a própria falta
   * @resultadoEsperado registrarFalta com ator paciente lança SEM_PERMISSAO (403)
   */
  test('paciente não registra a própria falta', () => {
    const consulta = servicos.repos.consultas.listar({ pacienteId: pacientes[2].id, status: 'AGENDADA' })[0];
    const erro = capturar(() => servicos.consultasService.registrarFalta(pacienteAtor(pacientes[2].id), consulta.id));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Somente o médico da consulta ou a recepção podem registrar falta.');
  });
});

describe('listagem e acesso individual (RF10, RN30)', () => {
  /**
   * @caso CT-INT-074
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.1, RN30
   * @objetivo Restringir a listagem do paciente às próprias consultas
   * @resultadoEsperado listar do paciente traz só consultas com o seu pacienteId
   */
  test('paciente lista somente as próprias consultas', () => {
    const lista = servicos.consultasService.listar(pacienteAtor(pacientes[0].id));
    expect(lista).toHaveLength(2);
    expect(lista.every((c) => c.pacienteId === pacientes[0].id)).toBe(true);
  });

  /**
   * @caso CT-INT-075
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.2, RN30
   * @objetivo Restringir a listagem do médico às próprias consultas
   * @resultadoEsperado listar do médico traz só consultas com o seu medicoId
   */
  test('médico lista somente as próprias consultas', () => {
    const lista = servicos.consultasService.listar(medicoAtor(medicos[0].id));
    expect(lista.length).toBeGreaterThanOrEqual(5);
    expect(lista.every((c) => c.medicoId === medicos[0].id)).toBe(true);
  });

  /**
   * @caso CT-INT-076
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF10.3
   * @objetivo Filtrar consultas por status na visão da recepção
   * @resultadoEsperado listar com status CANCELADA traz apenas as 2 consultas canceladas do arquivo
   */
  test('recepção filtra por status cancelada', () => {
    const lista = servicos.consultasService.listar(recepcao, { status: 'CANCELADA' });
    expect(lista).toHaveLength(2);
    expect(lista.every((c) => c.status === 'CANCELADA')).toBe(true);
  });

  /**
   * @caso CT-INT-077
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF10.3
   * @objetivo Filtrar consultas por período na visão da recepção
   * @resultadoEsperado listar entre 2026-10-20 e 2026-10-31 traz apenas consultas dentro do período
   */
  test('recepção filtra por período', () => {
    const lista = servicos.consultasService.listar(recepcao, { dataInicio: '2026-10-20', dataFim: '2026-10-31' });
    expect(lista).toHaveLength(2);
    expect(lista.every((c) => c.inicio >= '2026-10-20 00:00' && c.inicio <= '2026-10-31 23:59')).toBe(true);
  });

  /**
   * @caso CT-INT-078
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF10.2
   * @objetivo Recusar filtro de status desconhecido
   * @resultadoEsperado listar lança VALIDACAO (400) com 'Status inválido.'
   */
  test('recusa status de filtro inválido', () => {
    const erro = capturar(() => servicos.consultasService.listar(recepcao, { status: 'INEXISTENTE' }));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Status inválido.');
  });

  /**
   * @caso CT-INT-079
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.1, RN30
   * @objetivo Bloquear o acesso individual de paciente a consulta alheia
   * @resultadoEsperado obter consulta de outro paciente lança SEM_PERMISSAO (403)
   */
  test('paciente não acessa consulta alheia por id', () => {
    const erro = capturar(() => servicos.consultasService.obter(pacienteAtor(pacientes[0].id), cgId));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Você não tem acesso a esta consulta.');
  });
});
```
