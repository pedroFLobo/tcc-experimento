# lote-135

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 13 casos listados na tabela** (parte 2 de 2). Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0216 | CT-INT-118 | paciente obtém a própria consulta | passou |  |
| mimo-0217 | CT-INT-119 | paciente não obtém consulta de outro paciente | passou |  |
| mimo-0218 | CT-INT-120 | médico obtém consulta da própria agenda | passou |  |
| mimo-0219 | CT-INT-121 | médico não obtém consulta de outro médico | passou |  |
| mimo-0220 | CT-INT-122 | recepção obtém qualquer consulta | passou |  |
| mimo-0221 | CT-INT-123 | obter consulta inexistente devolve 404 | passou |  |
| mimo-0222 | CT-INT-124 | listagem do paciente devolve só as consultas dele | passou |  |
| mimo-0223 | CT-INT-125 | listagem do médico devolve só as consultas da agenda dele | passou |  |
| mimo-0224 | CT-INT-126 | recepção filtra a listagem por status | passou |  |
| mimo-0225 | CT-INT-127 | recepção filtra a listagem por período | passou |  |
| mimo-0226 | CT-INT-128 | recepção filtra a listagem por paciente e médico | passou |  |
| mimo-0227 | CT-INT-129 | filtro de status inválido é rejeitado | passou |  |
| mimo-0228 | CT-INT-130 | filtro de data inválido é rejeitado | passou |  |

## Arquivo: backend/__testes__/integracao/ciclo-de-vida.test.js

```js
/**
 * Ciclo de vida da consulta (RF09) e listagens por perfil (RF10),
 * com as regras RN25–RN29 e as transições de estado da consulta.
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
let eduardo;
let fernanda;
let ana;
let joao;

const paciente = (p) => ({ perfil: 'PACIENTE', pacienteId: p.id });
const recepcao = { perfil: 'RECEPCAO' };
const medico = (m) => ({ perfil: 'MEDICO', medicoId: m.id });

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  const dados = semear(db);
  servicos = criarServicos(db);
  [carlos, beatriz, eduardo, fernanda] = dados.medicos;
  [ana, joao] = dados.pacientes;
});

afterEach(() => {
  clock.definirAgora(null);
  db.close();
});

function inserirConsulta({ pacienteId, medicoId, inicio, fim, status, valorCentavos = 15000, remarcacoes = 0 }) {
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
  if (remarcacoes) db.prepare('UPDATE consultas SET remarcacoes = ? WHERE id = ?').run(remarcacoes, id);
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

describe('RF09.1 e RN25 — confirmação de presença', () => {
  /**
   * @caso CT-INT-078
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Permitir que a recepção confirme uma consulta agendada dentro da janela de 48 horas
   * @resultadoEsperado a consulta muda de AGENDADA para CONFIRMADA
   */
  test('recepção confirma consulta agendada na janela de 48 horas', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-20 10:00',
      fim: '2026-10-20 10:30',
    });
    const consulta = servicos.consultasService.confirmar(recepcao, id);
    expect(consulta.status).toBe('CONFIRMADA');
    expect(consulta.atualizadoEm).toBe('2026-10-19 08:00');
  });

  /**
   * @caso CT-INT-079
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Permitir que o próprio paciente confirme a própria consulta
   * @resultadoEsperado a consulta muda para CONFIRMADA quando o ator é o dono
   */
  test('paciente confirma a própria consulta', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-20 10:00',
      fim: '2026-10-20 10:30',
    });
    const consulta = servicos.consultasService.confirmar(paciente(ana), id);
    expect(consulta.status).toBe('CONFIRMADA');
  });

  /**
   * @caso CT-INT-080
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN25
   * @objetivo Recusar confirmação de consulta que já está confirmada
   * @resultadoEsperado a ação falha com 422 e a mensagem de que só agendadas podem ser confirmadas
   */
  test('confirmar consulta já confirmada é recusado', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-20 10:00',
      fim: '2026-10-20 10:30',
      status: 'CONFIRMADA',
    });
    const erro = lancar(() => servicos.consultasService.confirmar(recepcao, id));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Somente consultas agendadas podem ser confirmadas.');
  });

  /**
   * @caso CT-INT-081
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN25
   * @objetivo Recusar confirmação com mais de 48 horas de antecedência
   * @resultadoEsperado a ação falha com 422 e a mensagem da janela de 48 horas
   */
  test('confirmação fora da janela de 48 horas é recusada', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-21 08:01',
      fim: '2026-10-21 08:31',
    });
    const erro = lancar(() => servicos.consultasService.confirmar(recepcao, id));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('A confirmação só é permitida nas 48 horas anteriores à consulta.');
  });

  /**
   * @caso CT-INT-082
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Aceitar a confirmação exatamente 48 horas antes do início
   * @resultadoEsperado a consulta confirmada com o limite exato da janela
   */
  test('confirmação exatamente 48 horas antes é aceita', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-21 08:00',
      fim: '2026-10-21 08:30',
    });
    const consulta = servicos.consultasService.confirmar(recepcao, id);
    expect(consulta.status).toBe('CONFIRMADA');
  });

  /**
   * @caso CT-INT-083
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN25
   * @objetivo Recusar confirmação de consulta cujo horário já passou
   * @resultadoEsperado a ação falha com 422 e a mensagem de que a consulta já começou
   */
  test('confirmar consulta já iniciada é recusado', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
    });
    const erro = lancar(() => servicos.consultasService.confirmar(recepcao, id));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('A consulta já começou.');
  });

  /**
   * @caso CT-INT-084
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN25, RN30
   * @objetivo Impedir que paciente confirme consulta de outra pessoa
   * @resultadoEsperado a ação falha com 403 SEM_PERMISSAO
   */
  test('paciente não confirma consulta de outro paciente', () => {
    const id = inserirConsulta({
      pacienteId: joao.id,
      medicoId: carlos.id,
      inicio: '2026-10-20 10:00',
      fim: '2026-10-20 10:30',
    });
    const erro = lancar(() => servicos.consultasService.confirmar(paciente(ana), id));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Somente o paciente da consulta ou a recepção podem confirmar.');
  });

  /**
   * @caso CT-INT-085
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN25
   * @objetivo Devolver 404 ao confirmar consulta inexistente
   * @resultadoEsperado a ação falha com 404 NAO_ENCONTRADO
   */
  test('confirmar consulta inexistente devolve 404', () => {
    const erro = lancar(() => servicos.consultasService.confirmar(recepcao, 99999));
    expect(erro.status).toBe(404);
    expect(erro.message).toBe('Consulta não encontrada.');
  });
});

describe('RF09.2 e RN26 — cancelamento com motivo', () => {
  /**
   * @caso CT-INT-086
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.2, RN26
   * @objetivo Cancelar consulta pelo próprio paciente com antecedência e motivo
   * @resultadoEsperado a consulta vira CANCELADA com canceladoPor PACIENTE e o motivo gravado
   */
  test('paciente cancela a própria consulta com motivo', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-21 10:00',
      fim: '2026-10-21 10:30',
    });
    const consulta = servicos.consultasService.cancelar(paciente(ana), id, { motivo: 'Imprevisto de trabalho' });
    expect(consulta.status).toBe('CANCELADA');
    expect(consulta.canceladoPor).toBe('PACIENTE');
    expect(consulta.motivoCancelamento).toBe('Imprevisto de trabalho');
  });

  /**
   * @caso CT-INT-087
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN26
   * @objetivo Recusar cancelamento pelo paciente com menos de 24 horas
   * @resultadoEsperado a ação falha com 422 e a mensagem do prazo de 24 horas
   */
  test('paciente não cancela com menos de 24 horas', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-20 07:00',
      fim: '2026-10-20 07:30',
    });
    const erro = lancar(() => servicos.consultasService.cancelar(paciente(ana), id, { motivo: 'Não poderei ir' }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('O paciente só pode cancelar com no mínimo 24 horas de antecedência. Procure a recepção.');
  });

  /**
   * @caso CT-INT-088
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Aceitar cancelamento do paciente exatamente 24 horas antes
   * @resultadoEsperado a consulta é cancelada no limite exato do prazo
   */
  test('paciente cancela exatamente 24 horas antes', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-20 08:00',
      fim: '2026-10-20 08:30',
    });
    const consulta = servicos.consultasService.cancelar(paciente(ana), id, { motivo: 'Desisti' });
    expect(consulta.status).toBe('CANCELADA');
  });

  /**
   * @caso CT-INT-089
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.2, RN26
   * @objetivo Exigir motivo quando quem cancela é a recepção
   * @resultadoEsperado a ação falha com 422 pedindo o motivo do cancelamento
   */
  test('recepção precisa informar o motivo do cancelamento', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-21 10:00',
      fim: '2026-10-21 10:30',
    });
    const erro = lancar(() => servicos.consultasService.cancelar(recepcao, id));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Informe o motivo do cancelamento.');
  });

  /**
   * @caso CT-INT-090
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF09.2, RN26
   * @objetivo Registrar na consulta que foi a recepção quem cancelou
   * @resultadoEsperado a consulta fica CANCELADA com canceladoPor RECEPCAO e o motivo gravado
   */
  test('cancelamento da recepção grava o responsável e o motivo', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-21 10:00',
      fim: '2026-10-21 10:30',
    });
    const consulta = servicos.consultasService.cancelar(recepcao, id, { motivo: 'Médico de licença' });
    expect(consulta.status).toBe('CANCELADA');
    expect(consulta.canceladoPor).toBe('RECEPCAO');
    expect(consulta.motivoCancelamento).toBe('Médico de licença');
  });

  /**
   * @caso CT-INT-091
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.2, RN26
   * @objetivo Permitir que o médico cancele consulta da própria agenda com motivo
   * @resultadoEsperado a consulta fica CANCELADA com canceladoPor MEDICO
   */
  test('médico cancela consulta da própria agenda com motivo', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-21 10:00',
      fim: '2026-10-21 10:30',
    });
    const consulta = servicos.consultasService.cancelar(medico(carlos), id, { motivo: 'Plantão inesperado' });
    expect(consulta.status).toBe('CANCELADA');
    expect(consulta.canceladoPor).toBe('MEDICO');
    expect(consulta.motivoCancelamento).toBe('Plantão inesperado');
  });

  /**
   * @caso CT-INT-092
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN26, RN30
   * @objetivo Impedir que médico cancele consulta de outro médico
   * @resultadoEsperado a ação falha com 403 SEM_PERMISSAO
   */
  test('médico não cancela consulta de outro médico', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-21 10:00',
      fim: '2026-10-21 10:30',
    });
    const erro = lancar(() => servicos.consultasService.cancelar(medico(eduardo), id, { motivo: 'Qualquer' }));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Você não pode cancelar esta consulta.');
  });

  /**
   * @caso CT-INT-093
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN26, RN30
   * @objetivo Impedir que paciente cancele consulta de outra pessoa
   * @resultadoEsperado a ação falha com 403 SEM_PERMISSAO
   */
  test('paciente não cancela consulta de outro paciente', () => {
    const id = inserirConsulta({
      pacienteId: joao.id,
      medicoId: carlos.id,
      inicio: '2026-10-21 10:00',
      fim: '2026-10-21 10:30',
    });
    const erro = lancar(() => servicos.consultasService.cancelar(paciente(ana), id, { motivo: 'Só para testar' }));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Você não pode cancelar esta consulta.');
  });

  /**
   * @caso CT-INT-094
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN26
   * @objetivo Recusar cancelamento de consulta já cancelada
   * @resultadoEsperado a ação falha com 422 e a mensagem de que não pode mais ser cancelada
   */
  test('cancelar consulta já cancelada é recusado', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-21 10:00',
      fim: '2026-10-21 10:30',
      status: 'CANCELADA',
    });
    const erro = lancar(() => servicos.consultasService.cancelar(recepcao, id, { motivo: 'De novo' }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Esta consulta não pode mais ser cancelada.');
  });

  /**
   * @caso CT-INT-095
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN26
   * @objetivo Recusar cancelamento de consulta já realizada
   * @resultadoEsperado a ação falha com 422 e a mensagem de que não pode mais ser cancelada
   */
  test('cancelar consulta realizada é recusado', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-17 10:00',
      fim: '2026-10-17 10:30',
      status: 'REALIZADA',
    });
    const erro = lancar(() => servicos.consultasService.cancelar(recepcao, id, { motivo: 'Arrependimento' }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Esta consulta não pode mais ser cancelada.');
  });

  /**
   * @caso CT-INT-096
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN26
   * @objetivo Recusar cancelamento depois que a consulta começou
   * @resultadoEsperado a ação falha com 422 e a mensagem de que a consulta já começou
   */
  test('cancelar consulta já iniciada é recusado', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
    });
    const erro = lancar(() => servicos.consultasService.cancelar(recepcao, id, { motivo: 'Atraso do paciente' }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('A consulta já começou e não pode ser cancelada.');
  });
});

describe('RF09.3 e RN27 — remarcação', () => {
  /**
   * @caso CT-INT-097
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.3, RN27
   * @objetivo Remarcar a própria consulta para outro horário com o mesmo médico
   * @resultadoEsperado a consulta mantém o id, muda o horário, volta para AGENDADA e soma 1 remarcação
   */
  test('paciente remarca mantendo o id e voltando para AGENDADA', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
      status: 'CONFIRMADA',
    });
    const consulta = servicos.consultasService.remarcar(paciente(ana), id, { inicio: '2026-10-27 10:00' });
    expect(consulta.id).toBe(id);
    expect(consulta.inicio).toBe('2026-10-27 10:00');
    expect(consulta.fim).toBe('2026-10-27 10:30');
    expect(consulta.status).toBe('AGENDADA');
    expect(consulta.remarcacoes).toBe(1);
  });

  /**
   * @caso CT-INT-098
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Recalcular o valor da consulta na remarcação
   * @resultadoEsperado o idoso volta a pagar o valor com 10% de desconto
   */
  test('remarcação recalcula o valor da consulta', () => {
    const id = inserirConsulta({
      pacienteId: joao.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
      valorCentavos: 15000,
    });
    const consulta = servicos.consultasService.remarcar(paciente(joao), id, { inicio: '2026-10-27 10:00' });
    expect(consulta.valorCentavos).toBe(13500);
  });

  /**
   * @caso CT-INT-099
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN27
   * @objetivo Recusar remarcação com menos de 24 horas do início atual
   * @resultadoEsperado a ação falha com 422 e a mensagem do prazo de 24 horas
   */
  test('remarcação com menos de 24 horas é recusada', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-20 07:00',
      fim: '2026-10-20 07:30',
    });
    const erro = lancar(() => servicos.consultasService.remarcar(paciente(ana), id, { inicio: '2026-10-27 10:00' }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('A remarcação só é permitida até 24 horas antes da consulta.');
  });

  /**
   * @caso CT-INT-100
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN27
   * @objetivo Recusar a terceira remarcação da mesma consulta
   * @resultadoEsperado a ação falha com 422 e a mensagem do limite de 2 remarcações
   */
  test('terceira remarcação é recusada', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
      remarcacoes: 2,
    });
    const erro = lancar(() => servicos.consultasService.remarcar(paciente(ana), id, { inicio: '2026-10-27 10:00' }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Esta consulta já atingiu o limite de 2 remarcações.');
  });

  /**
   * @caso CT-INT-101
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN27
   * @objetivo Recusar remarcação de consulta cancelada
   * @resultadoEsperado a ação falha com 422 e a mensagem de que só agendadas ou confirmadas podem ser remarcadas
   */
  test('remarcar consulta cancelada é recusado', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
      status: 'CANCELADA',
    });
    const erro = lancar(() => servicos.consultasService.remarcar(paciente(ana), id, { inicio: '2026-10-27 10:00' }));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Somente consultas agendadas ou confirmadas podem ser remarcadas.');
  });

  /**
   * @caso CT-INT-102
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN27, RN17
   * @objetivo Manter a consulta intacta quando o novo horário está ocupado
   * @resultadoEsperado a remarcação falha com 409 e horário, status e remarcações não mudam
   */
  test('remarcar para horário ocupado não altera a consulta', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
      status: 'CONFIRMADA',
    });
    inserirConsulta({
      pacienteId: joao.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 11:00',
      fim: '2026-10-26 11:30',
    });

    const erro = lancar(() => servicos.consultasService.remarcar(paciente(ana), id, { inicio: '2026-10-26 11:00' }));
    expect(erro.status).toBe(409);
    expect(erro.message).toBe('Horário indisponível para este médico.');

    const consulta = servicos.repos.consultas.buscarPorId(id);
    expect(consulta.inicio).toBe('2026-10-26 10:00');
    expect(consulta.status).toBe('CONFIRMADA');
    expect(consulta.remarcacoes).toBe(0);
  });

  /**
   * @caso CT-INT-103
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN27, RN17
   * @objetivo Recusar remarcação para dia sem grade do médico
   * @resultadoEsperado a ação falha com 409 e a mensagem de horário indisponível
   */
  test('remarcar para dia sem grade é recusado', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
    });
    const erro = lancar(() => servicos.consultasService.remarcar(paciente(ana), id, { inicio: '2026-10-25 10:00' }));
    expect(erro.status).toBe(409);
    expect(erro.message).toBe('Horário indisponível para este médico.');
  });

  /**
   * @caso CT-INT-104
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN27, RN30
   * @objetivo Impedir que paciente remarque consulta de outra pessoa
   * @resultadoEsperado a ação falha com 403 SEM_PERMISSAO
   */
  test('paciente não remarca consulta de outro paciente', () => {
    const id = inserirConsulta({
      pacienteId: joao.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
    });
    const erro = lancar(() => servicos.consultasService.remarcar(paciente(ana), id, { inicio: '2026-10-27 10:00' }));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Somente o paciente da consulta ou a recepção podem remarcar.');
  });

  /**
   * @caso CT-INT-105
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN27, RN30
   * @objetivo Recusar remarcação feita pelo médico
   * @resultadoEsperado a ação falha com 403 SEM_PERMISSAO
   */
  test('médico não remarca consultas', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
    });
    const erro = lancar(() => servicos.consultasService.remarcar(medico(carlos), id, { inicio: '2026-10-27 10:00' }));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Somente o paciente da consulta ou a recepção podem remarcar.');
  });
});

describe('RF09.4 e RN28 — registro de atendimento realizado', () => {
  /**
   * @caso CT-INT-106
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.4, RN28
   * @objetivo Permitir que o médico da consulta registre o atendimento após o início
   * @resultadoEsperado a consulta muda para REALIZADA
   */
  test('médico da consulta registra o atendimento', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
    });
    const consulta = servicos.consultasService.registrarRealizada(medico(carlos), id);
    expect(consulta.status).toBe('REALIZADA');
  });

  /**
   * @caso CT-INT-107
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.4
   * @objetivo Gravar as observações informadas pelo médico
   * @resultadoEsperado a consulta fica REALIZADA com as observações registradas
   */
  test('atendimento grava as observações do médico', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
    });
    const consulta = servicos.consultasService.registrarRealizada(medico(carlos), id, {
      observacoes: 'Paciente evoluiu bem, retorno em 30 dias.',
    });
    expect(consulta.status).toBe('REALIZADA');
    expect(consulta.observacoes).toBe('Paciente evoluiu bem, retorno em 30 dias.');
  });

  /**
   * @caso CT-INT-108
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN28
   * @objetivo Recusar registro de atendimento antes do horário da consulta
   * @resultadoEsperado a ação falha com 422 e a mensagem de que só pode registrar a partir do início
   */
  test('registrar atendimento antes do horário é recusado', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 09:00',
      fim: '2026-10-19 09:30',
    });
    const erro = lancar(() => servicos.consultasService.registrarRealizada(medico(carlos), id));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('O atendimento só pode ser registrado a partir do horário da consulta.');
  });

  /**
   * @caso CT-INT-109
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN28, RN30
   * @objetivo Impedir que outro médico registre atendimento da agenda alheia
   * @resultadoEsperado a ação falha com 403 SEM_PERMISSAO
   */
  test('outro médico não registra atendimento alheio', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
    });
    const erro = lancar(() => servicos.consultasService.registrarRealizada(medico(eduardo), id));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Somente o médico da consulta pode registrar o atendimento.');
  });

  /**
   * @caso CT-INT-110
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN28, RN30
   * @objetivo Recusar registro de atendimento feito pela recepção
   * @resultadoEsperado a ação falha com 403 SEM_PERMISSAO
   */
  test('recepção não registra atendimento', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
    });
    const erro = lancar(() => servicos.consultasService.registrarRealizada(recepcao, id));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Somente o médico da consulta pode registrar o atendimento.');
  });

  /**
   * @caso CT-INT-111
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN28
   * @objetivo Recusar registro de atendimento em consulta cancelada
   * @resultadoEsperado a ação falha com 422 e a mensagem de que não pode ser marcada como realizada
   */
  test('registrar atendimento em consulta cancelada é recusado', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
      status: 'CANCELADA',
    });
    const erro = lancar(() => servicos.consultasService.registrarRealizada(medico(carlos), id));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Esta consulta não pode ser marcada como realizada.');
  });
});

describe('RF09.5 e RN29 — registro de falta', () => {
  /**
   * @caso CT-INT-112
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.5, RN29
   * @objetivo Permitir que a recepção registre falta após 15 minutos do início
   * @resultadoEsperado a consulta muda para FALTA
   */
  test('recepção registra falta após a tolerância', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
    });
    const consulta = servicos.consultasService.registrarFalta(recepcao, id);
    expect(consulta.status).toBe('FALTA');
  });

  /**
   * @caso CT-INT-113
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.5, RN29
   * @objetivo Permitir que o médico da consulta registre a falta
   * @resultadoEsperado a consulta muda para FALTA
   */
  test('médico da consulta registra a falta', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
    });
    const consulta = servicos.consultasService.registrarFalta(medico(carlos), id);
    expect(consulta.status).toBe('FALTA');
  });

  /**
   * @caso CT-INT-114
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN29
   * @objetivo Recusar falta antes dos 15 minutos de tolerância
   * @resultadoEsperado a ação falha com 422 e a mensagem dos 15 minutos
   */
  test('falta antes dos 15 minutos é recusada', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:50',
      fim: '2026-10-19 08:20',
    });
    const erro = lancar(() => servicos.consultasService.registrarFalta(recepcao, id));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('A falta só pode ser registrada 15 minutos após o início da consulta.');
  });

  /**
   * @caso CT-INT-115
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Aceitar a falta exatamente 15 minutos após o início
   * @resultadoEsperado a consulta vira FALTA no limite exato da tolerância
   */
  test('falta exatamente 15 minutos após o início é aceita', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:45',
      fim: '2026-10-19 08:15',
    });
    const consulta = servicos.consultasService.registrarFalta(recepcao, id);
    expect(consulta.status).toBe('FALTA');
  });

  /**
   * @caso CT-INT-116
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN29, RN30
   * @objetivo Recusar registro de falta feito pelo paciente
   * @resultadoEsperado a ação falha com 403 SEM_PERMISSAO
   */
  test('paciente não registra falta', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
    });
    const erro = lancar(() => servicos.consultasService.registrarFalta(paciente(ana), id));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Somente o médico da consulta ou a recepção podem registrar falta.');
  });

  /**
   * @caso CT-INT-117
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN29
   * @objetivo Recusar falta em consulta já realizada
   * @resultadoEsperado a ação falha com 422 e a mensagem de que não pode ser marcada como falta
   */
  test('falta em consulta realizada é recusada', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
      status: 'REALIZADA',
    });
    const erro = lancar(() => servicos.consultasService.registrarFalta(recepcao, id));
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Esta consulta não pode ser marcada como falta.');
  });
});

describe('RF10 — obter e listar consultas por perfil', () => {
  /**
   * @caso CT-INT-118
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.1
   * @objetivo Permitir que o paciente obtenha a própria consulta
   * @resultadoEsperado a consulta é devolvida sem erro
   */
  test('paciente obtém a própria consulta', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
    });
    const consulta = servicos.consultasService.obter(paciente(ana), id);
    expect(consulta.id).toBe(id);
    expect(consulta.pacienteId).toBe(ana.id);
  });

  /**
   * @caso CT-INT-119
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.1, RN30
   * @objetivo Bloquear o acesso do paciente à consulta de outra pessoa
   * @resultadoEsperado a leitura falha com 403 SEM_PERMISSAO
   */
  test('paciente não obtém consulta de outro paciente', () => {
    const id = inserirConsulta({
      pacienteId: joao.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
    });
    const erro = lancar(() => servicos.consultasService.obter(paciente(ana), id));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Você não tem acesso a esta consulta.');
  });

  /**
   * @caso CT-INT-120
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.2
   * @objetivo Permitir que o médico obtenha consulta da própria agenda
   * @resultadoEsperado a consulta é devolvida sem erro
   */
  test('médico obtém consulta da própria agenda', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
    });
    const consulta = servicos.consultasService.obter(medico(carlos), id);
    expect(consulta.id).toBe(id);
    expect(consulta.medicoId).toBe(carlos.id);
  });

  /**
   * @caso CT-INT-121
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.2, RN30
   * @objetivo Bloquear o acesso do médico à agenda de outro médico
   * @resultadoEsperado a leitura falha com 403 SEM_PERMISSAO
   */
  test('médico não obtém consulta de outro médico', () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
    });
    const erro = lancar(() => servicos.consultasService.obter(medico(eduardo), id));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Você não tem acesso a esta consulta.');
  });

  /**
   * @caso CT-INT-122
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Permitir que a recepção obtenha qualquer consulta
   * @resultadoEsperado a consulta é devolvida sem erro
   */
  test('recepção obtém qualquer consulta', () => {
    const id = inserirConsulta({
      pacienteId: joao.id,
      medicoId: eduardo.id,
      inicio: '2026-10-27 13:00',
      fim: '2026-10-27 13:30',
    });
    const consulta = servicos.consultasService.obter(recepcao, id);
    expect(consulta.id).toBe(id);
  });

  /**
   * @caso CT-INT-123
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF10.3
   * @objetivo Devolver 404 ao consultar id inexistente
   * @resultadoEsperado a leitura falha com 404 NAO_ENCONTRADO
   */
  test('obter consulta inexistente devolve 404', () => {
    const erro = lancar(() => servicos.consultasService.obter(recepcao, 99999));
    expect(erro.status).toBe(404);
    expect(erro.message).toBe('Consulta não encontrada.');
  });

  /**
   * @caso CT-INT-124
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.1
   * @objetivo Listar somente as consultas do próprio paciente
   * @resultadoEsperado a lista devolve apenas as consultas do paciente logado
   */
  test('listagem do paciente devolve só as consultas dele', () => {
    inserirConsulta({ pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-26 10:00', fim: '2026-10-26 10:30' });
    inserirConsulta({ pacienteId: ana.id, medicoId: fernanda.id, inicio: '2026-10-27 08:00', fim: '2026-10-27 08:15' });
    inserirConsulta({ pacienteId: joao.id, medicoId: carlos.id, inicio: '2026-10-26 11:00', fim: '2026-10-26 11:30' });

    const lista = servicos.consultasService.listar(paciente(ana));
    expect(lista).toHaveLength(2);
    expect(lista.every((c) => c.pacienteId === ana.id)).toBe(true);
  });

  /**
   * @caso CT-INT-125
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.2
   * @objetivo Listar somente as consultas da própria agenda do médico
   * @resultadoEsperado a lista devolve apenas as consultas do médico logado
   */
  test('listagem do médico devolve só as consultas da agenda dele', () => {
    inserirConsulta({ pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-26 10:00', fim: '2026-10-26 10:30' });
    inserirConsulta({ pacienteId: joao.id, medicoId: carlos.id, inicio: '2026-10-26 11:00', fim: '2026-10-26 11:30' });
    inserirConsulta({ pacienteId: ana.id, medicoId: eduardo.id, inicio: '2026-10-27 13:00', fim: '2026-10-27 13:30' });

    const lista = servicos.consultasService.listar(medico(carlos));
    expect(lista).toHaveLength(2);
    expect(lista.every((c) => c.medicoId === carlos.id)).toBe(true);
  });

  /**
   * @caso CT-INT-126
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Filtrar a listagem da recepção por status
   * @resultadoEsperado a lista devolve somente as consultas com o status pedido
   */
  test('recepção filtra a listagem por status', () => {
    inserirConsulta({ pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-26 10:00', fim: '2026-10-26 10:30' });
    inserirConsulta({
      pacienteId: joao.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 11:00',
      fim: '2026-10-26 11:30',
      status: 'CANCELADA',
    });

    const lista = servicos.consultasService.listar(recepcao, { status: 'CANCELADA' });
    expect(lista).toHaveLength(1);
    expect(lista[0].status).toBe('CANCELADA');
  });

  /**
   * @caso CT-INT-127
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Filtrar a listagem da recepção por período
   * @resultadoEsperado a lista devolve só as consultas iniciadas dentro do período
   */
  test('recepção filtra a listagem por período', () => {
    inserirConsulta({ pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-26 10:00', fim: '2026-10-26 10:30' });
    inserirConsulta({ pacienteId: joao.id, medicoId: carlos.id, inicio: '2026-11-10 10:00', fim: '2026-11-10 10:30' });

    const lista = servicos.consultasService.listar(recepcao, { dataInicio: '2026-11-01', dataFim: '2026-11-30' });
    expect(lista).toHaveLength(1);
    expect(lista[0].inicio).toBe('2026-11-10 10:00');
  });

  /**
   * @caso CT-INT-128
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Filtrar a listagem da recepção por paciente e médico ao mesmo tempo
   * @resultadoEsperado a lista devolve só a interseção dos dois filtros
   */
  test('recepção filtra a listagem por paciente e médico', () => {
    inserirConsulta({ pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-26 10:00', fim: '2026-10-26 10:30' });
    inserirConsulta({ pacienteId: ana.id, medicoId: eduardo.id, inicio: '2026-10-27 13:00', fim: '2026-10-27 13:30' });
    inserirConsulta({ pacienteId: joao.id, medicoId: carlos.id, inicio: '2026-10-26 11:00', fim: '2026-10-26 11:30' });

    const lista = servicos.consultasService.listar(recepcao, { pacienteId: ana.id, medicoId: carlos.id });
    expect(lista).toHaveLength(1);
    expect(lista[0].pacienteId).toBe(ana.id);
    expect(lista[0].medicoId).toBe(carlos.id);
  });

  /**
   * @caso CT-INT-129
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF10.3, RNF04
   * @objetivo Rejeitar filtro de status desconhecido
   * @resultadoEsperado a listagem falha com 400 VALIDACAO pedindo status válido
   */
  test('filtro de status inválido é rejeitado', () => {
    const erro = lancar(() => servicos.consultasService.listar(recepcao, { status: 'QUALQUER' }));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Status inválido.');
  });

  /**
   * @caso CT-INT-130
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF10.3, RNF04
   * @objetivo Rejeitar data de filtro fora do formato AAAA-MM-DD
   * @resultadoEsperado a listagem falha com 400 VALIDACAO pedindo o formato de data
   */
  test('filtro de data inválido é rejeitado', () => {
    const erro = lancar(() => servicos.consultasService.listar(recepcao, { dataInicio: '26/10/2026' }));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Datas do filtro devem estar no formato AAAA-MM-DD.');
  });
});
```
