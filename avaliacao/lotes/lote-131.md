# lote-131

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 27 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0126 | CT-INT-051 | paciente agenda para si com o valor do preço base | passou |  |
| mimo-0127 | CT-INT-052 | paciente idoso paga 10% de desconto | passou |  |
| mimo-0128 | CT-INT-053 | retorno com o mesmo médico zera o valor | passou |  |
| mimo-0129 | CT-INT-054 | retorno prevalece sobre o desconto do idoso | passou |  |
| mimo-0130 | CT-INT-055 | retorno é específico de cada médico | passou |  |
| mimo-0131 | CT-INT-056 | cancelamento devolve o direito de retorno | passou |  |
| mimo-0132 | CT-INT-057 | recepção agenda para o paciente informado | passou |  |
| mimo-0133 | CT-INT-058 | agendamento sem 2 horas de antecedência é recusado | passou |  |
| mimo-0134 | CT-INT-059 | agendamento além de 60 dias é recusado | passou |  |
| mimo-0135 | CT-INT-060 | horário fora da grade é recusado | passou |  |
| mimo-0136 | CT-INT-061 | horário já ocupado pelo médico é recusado | passou |  |
| mimo-0137 | CT-INT-062 | paciente não acumula consultas sobrepostas | passou |  |
| mimo-0138 | CT-INT-063 | horário malformado é rejeitado | passou |  |
| mimo-0139 | CT-INT-064 | paciente não passa de 3 consultas ativas futuras | falhou | Error: O paciente já possui outra consulta neste horário. at Object.conflito (C:\Users\pedro\AppData\Local\Temp\clinica-experimento\mimo\backend\src\utils\error |
| mimo-0140 | CT-INT-065 | paciente não repete especialidade com consulta ativa | passou |  |
| mimo-0141 | CT-INT-066 | consulta cancelada libera a vaga de limite | passou |  |
| mimo-0142 | CT-INT-067 | paciente com 3 faltas recentes está suspenso | passou |  |
| mimo-0143 | CT-INT-068 | suspensão também vale para agendamento da recepção | passou |  |
| mimo-0144 | CT-INT-069 | paciente com 2 faltas não está suspenso | passou |  |
| mimo-0145 | CT-INT-070 | faltas antigas não suspendem o paciente | passou |  |
| mimo-0146 | CT-INT-071 | paciente inativo não pode agendar | passou |  |
| mimo-0147 | CT-INT-072 | médico inativo não recebe agendamentos | passou |  |
| mimo-0148 | CT-INT-073 | paciente só agenda para si mesmo | passou |  |
| mimo-0149 | CT-INT-074 | médico não agenda consultas | passou |  |
| mimo-0150 | CT-INT-075 | recepção precisa informar o paciente | passou |  |
| mimo-0151 | CT-INT-076 | paciente e médico inexistentes devolvem 404 | passou |  |
| mimo-0152 | CT-INT-077 | agendamento sem médico é rejeitado | passou |  |

## Arquivo: backend/__testes__/integracao/agendamento.test.js

```js
/**
 * Agendamento de consultas (RF08) com as regras RN16–RN24.
 * Relógio fixado em 2026-10-19 08:00 (segunda-feira).
 */
const clock = require('../../src/utils/clock');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');

const AGORA = '2026-10-19 08:00';

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

function inserirConsulta({ pacienteId, medicoId, inicio, fim, status, valorCentavos = 15000 }) {
  const id = servicos.repos.consultas.inserir({
    pacienteId,
    medicoId,
    inicio,
    fim,
    valorCentavos,
    retornoDe: null,
    agora: AGORA,
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

describe('RF08 — agendamento e cálculo de valor', () => {
  /**
   * @caso CT-INT-051
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1, RF08.2, RN22
   * @objetivo Agenda para si e grava o valor igual ao preço base da especialidade
   * @resultadoEsperado a consulta nasce AGENDADA, com fim de 30 minutos e valor 15000 centavos
   */
  test('paciente agenda para si com o valor do preço base', () => {
    const consulta = servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    expect(consulta.status).toBe('AGENDADA');
    expect(consulta.inicio).toBe('2026-10-26 10:00');
    expect(consulta.fim).toBe('2026-10-26 10:30');
    expect(consulta.valorCentavos).toBe(15000);
    expect(consulta.pacienteId).toBe(ana.id);
    expect(consulta.medicoId).toBe(carlos.id);
  });

  /**
   * @caso CT-INT-052
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1, RN23
   * @objetivo Aplicar 10% de desconto para paciente com 60 anos ou mais na data da consulta
   * @resultadoEsperado o valor gravado é 13500 centavos para o paciente idoso
   */
  test('paciente idoso paga 10% de desconto', () => {
    const consulta = servicos.consultasService.agendar(paciente(joao), { medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    expect(consulta.valorCentavos).toBe(13500);
  });

  /**
   * @caso CT-INT-053
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Zerar o valor quando há consulta realizada com o mesmo médico em 30 dias
   * @resultadoEsperado a nova consulta fica com valor 0 e aponta retornoDe para a realização
   */
  test('retorno com o mesmo médico zera o valor', () => {
    const realizada = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-10 10:00',
      fim: '2026-10-10 10:30',
      status: 'REALIZADA',
    });
    const consulta = servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    expect(consulta.valorCentavos).toBe(0);
    expect(consulta.retornoDe).toBe(realizada);
  });

  /**
   * @caso CT-INT-054
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23, RN24
   * @objetivo Fazer o retorno gratuito prevalecer sobre o desconto de idade
   * @resultadoEsperado o idoso com retorno direito paga zero
   */
  test('retorno prevalece sobre o desconto do idoso', () => {
    inserirConsulta({
      pacienteId: joao.id,
      medicoId: carlos.id,
      inicio: '2026-10-10 10:00',
      fim: '2026-10-10 10:30',
      status: 'REALIZADA',
    });
    const consulta = servicos.consultasService.agendar(paciente(joao), { medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    expect(consulta.valorCentavos).toBe(0);
  });

  /**
   * @caso CT-INT-055
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN24
   * @objetivo Não aplicar retorno vindo de outro médico
   * @resultadoEsperado a consulta com médico diferente mantém o preço cheio
   */
  test('retorno é específico de cada médico', () => {
    inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-10 10:00',
      fim: '2026-10-10 10:30',
      status: 'REALIZADA',
    });
    const consulta = servicos.consultasService.agendar(paciente(ana), { medicoId: beatriz.id, inicio: '2026-10-26 09:45' });
    expect(consulta.valorCentavos).toBe(30000);
  });

  /**
   * @caso CT-INT-056
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN24
   * @objetivo Devolver o direito de retorno quando a consulta que o consumiu é cancelada
   * @resultadoEsperado a nova consulta volta a custar zero após o cancelamento da anterior
   */
  test('cancelamento devolve o direito de retorno', () => {
    inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-10 10:00',
      fim: '2026-10-10 10:30',
      status: 'REALIZADA',
    });
    const primeira = servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    expect(primeira.valorCentavos).toBe(0);

    servicos.consultasService.cancelar(paciente(ana), primeira.id, { motivo: 'Desisti' });

    const segunda = servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 11:00' });
    expect(segunda.valorCentavos).toBe(0);
    expect(segunda.retornoDe).toBe(primeira.retornoDe);
  });

  /**
   * @caso CT-INT-057
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1, RN18
   * @objetivo Permitir que a recepção agende para qualquer paciente
   * @resultadoEsperado a consulta é criada com o paciente informado e valor correto
   */
  test('recepção agenda para o paciente informado', () => {
    const consulta = servicos.consultasService.agendar(recepcao, {
      pacienteId: ana.id,
      medicoId: fernanda.id,
      inicio: '2026-10-27 08:00',
    });
    expect(consulta.pacienteId).toBe(ana.id);
    expect(consulta.medicoId).toBe(fernanda.id);
    expect(consulta.valorCentavos).toBe(20000);
  });
});

describe('RN16, RN17 e RN18 — restrições de horário', () => {
  /**
   * @caso CT-INT-058
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN16
   * @objetivo Recusar horário com menos de 2 horas de antecedência
   * @resultadoEsperado o agendamento falha com 422 e a mensagem de antecedência mínima
   */
  test('agendamento sem 2 horas de antecedência é recusado', () => {
    const erro = lancar(() =>
      servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-19 09:00' }),
    );
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('A consulta deve ser agendada com no mínimo 2 horas de antecedência.');
  });

  /**
   * @caso CT-INT-059
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN16
   * @objetivo Recusar horário a mais de 60 dias de distância
   * @resultadoEsperado o agendamento falha com 422 e a mensagem de antecedência máxima
   */
  test('agendamento além de 60 dias é recusado', () => {
    const erro = lancar(() =>
      servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-12-19 10:00' }),
    );
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('A consulta deve ser agendada com no máximo 60 dias de antecedência.');
  });

  /**
   * @caso CT-INT-060
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN17
   * @objetivo Recusar horário que não está entre os livres do médico
   * @resultadoEsperado o agendamento falha com 409 CONFLITO de horário indisponível
   */
  test('horário fora da grade é recusado', () => {
    const erro = lancar(() =>
      servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-19 13:00' }),
    );
    expect(erro.status).toBe(409);
    expect(erro.codigo).toBe('CONFLITO');
    expect(erro.message).toBe('Horário indisponível para este médico.');
  });

  /**
   * @caso CT-INT-061
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN17
   * @objetivo Recusar horário já ocupado por consulta ativa do próprio médico
   * @resultadoEsperado o segundo agendamento falha com 409 de horário indisponível
   */
  test('horário já ocupado pelo médico é recusado', () => {
    inserirConsulta({
      pacienteId: joao.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
    });
    const erro = lancar(() =>
      servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 10:00' }),
    );
    expect(erro.status).toBe(409);
    expect(erro.message).toBe('Horário indisponível para este médico.');
  });

  /**
   * @caso CT-INT-062
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN18
   * @objetivo Recusar segundo agendamento do paciente que se sobrepõe em outro médico
   * @resultadoEsperado o agendamento falha com 409 e a mensagem de horário conflitante
   */
  test('paciente não acumula consultas sobrepostas', () => {
    servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    const erro = lancar(() =>
      servicos.consultasService.agendar(paciente(ana), { medicoId: beatriz.id, inicio: '2026-10-26 09:45' }),
    );
    expect(erro.status).toBe(409);
    expect(erro.message).toBe('O paciente já possui outra consulta neste horário.');
  });

  /**
   * @caso CT-INT-063
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN17, RNF04
   * @objetivo Recusar horário malformado antes de tocar na agenda
   * @resultadoEsperado o agendamento falha com 400 VALIDACAO e nenhuma consulta é criada
   */
  test('horário malformado é rejeitado', () => {
    const erro = lancar(() =>
      servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '26/10/2026 10:00' }),
    );
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Horário inválido. Use o formato AAAA-MM-DD HH:mm.');
    expect(servicos.repos.consultas.listar({ pacienteId: ana.id })).toHaveLength(0);
  });
});

describe('RN19 — limites de consultas ativas', () => {
  /**
   * @caso CT-INT-064
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN19
   * @objetivo Bloquear a quarta consulta ativa futura do paciente
   * @resultadoEsperado o quarto agendamento falha com 422 e a mensagem de limite de 3 consultas
   */
  test('paciente não passa de 3 consultas ativas futuras', () => {
    servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    servicos.consultasService.agendar(paciente(ana), { medicoId: beatriz.id, inicio: '2026-10-26 09:45' });
    servicos.consultasService.agendar(paciente(ana), { medicoId: eduardo.id, inicio: '2026-10-20 13:00' });

    const erro = lancar(() =>
      servicos.consultasService.agendar(paciente(ana), { medicoId: fernanda.id, inicio: '2026-10-27 08:00' }),
    );
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('O paciente já possui 3 consultas agendadas, que é o limite.');
    expect(servicos.repos.consultas.listar({ pacienteId: ana.id })).toHaveLength(3);
  });

  /**
   * @caso CT-INT-065
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN19
   * @objetivo Bloquear o segundo agendamento na mesma especialidade
   * @resultadoEsperado o agendamento falha com 422 e a mensagem de especialidade já ocupada
   */
  test('paciente não repete especialidade com consulta ativa', () => {
    servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    const erro = lancar(() =>
      servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 11:00' }),
    );
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('O paciente já possui uma consulta agendada nesta especialidade.');
  });

  /**
   * @caso CT-INT-066
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN19
   * @objetivo Não contar consultas canceladas para os limites
   * @resultadoEsperado o paciente consegue um novo agendamento após cancelar a anterior
   */
  test('consulta cancelada libera a vaga de limite', () => {
    const primeira = servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    servicos.consultasService.cancelar(paciente(ana), primeira.id, { motivo: 'Não poderei ir' });
    const segunda = servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 11:00' });
    expect(segunda.id).not.toBe(primeira.id);
    expect(segunda.status).toBe('AGENDADA');
  });
});

describe('RN20 — suspensão por faltas', () => {
  /**
   * @caso CT-INT-067
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Impedir o paciente com 3 faltas nos últimos 90 dias de agendar
   * @resultadoEsperado o agendamento falha com 422 e a data limite da suspensão aparece na mensagem
   */
  test('paciente com 3 faltas recentes está suspenso', () => {
    ['2026-09-01 10:00', '2026-09-15 10:00', '2026-10-05 10:00'].forEach((inicio) =>
      inserirConsulta({
        pacienteId: ana.id,
        medicoId: carlos.id,
        inicio,
        fim: inicio.replace(/10:00$/, '10:30'),
        status: 'FALTA',
      }),
    );

    const erro = lancar(() =>
      servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 10:00' }),
    );
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Paciente suspenso por faltas até 2026-11-04.');
  });

  /**
   * @caso CT-INT-068
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN20
   * @objetivo Manter a suspensão quando a recepção agenda em nome do paciente
   * @resultadoEsperado a recepção recebe o mesmo 422 de suspensão
   */
  test('suspensão também vale para agendamento da recepção', () => {
    ['2026-09-01 10:00', '2026-09-15 10:00', '2026-10-05 10:00'].forEach((inicio) =>
      inserirConsulta({
        pacienteId: ana.id,
        medicoId: carlos.id,
        inicio,
        fim: inicio.replace(/10:00$/, '10:30'),
        status: 'FALTA',
      }),
    );

    const erro = lancar(() =>
      servicos.consultasService.agendar(recepcao, { pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-26 10:00' }),
    );
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Paciente suspenso por faltas até 2026-11-04.');
  });

  /**
   * @caso CT-INT-069
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN20
   * @objetivo Não suspender o paciente com apenas duas faltas
   * @resultadoEsperado o agendamento é concluído com sucesso
   */
  test('paciente com 2 faltas não está suspenso', () => {
    ['2026-09-15 10:00', '2026-10-05 10:00'].forEach((inicio) =>
      inserirConsulta({
        pacienteId: ana.id,
        medicoId: carlos.id,
        inicio,
        fim: inicio.replace(/10:00$/, '10:30'),
        status: 'FALTA',
      }),
    );
    const consulta = servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    expect(consulta.status).toBe('AGENDADA');
  });

  /**
   * @caso CT-INT-070
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN20
   * @objetivo Ignorar faltas anteriores à janela de 90 dias
   * @resultadoEsperado o agendamento é concluído porque as faltas são antigas
   */
  test('faltas antigas não suspendem o paciente', () => {
    ['2026-05-01 10:00', '2026-05-20 10:00', '2026-06-10 10:00'].forEach((inicio) =>
      inserirConsulta({
        pacienteId: ana.id,
        medicoId: carlos.id,
        inicio,
        fim: inicio.replace(/10:00$/, '10:30'),
        status: 'FALTA',
      }),
    );
    const consulta = servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    expect(consulta.status).toBe('AGENDADA');
  });
});

describe('RN21 e RN30 — contas inativas e autorização', () => {
  /**
   * @caso CT-INT-071
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN21
   * @objetivo Impedir agendamento para paciente com conta inativa
   * @resultadoEsperado o agendamento falha com 422 e a mensagem de paciente inativo
   */
  test('paciente inativo não pode agendar', () => {
    servicos.repos.usuarios.definirAtivo(ana.usuarioId, false);
    const erro = lancar(() =>
      servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 10:00' }),
    );
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Paciente inativo não pode agendar consultas.');
  });

  /**
   * @caso CT-INT-072
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN21
   * @objetivo Recusar agendamento com médico de conta inativa
   * @resultadoEsperado o agendamento falha com 422 e a mensagem de médico inativo
   */
  test('médico inativo não recebe agendamentos', () => {
    servicos.repos.usuarios.definirAtivo(carlos.usuarioId, false);
    const erro = lancar(() =>
      servicos.consultasService.agendar(paciente(ana), { medicoId: carlos.id, inicio: '2026-10-26 10:00' }),
    );
    expect(erro.status).toBe(422);
    expect(erro.message).toBe('Médico inativo não recebe agendamentos.');
  });

  /**
   * @caso CT-INT-073
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF08.1, RN30
   * @objetivo Impedir que o paciente agenda em nome de outra pessoa
   * @resultadoEsperado o agendamento falha com 403 SEM_PERMISSAO
   */
  test('paciente só agenda para si mesmo', () => {
    const erro = lancar(() =>
      servicos.consultasService.agendar(paciente(ana), { pacienteId: joao.id, medicoId: carlos.id, inicio: '2026-10-26 10:00' }),
    );
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Você só pode agendar consultas para si mesmo.');
  });

  /**
   * @caso CT-INT-074
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF08.1, RN30
   * @objetivo Impedir que o médico use o agendamento
   * @resultadoEsperado o agendamento falha com 403 e orienta procurar a recepção
   */
  test('médico não agenda consultas', () => {
    const erro = lancar(() =>
      servicos.consultasService.agendar({ perfil: 'MEDICO', medicoId: carlos.id }, { medicoId: carlos.id, inicio: '2026-10-26 10:00' }),
    );
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Médicos não agendam consultas. Procure a recepção.');
  });

  /**
   * @caso CT-INT-075
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF08.1
   * @objetivo Exigir paciente quando a recepção agenda
   * @resultadoEsperado o agendamento falha com 400 VALIDACAO pedindo o paciente
   */
  test('recepção precisa informar o paciente', () => {
    const erro = lancar(() =>
      servicos.consultasService.agendar(recepcao, { medicoId: carlos.id, inicio: '2026-10-26 10:00' }),
    );
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Informe o paciente.');
  });

  /**
   * @caso CT-INT-076
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF08.1, RN30
   * @objetivo Devolver 404 para paciente e médico inexistentes
   * @resultadoEsperado os dois casos falham com 404 NAO_ENCONTRADO
   */
  test('paciente e médico inexistentes devolvem 404', () => {
    const pacienteAusente = lancar(() =>
      servicos.consultasService.agendar(recepcao, { pacienteId: 99999, medicoId: carlos.id, inicio: '2026-10-26 10:00' }),
    );
    expect(pacienteAusente.status).toBe(404);

    const medicoAusente = lancar(() =>
      servicos.consultasService.agendar(paciente(ana), { medicoId: 99999, inicio: '2026-10-26 10:00' }),
    );
    expect(medicoAusente.status).toBe(404);
    expect(medicoAusente.message).toBe('Médico não encontrado.');
  });

  /**
   * @caso CT-INT-077
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF08.2
   * @objetivo Exigir médico no corpo do agendamento
   * @resultadoEsperado o agendamento falha com 400 VALIDACAO pedindo o médico
   */
  test('agendamento sem médico é rejeitado', () => {
    const erro = lancar(() => servicos.consultasService.agendar(paciente(ana), { inicio: '2026-10-26 10:00' }));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Informe o médico.');
  });
});
```
