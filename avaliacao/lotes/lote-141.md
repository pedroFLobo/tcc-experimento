# lote-141

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 21 casos listados na tabela** (parte 2 de 2). Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0331 | CT-UNI-094 | recepção cancela sem motivo | passou |  |
| mimo-0332 | CT-UNI-095 | médico dono precisa de motivo para cancelar | passou |  |
| mimo-0333 | CT-UNI-096 | não se cancela consulta já iniciada | passou |  |
| mimo-0334 | CT-UNI-097 | consulta realizada não pode ser cancelada | passou |  |
| mimo-0335 | CT-UNI-098 | paciente não dono não cancela a consulta | passou |  |
| mimo-0336 | CT-UNI-099 | médico de outra agenda não cancela a consulta | passou |  |
| mimo-0337 | CT-UNI-100 | paciente dono remarca pela primeira vez | passou |  |
| mimo-0338 | CT-UNI-101 | consulta confirmada pode ser remarcada | passou |  |
| mimo-0339 | CT-UNI-102 | terceira remarcação é bloqueada | passou |  |
| mimo-0340 | CT-UNI-103 | segunda remarcação ainda é permitida | passou |  |
| mimo-0341 | CT-UNI-104 | remarcação fora do prazo de 24 horas é bloqueada | passou |  |
| mimo-0342 | CT-UNI-105 | consulta cancelada não é remarcável | passou |  |
| mimo-0343 | CT-UNI-106 | somente o paciente dono ou a recepção remarcam | passou |  |
| mimo-0344 | CT-UNI-107 | atendimento pode ser registrado no horário exato de início | passou |  |
| mimo-0345 | CT-UNI-108 | atendimento antes do horário é recusado | passou |  |
| mimo-0346 | CT-UNI-109 | somente o médico da consulta registra atendimento | passou |  |
| mimo-0347 | CT-UNI-110 | consulta cancelada não pode virar realizada | passou |  |
| mimo-0348 | CT-UNI-111 | falta pode ser registrada 15 minutos após o início | passou |  |
| mimo-0349 | CT-UNI-112 | falta com 14 minutos é recusada | passou |  |
| mimo-0350 | CT-UNI-113 | paciente e outro médico não registram falta | passou |  |
| mimo-0351 | CT-UNI-114 | consulta realizada não pode virar falta | passou |  |

## Arquivo: backend/__testes__/unitario/consultas-regras.test.js

```js
/**
 * Regras puras do ciclo de vida e das limitações de agendamento
 * (RN16, RN17, RN19, RN20, RN22, RN23, RN24, RN25–RN29).
 */
const {
  STATUS,
  TRANSICOES,
  REGRAS,
  podeTransitar,
  estaAtiva,
  validarAntecedencia,
  validarLimitesPaciente,
  calcularSuspensao,
  calcularValor,
  encontrarConsultaDeRetorno,
  verificarConfirmacao,
  verificarCancelamento,
  verificarRemarcacao,
  verificarRealizacao,
  verificarFalta,
} = require('../../src/domain/consultas');
const { parseDataHora, somarDias } = require('../../src/utils/datas');

const AGORA = new Date('2026-10-19T08:00:00');
const em = (texto) => parseDataHora(texto);

const consulta = (campos = {}) => ({
  status: STATUS.AGENDADA,
  inicio: em('2026-10-26 10:00'),
  fim: em('2026-10-26 10:30'),
  remarcacoes: 0,
  ...campos,
});

describe('máquina de estados da consulta (RN25–RN29)', () => {
  /**
   * @caso CT-UNI-054
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN25, RN26, RN27, RN28, RN29
   * @objetivo Permitir todas as transições previstas para AGENDADA
   * @resultadoEsperado podeTransitar devolve true para CONFIRMADA, CANCELADA, REALIZADA e FALTA
   */
  test('AGENDADA pode transitar para os quatro estados previstos', () => {
    expect(podeTransitar(STATUS.AGENDADA, STATUS.CONFIRMADA)).toBe(true);
    expect(podeTransitar(STATUS.AGENDADA, STATUS.CANCELADA)).toBe(true);
    expect(podeTransitar(STATUS.AGENDADA, STATUS.REALIZADA)).toBe(true);
    expect(podeTransitar(STATUS.AGENDADA, STATUS.FALTA)).toBe(true);
  });

  /**
   * @caso CT-UNI-055
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN25, RN29
   * @objetivo Permitir CONFIRMADA transitar para cancelamento, atendimento e falta
   * @resultadoEsperado podeTransitar devolve true para CANCELADA, REALIZADA e FALTA
   */
  test('CONFIRMADA pode transitar para CANCELADA, REALIZADA e FALTA', () => {
    expect(podeTransitar(STATUS.CONFIRMADA, STATUS.CANCELADA)).toBe(true);
    expect(podeTransitar(STATUS.CONFIRMADA, STATUS.REALIZADA)).toBe(true);
    expect(podeTransitar(STATUS.CONFIRMADA, STATUS.FALTA)).toBe(true);
    expect(podeTransitar(STATUS.CONFIRMADA, STATUS.CONFIRMADA)).toBe(false);
  });

  /**
   * @caso CT-UNI-056
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN25, RN26, RN27, RN28, RN29
   * @objetivo Tratar REALIZADA, FALTA e CANCELADA como estados finais
   * @resultadoEsperado TRANSICOES devolve lista vazia para os três estados finais
   */
  test('estados finais não admitem nenhuma transição', () => {
    expect(TRANSICOES.REALIZADA).toEqual([]);
    expect(TRANSICOES.FALTA).toEqual([]);
    expect(TRANSICOES.CANCELADA).toEqual([]);
    [STATUS.REALIZADA, STATUS.FALTA, STATUS.CANCELADA].forEach((de) => {
      Object.values(STATUS).forEach((para) => expect(podeTransitar(de, para)).toBe(false));
    });
  });

  /**
   * @caso CT-UNI-057
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN18, RN19
   * @objetivo Reconhecer apenas AGENDADA e CONFIRMADA como consulta ativa
   * @resultadoEsperado estaAtiva devolve true para AGENDADA e CONFIRMADA e false para as demais
   */
  test('estaAtiva reconhece só AGENDADA e CONFIRMADA', () => {
    expect(estaAtiva(STATUS.AGENDADA)).toBe(true);
    expect(estaAtiva(STATUS.CONFIRMADA)).toBe(true);
    expect(estaAtiva(STATUS.REALIZADA)).toBe(false);
    expect(estaAtiva(STATUS.FALTA)).toBe(false);
    expect(estaAtiva(STATUS.CANCELADA)).toBe(false);
  });

  /**
   * @caso CT-UNI-058
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN16, RN19, RN25
   * @objetivo Manter os limites numéricos declarados na base de teste
   * @resultadoEsperado REGRAS reflete 120 minutos, 60 dias, 3 consultas e 1 por especialidade
   */
  test('constantes das regras de negócio são as especificadas', () => {
    expect(REGRAS.ANTECEDENCIA_MINIMA_MIN).toBe(120);
    expect(REGRAS.ANTECEDENCIA_MAXIMA_DIAS).toBe(60);
    expect(REGRAS.MAX_CONSULTAS_ATIVAS).toBe(3);
    expect(REGRAS.MAX_ATIVAS_POR_ESPECIALIDADE).toBe(1);
    expect(REGRAS.LIMITE_FALTAS).toBe(3);
    expect(REGRAS.JANELA_FALTAS_DIAS).toBe(90);
    expect(REGRAS.SUSPENSAO_DIAS).toBe(30);
    expect(REGRAS.DESCONTO_IDOSO_IDADE).toBe(60);
    expect(REGRAS.DESCONTO_IDOSO_PERCENTUAL).toBe(10);
    expect(REGRAS.JANELA_RETORNO_DIAS).toBe(30);
    expect(REGRAS.JANELA_CONFIRMACAO_HORAS).toBe(48);
    expect(REGRAS.PRAZO_CANCELAMENTO_PACIENTE_HORAS).toBe(24);
    expect(REGRAS.MAX_REMARCACOES).toBe(2);
    expect(REGRAS.TOLERANCIA_FALTA_MIN).toBe(15);
  });
});

describe('RN16 — antecedência mínima e máxima', () => {
  /**
   * @caso CT-UNI-059
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Aceitar agendamento exatamente com 2 horas de antecedência (valor-limite)
   * @resultadoEsperado validarAntecedencia devolve null para 10:00 em relação a 08:00
   */
  test('antecedência exatamente de 2 horas é aceita', () => {
    expect(validarAntecedencia(em('2026-10-19 10:00'), AGORA)).toBe(null);
  });

  /**
   * @caso CT-UNI-060
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN16
   * @objetivo Rejeitar agendamento com 119 minutos de antecedência
   * @resultadoEsperado validarAntecedencia devolve a mensagem de mínimo 2 horas
   */
  test('antecedência de 119 minutos é rejeitada', () => {
    expect(validarAntecedencia(em('2026-10-19 09:59'), AGORA)).toBe(
      'A consulta deve ser agendada com no mínimo 2 horas de antecedência.',
    );
  });

  /**
   * @caso CT-UNI-061
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN16
   * @objetivo Rejeitar horário já passado
   * @resultadoEsperado validarAntecedencia devolve a mensagem de mínimo 2 horas
   */
  test('horário no passado é rejeitado', () => {
    expect(validarAntecedencia(em('2026-10-19 07:30'), AGORA)).toBe(
      'A consulta deve ser agendada com no mínimo 2 horas de antecedência.',
    );
  });

  /**
   * @caso CT-UNI-062
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Aceitar agendamento exatamente 60 dias à frente (valor-limite)
   * @resultadoEsperado validarAntecedencia devolve null para 2026-12-18 08:00
   */
  test('antecedência exatamente de 60 dias é aceita', () => {
    expect(validarAntecedencia(new Date(2026, 11, 18, 8, 0), AGORA)).toBe(null);
  });

  /**
   * @caso CT-UNI-063
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN16
   * @objetivo Rejeitar agendamento a mais de 60 dias
   * @resultadoEsperado validarAntecedencia devolve a mensagem de máximo 60 dias
   */
  test('antecedência de 61 dias é rejeitada', () => {
    const umDiaDepois = new Date(2026, 11, 18, 8, 1);
    expect(validarAntecedencia(umDiaDepois, AGORA)).toBe(
      'A consulta deve ser agendada com no máximo 60 dias de antecedência.',
    );
  });
});

describe('RN19 — limites de consultas do paciente', () => {
  /**
   * @caso CT-UNI-064
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN19
   * @objetivo Bloquear o quarto agendamento ativo futuro do paciente
   * @resultadoEsperado validarLimitesPaciente devolve mensagem de limite com 3 consultas
   */
  test('terceira consulta ativa futura libera, quarta é bloqueada', () => {
    const tres = [{ especialidadeId: 1 }, { especialidadeId: 2 }, { especialidadeId: 3 }];
    expect(validarLimitesPaciente(tres, 4)).toBe('O paciente já possui 3 consultas agendadas, que é o limite.');
  });

  /**
   * @caso CT-UNI-065
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Permitir o terceiro agendamento em especialidades diferentes
   * @resultadoEsperado validarLimitesPaciente devolve null com duas consultas em especialidades distintas
   */
  test('duas consultas em especialidades diferentes ainda permitem agendar', () => {
    const duas = [{ especialidadeId: 1 }, { especialidadeId: 2 }];
    expect(validarLimitesPaciente(duas, 3)).toBe(null);
  });

  /**
   * @caso CT-UNI-066
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN19
   * @objetivo Bloquear segundo agendamento na mesma especialidade mesmo com vagas globais
   * @resultadoEsperado validarLimitesPaciente devolve mensagem de especialidade já ocupada
   */
  test('segunda consulta na mesma especialidade é bloqueada', () => {
    const duas = [{ especialidadeId: 1 }, { especialidadeId: 2 }];
    expect(validarLimitesPaciente(duas, 1)).toBe('O paciente já possui uma consulta agendada nesta especialidade.');
  });

  /**
   * @caso CT-UNI-067
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN19
   * @objetivo Permitir o primeiro agendamento do paciente
   * @resultadoEsperado validarLimitesPaciente devolve null para lista vazia
   */
  test('paciente sem consultas pode agendar', () => {
    expect(validarLimitesPaciente([], 1)).toBe(null);
  });
});

describe('RN20 — suspensão por faltas', () => {
  /**
   * @caso CT-UNI-068
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Suspender o paciente por 30 dias a contar da terceira falta recente
   * @resultadoEsperado calcularSuspensao devolve 2026-11-04 para última falta em 2026-10-05
   */
  test('três faltas nos últimos 90 dias geram suspensão de 30 dias', () => {
    const faltas = [em('2026-09-01 10:00'), em('2026-09-15 10:00'), em('2026-10-05 10:00')];
    expect(calcularSuspensao(faltas, AGORA)).toEqual(new Date(2026, 10, 4));
  });

  /**
   * @caso CT-UNI-069
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN20
   * @objetivo Não suspender o paciente com apenas duas faltas
   * @resultadoEsperado calcularSuspensao devolve null com 2 faltas na janela
   */
  test('duas faltas não suspendem o paciente', () => {
    const faltas = [em('2026-09-15 10:00'), em('2026-10-05 10:00')];
    expect(calcularSuspensao(faltas, AGORA)).toBe(null);
  });

  /**
   * @caso CT-UNI-070
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN20
   * @objetivo Ignorar faltas anteriores à janela de 90 dias
   * @resultadoEsperado calcularSuspensao devolve null quando as 3 faltas são antigas
   */
  test('faltas fora da janela de 90 dias não suspendem', () => {
    const faltas = [em('2026-05-01 10:00'), em('2026-05-20 10:00'), em('2026-06-10 10:00')];
    expect(calcularSuspensao(faltas, AGORA)).toBe(null);
  });

  /**
   * @caso CT-UNI-071
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN20
   * @objetivo Considerar faltas dentro da janela e descartar as anteriores
   * @resultadoEsperado calcularSuspensao usa só a última falta recente mesmo com faltas antigas
   */
  test('faltas antigas não contaminam a janela de 90 dias', () => {
    const faltas = [em('2026-03-01 10:00'), em('2026-03-10 10:00'), em('2026-10-01 10:00')];
    expect(calcularSuspensao(faltas, AGORA)).toBe(null);
  });

  /**
   * @caso CT-UNI-072
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN20
   * @objetivo Devolver null quando o paciente não tem nenhuma falta
   * @resultadoEsperado calcularSuspensao devolve null para lista vazia
   */
  test('paciente sem faltas não é suspenso', () => {
    expect(calcularSuspensao([], AGORA)).toBe(null);
  });
});

describe('RN22, RN23 e RN24 — valor da consulta', () => {
  /**
   * @caso CT-UNI-073
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN22
   * @objetivo Aplicar o preço base cheio para paciente adulto sem retorno
   * @resultadoEsperado calcularValor devolve o preço base em centavos
   */
  test('paciente adulto paga o preço base', () => {
    expect(calcularValor({ precoBaseCentavos: 15000, idadePaciente: 36, ehRetorno: false })).toBe(15000);
  });

  /**
   * @caso CT-UNI-074
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Aplicar 10% de desconto para paciente de 60 anos ou mais (valor-limite)
   * @resultadoEsperado calcularValor devolve 13500 para 15000 com 60 anos e preço cheio com 59
   */
  test('idoso de 60 anos recebe 10% de desconto', () => {
    expect(calcularValor({ precoBaseCentavos: 15000, idadePaciente: 60, ehRetorno: false })).toBe(13500);
    expect(calcularValor({ precoBaseCentavos: 15000, idadePaciente: 59, ehRetorno: false })).toBe(15000);
  });

  /**
   * @caso CT-UNI-075
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Arredondar o desconto para o centavo mais próximo quando não é exato
   * @resultadoEsperado calcularValor devolve 13505 para base 15005 com 60 anos
   */
  test('desconto do idoso é arredondado para o centavo mais próximo', () => {
    expect(calcularValor({ precoBaseCentavos: 15005, idadePaciente: 70, ehRetorno: false })).toBe(13505);
  });

  /**
   * @caso CT-UNI-076
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Zerar o valor quando a consulta dá direito a retorno
   * @resultadoEsperado calcularValor devolve 0 quando ehRetorno é true
   */
  test('retorno gratuitamente zera o valor', () => {
    expect(calcularValor({ precoBaseCentavos: 30000, idadePaciente: 30, ehRetorno: true })).toBe(0);
  });

  /**
   * @caso CT-UNI-077
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Fazer o retorno prevalecer sobre o desconto de idade
   * @resultadoEsperado calcularValor devolve 0 mesmo com 60 anos ou mais
   */
  test('retorno prevalece sobre o desconto de idade', () => {
    expect(calcularValor({ precoBaseCentavos: 15000, idadePaciente: 80, ehRetorno: true })).toBe(0);
  });

  /**
   * @caso CT-UNI-078
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Escolher a realização mais recente dentro da janela de 30 dias
   * @resultadoEsperado encontrarConsultaDeRetorno devolve o id da consulta mais próxima do novo horário
   */
  test('retorno usa a realização mais recente da janela', () => {
    const realizadas = [
      { id: 11, inicio: em('2026-10-08 10:00') },
      { id: 22, inicio: em('2026-10-12 10:00') },
    ];
    expect(encontrarConsultaDeRetorno(realizadas, [], em('2026-10-26 10:00'))).toBe(22);
  });

  /**
   * @caso CT-UNI-079
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN24
   * @objetivo Ignorar realização anterior aos 30 dias (valor-limite)
   * @resultadoEsperado encontrarConsultaDeRetorno devolve null para realização de 31 dias antes
   */
  test('realização fora da janela de 30 dias não dá retorno', () => {
    const realizadas = [{ id: 7, inicio: em('2026-09-25 10:00') }];
    expect(encontrarConsultaDeRetorno(realizadas, [], em('2026-10-26 10:00'))).toBe(null);
  });

  /**
   * @caso CT-UNI-080
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN24
   * @objetivo Excluir realização que ocorreu após o novo horário
   * @resultadoEsperado encontrarConsultaDeRetorno devolve null para realização futura
   */
  test('realização futura não dá direito a retorno', () => {
    const realizadas = [{ id: 9, inicio: em('2026-11-01 10:00') }];
    expect(encontrarConsultaDeRetorno(realizadas, [], em('2026-10-26 10:00'))).toBe(null);
  });

  /**
   * @caso CT-UNI-081
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN24
   * @objetivo Desconsiderar realização cujo direito já foi consumido
   * @resultadoEsperado encontrarConsultaDeRetorno pula os ids em idsJaUsados e devolve a seguinte
   */
  test('retorno já consumido é pulado e a seguinte é usada', () => {
    const realizadas = [
      { id: 11, inicio: em('2026-10-08 10:00') },
      { id: 22, inicio: em('2026-10-12 10:00') },
    ];
    expect(encontrarConsultaDeRetorno(realizadas, [22], em('2026-10-26 10:00'))).toBe(11);
  });

  /**
   * @caso CT-UNI-082
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN24
   * @objetivo Devolver null quando todos os direitos de retorno já foram usados
   * @resultadoEsperado encontrarConsultaDeRetorno devolve null com todos os ids consumidos
   */
  test('sem direito de retorno disponível devolve null', () => {
    const realizadas = [{ id: 22, inicio: em('2026-10-12 10:00') }];
    expect(encontrarConsultaDeRetorno(realizadas, [22], em('2026-10-26 10:00'))).toBe(null);
  });

  /**
   * @caso CT-UNI-083
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN24
   * @objetivo Devolver null quando o paciente nunca teve consulta realizada
   * @resultadoEsperado encontrarConsultaDeRetorno devolve null para lista vazia
   */
  test('paciente sem consultas realizadas não tem retorno', () => {
    expect(encontrarConsultaDeRetorno([], [], em('2026-10-26 10:00'))).toBe(null);
  });
});

describe('RN25 — confirmação de presença', () => {
  const pacienteDono = { perfil: 'PACIENTE', ehDono: true };
  const pacienteOutro = { perfil: 'PACIENTE', ehDono: false };
  const recepcao = { perfil: 'RECEPCAO', ehDono: false };
  const medicoDono = { perfil: 'MEDICO', ehDono: true };

  /**
   * @caso CT-UNI-084
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Permitir ao próprio paciente confirmar dentro da janela de 48 horas
   * @resultadoEsperado verificarConfirmacao devolve null para consulta 26 horas à frente
   */
  test('paciente dono confirma dentro da janela de 48 horas', () => {
    const c = consulta({ inicio: em('2026-10-20 10:00'), fim: em('2026-10-20 10:30') });
    expect(verificarConfirmacao(c, pacienteDono, AGORA)).toBe(null);
  });

  /**
   * @caso CT-UNI-085
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN25
   * @objetivo Bloquear confirmação antes das 48 horas anteriores (valor-limite)
   * @resultadoEsperado verificarConfirmacao devolve regra de janela de 48 horas
   */
  test('confirmação antes das 48 horas é rejeitada', () => {
    const c = consulta({ inicio: em('2026-10-21 08:01'), fim: em('2026-10-21 08:31') });
    expect(verificarConfirmacao(c, pacienteDono, AGORA)).toEqual({
      tipo: 'REGRA',
      mensagem: 'A confirmação só é permitida nas 48 horas anteriores à consulta.',
    });
  });

  /**
   * @caso CT-UNI-086
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN25
   * @objetivo Recusar confirmação de consulta cujo horário de início já passou
   * @resultadoEsperado verificarConfirmacao devolve regra "A consulta já começou."
   */
  test('confirmação de consulta iniciada é rejeitada', () => {
    const c = consulta({ inicio: em('2026-10-19 07:00'), fim: em('2026-10-19 07:30') });
    expect(verificarConfirmacao(c, pacienteDono, AGORA).mensagem).toBe('A consulta já começou.');
  });

  /**
   * @caso CT-UNI-087
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN25
   * @objetivo Recusar confirmação de consulta que não está AGENDADA
   * @resultadoEsperado verificarConfirmacao devolve regra de status para CONFIRMADA
   */
  test('confirmar consulta já confirmada é rejeitado', () => {
    const c = consulta({ status: STATUS.CONFIRMADA, inicio: em('2026-10-20 10:00'), fim: em('2026-10-20 10:30') });
    expect(verificarConfirmacao(c, pacienteDono, AGORA).mensagem).toBe('Somente consultas agendadas podem ser confirmadas.');
  });

  /**
   * @caso CT-UNI-088
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN25, RN30
   * @objetivo Impedir que outro paciente confirme a consulta alheia
   * @resultadoEsperado verificarConfirmacao devolve erro do tipo PERMISSAO
   */
  test('paciente que não é dono não confirma a consulta', () => {
    const c = consulta({ inicio: em('2026-10-20 10:00'), fim: em('2026-10-20 10:30') });
    expect(verificarConfirmacao(c, pacienteOutro, AGORA).tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-089
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN25
   * @objetivo Permitir que a recepção confirme a presença
   * @resultadoEsperado verificarConfirmacao devolve null para ator RECEPCAO
   */
  test('recepção pode confirmar presença', () => {
    const c = consulta({ inicio: em('2026-10-20 10:00'), fim: em('2026-10-20 10:30') });
    expect(verificarConfirmacao(c, recepcao, AGORA)).toBe(null);
  });

  /**
   * @caso CT-UNI-090
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN25, RN30
   * @objetivo Impedir que o médico confirme presença de consulta da agenda
   * @resultadoEsperado verificarConfirmacao devolve erro do tipo PERMISSAO para MEDICO
   */
  test('médico não confirma presença', () => {
    const c = consulta({ inicio: em('2026-10-20 10:00'), fim: em('2026-10-20 10:30') });
    expect(verificarConfirmacao(c, medicoDono, AGORA).tipo).toBe('PERMISSAO');
  });
});

describe('RN26 — cancelamento', () => {
  const pacienteDono = { perfil: 'PACIENTE', ehDono: true };
  const pacienteOutro = { perfil: 'PACIENTE', ehDono: false };
  const recepcao = { perfil: 'RECEPCAO', ehDono: false };
  const medicoDono = { perfil: 'MEDICO', ehDono: true };
  const medicoOutro = { perfil: 'MEDICO', ehDono: false };
  const longe = () => consulta({ inicio: em('2026-10-26 10:00'), fim: em('2026-10-26 10:30') });

  /**
   * @caso CT-UNI-091
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Permitir cancelamento pelo paciente com mais de 24 horas de antecedência
   * @resultadoEsperado verificarCancelamento devolve null sem exigir motivo
   */
  test('paciente cancela com mais de 24 horas de antecedência', () => {
    expect(verificarCancelamento(longe(), pacienteDono, AGORA, undefined)).toBe(null);
  });

  /**
   * @caso CT-UNI-092
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN26
   * @objetivo Bloquear cancelamento pelo paciente com menos de 24 horas (valor-limite)
   * @resultadoEsperado verificarCancelamento devolve regra de 24 horas para 12 horas à frente
   */
  test('paciente não cancela com menos de 24 horas', () => {
    const c = consulta({ inicio: em('2026-10-19 20:00'), fim: em('2026-10-19 20:30') });
    expect(verificarCancelamento(c, pacienteDono, AGORA, undefined)).toEqual({
      tipo: 'REGRA',
      mensagem: 'O paciente só pode cancelar com no mínimo 24 horas de antecedência. Procure a recepção.',
    });
  });

  /**
   * @caso CT-UNI-093
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Permitir cancelamento pela recepção até o início da consulta
   * @resultadoEsperado verificarCancelamento devolve null para recepção com motivo mesmo no mesmo dia
   */
  test('recepção cancela no mesmo dia desde que informe o motivo', () => {
    const c = consulta({ inicio: em('2026-10-19 14:00'), fim: em('2026-10-19 14:30') });
    expect(verificarCancelamento(c, recepcao, AGORA, 'Paciente desistiu')).toBe(null);
  });

  /**
   * @caso CT-UNI-094
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN26
   * @objetivo Exigir motivo para cancelamento feito pela recepção
   * @resultadoEsperado verificarCancelamento devolve regra "Informe o motivo do cancelamento."
   */
  test('recepção cancela sem motivo', () => {
    const c = consulta({ inicio: em('2026-10-26 10:00'), fim: em('2026-10-26 10:30') });
    expect(verificarCancelamento(c, recepcao, AGORA, '   ').mensagem).toBe('Informe o motivo do cancelamento.');
    expect(verificarCancelamento(c, recepcao, AGORA, undefined).mensagem).toBe('Informe o motivo do cancelamento.');
  });

  /**
   * @caso CT-UNI-095
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN26
   * @objetivo Exigir motivo para cancelamento feito pelo médico dono
   * @resultadoEsperado verificarCancelamento devolve regra de motivo para MEDICO sem motivo
   */
  test('médico dono precisa de motivo para cancelar', () => {
    const c = consulta({ inicio: em('2026-10-26 10:00'), fim: em('2026-10-26 10:30') });
    expect(verificarCancelamento(c, medicoDono, AGORA, undefined).mensagem).toBe('Informe o motivo do cancelamento.');
    expect(verificarCancelamento(c, medicoDono, AGORA, 'Emergência da clínica')).toBe(null);
  });

  /**
   * @caso CT-UNI-096
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN26
   * @objetivo Recusar cancelamento depois do horário de início
   * @resultadoEsperado verificarCancelamento devolve regra "A consulta já começou..."
   */
  test('não se cancela consulta já iniciada', () => {
    const c = consulta({ inicio: em('2026-10-19 07:00'), fim: em('2026-10-19 07:30') });
    expect(verificarCancelamento(c, recepcao, AGORA, 'motivo').mensagem).toBe(
      'A consulta já começou e não pode ser cancelada.',
    );
  });

  /**
   * @caso CT-UNI-097
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN26
   * @objetivo Recusar cancelamento de consulta em estado final
   * @resultadoEsperado verificarCancelamento devolve regra para consulta REALIZADA
   */
  test('consulta realizada não pode ser cancelada', () => {
    const c = consulta({ status: STATUS.REALIZADA });
    expect(verificarCancelamento(c, recepcao, AGORA, 'motivo').mensagem).toBe('Esta consulta não pode mais ser cancelada.');
  });

  /**
   * @caso CT-UNI-098
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN26, RN30
   * @objetivo Impedir que paciente não dono cancele a consulta alheia
   * @resultadoEsperado verificarCancelamento devolve erro do tipo PERMISSAO
   */
  test('paciente não dono não cancela a consulta', () => {
    expect(verificarCancelamento(longe(), pacienteOutro, AGORA, undefined).tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-099
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN26, RN30
   * @objetivo Impedir que médico de outra agenda cancele a consulta
   * @resultadoEsperado verificarCancelamento devolve erro do tipo PERMISSAO para MEDICO sem dono
   */
  test('médico de outra agenda não cancela a consulta', () => {
    expect(verificarCancelamento(longe(), medicoOutro, AGORA, 'motivo').tipo).toBe('PERMISSAO');
  });
});

describe('RN27 — remarcação', () => {
  const pacienteDono = { perfil: 'PACIENTE', ehDono: true };
  const pacienteOutro = { perfil: 'PACIENTE', ehDono: false };
  const recepcao = { perfil: 'RECEPCAO', ehDono: false };
  const medico = { perfil: 'MEDICO', ehDono: true };
  const longe = () => consulta({ inicio: em('2026-10-26 10:00'), fim: em('2026-10-26 10:30') });

  /**
   * @caso CT-UNI-100
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Permitir a primeira remarcação pelo paciente dono
   * @resultadoEsperado verificarRemarcacao devolve null com remarcacoes = 0
   */
  test('paciente dono remarca pela primeira vez', () => {
    expect(verificarRemarcacao(longe(), pacienteDono, AGORA)).toBe(null);
  });

  /**
   * @caso CT-UNI-101
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Permitir remarcação de consulta CONFIRMADA
   * @resultadoEsperado verificarRemarcacao devolve null para status CONFIRMADA
   */
  test('consulta confirmada pode ser remarcada', () => {
    expect(verificarRemarcacao(consulta({ status: STATUS.CONFIRMADA }), pacienteDono, AGORA)).toBe(null);
  });

  /**
   * @caso CT-UNI-102
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN27
   * @objetivo Bloquear a terceira remarcação da mesma consulta (valor-limite)
   * @resultadoEsperado verificarRemarcacao devolve regra de limite de 2 remarcações
   */
  test('terceira remarcação é bloqueada', () => {
    const c = consulta({ remarcacoes: 2 });
    expect(verificarRemarcacao(c, pacienteDono, AGORA).mensagem).toBe('Esta consulta já atingiu o limite de 2 remarcações.');
  });

  /**
   * @caso CT-UNI-103
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN27
   * @objetivo Permitir remarcação de uma consulta que já foi remarcada uma vez
   * @resultadoEsperado verificarRemarcacao devolve null com remarcacoes = 1
   */
  test('segunda remarcação ainda é permitida', () => {
    expect(verificarRemarcacao(consulta({ remarcacoes: 1 }), pacienteDono, AGORA)).toBe(null);
  });

  /**
   * @caso CT-UNI-104
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN27
   * @objetivo Bloquear remarcação com menos de 24 horas da consulta atual
   * @resultadoEsperado verificarRemarcacao devolve regra de prazo de 24 horas
   */
  test('remarcação fora do prazo de 24 horas é bloqueada', () => {
    const c = consulta({ inicio: em('2026-10-19 20:00'), fim: em('2026-10-19 20:30') });
    expect(verificarRemarcacao(c, pacienteDono, AGORA).mensagem).toBe(
      'A remarcação só é permitida até 24 horas antes da consulta.',
    );
  });

  /**
   * @caso CT-UNI-105
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN27
   * @objetivo Recusar remarcação de consulta em estado final
   * @resultadoEsperado verificarRemarcacao devolve regra de status para CANCELADA
   */
  test('consulta cancelada não é remarcável', () => {
    const c = consulta({ status: STATUS.CANCELADA });
    expect(verificarRemarcacao(c, pacienteDono, AGORA).mensagem).toBe(
      'Somente consultas agendadas ou confirmadas podem ser remarcadas.',
    );
  });

  /**
   * @caso CT-UNI-106
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN27, RN30
   * @objetivo Impedir remarcação por paciente não dono ou por médico
   * @resultadoEsperado verificarRemarcacao devolve erro do tipo PERMISSAO nos dois casos
   */
  test('somente o paciente dono ou a recepção remarcam', () => {
    expect(verificarRemarcacao(longe(), pacienteOutro, AGORA).tipo).toBe('PERMISSAO');
    expect(verificarRemarcacao(longe(), medico, AGORA).tipo).toBe('PERMISSAO');
    expect(verificarRemarcacao(longe(), recepcao, AGORA)).toBe(null);
  });
});

describe('RN28 e RN29 — registro de atendimento e falta', () => {
  const medicoDono = { perfil: 'MEDICO', ehDono: true };
  const medicoOutro = { perfil: 'MEDICO', ehDono: false };
  const recepcao = { perfil: 'RECEPCAO', ehDono: false };
  const paciente = { perfil: 'PACIENTE', ehDono: true };

  /**
   * @caso CT-UNI-107
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN28
   * @objetivo Permitir atendimento registrado exatamente no horário de início
   * @resultadoEsperado verificarRealizacao devolve null quando agora igual ao início
   */
  test('atendimento pode ser registrado no horário exato de início', () => {
    const inicio = em('2026-10-19 14:00');
    const c = consulta({ inicio, fim: em('2026-10-19 14:30') });
    expect(verificarRealizacao(c, medicoDono, inicio)).toBe(null);
  });

  /**
   * @caso CT-UNI-108
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN28
   * @objetivo Recusar atendimento registrado antes do horário da consulta
   * @resultadoEsperado verificarRealizacao devolve regra de horário de início
   */
  test('atendimento antes do horário é recusado', () => {
    const inicio = em('2026-10-19 14:00');
    const c = consulta({ inicio, fim: em('2026-10-19 14:30') });
    expect(verificarRealizacao(c, medicoDono, em('2026-10-19 13:59')).mensagem).toBe(
      'O atendimento só pode ser registrado a partir do horário da consulta.',
    );
  });

  /**
   * @caso CT-UNI-109
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN28, RN30
   * @objetivo Restringir o registro de atendimento ao médico da consulta
   * @resultadoEsperado verificarRealizacao devolve PERMISSAO para outro médico, recepção e paciente
   */
  test('somente o médico da consulta registra atendimento', () => {
    const c = consulta({ inicio: em('2026-10-19 08:00'), fim: em('2026-10-19 08:30') });
    expect(verificarRealizacao(c, medicoOutro, em('2026-10-19 09:00')).tipo).toBe('PERMISSAO');
    expect(verificarRealizacao(c, recepcao, em('2026-10-19 09:00')).tipo).toBe('PERMISSAO');
    expect(verificarRealizacao(c, paciente, em('2026-10-19 09:00')).tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-110
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN28
   * @objetivo Recusar atendimento de consulta em estado final
   * @resultadoEsperado verificarRealizacao devolve regra para consulta CANCELADA
   */
  test('consulta cancelada não pode virar realizada', () => {
    const c = consulta({ status: STATUS.CANCELADA, inicio: em('2026-10-19 08:00'), fim: em('2026-10-19 08:30') });
    expect(verificarRealizacao(c, medicoDono, em('2026-10-19 09:00')).mensagem).toBe(
      'Esta consulta não pode ser marcada como realizada.',
    );
  });

  /**
   * @caso CT-UNI-111
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Registrar falta exatamente 15 minutos após o início (valor-limite)
   * @resultadoEsperado verificarFalta devolve null para agora = início + 15 minutos
   */
  test('falta pode ser registrada 15 minutos após o início', () => {
    const inicio = em('2026-10-19 14:00');
    const c = consulta({ inicio, fim: em('2026-10-19 14:30') });
    expect(verificarFalta(c, recepcao, em('2026-10-19 14:15'))).toBe(null);
  });

  /**
   * @caso CT-UNI-112
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN29
   * @objetivo Recusar falta com 14 minutos de tolerância (valor-limite)
   * @resultadoEsperado verificarFalta devolve regra de 15 minutos
   */
  test('falta com 14 minutos é recusada', () => {
    const inicio = em('2026-10-19 14:00');
    const c = consulta({ inicio, fim: em('2026-10-19 14:30') });
    expect(verificarFalta(c, recepcao, em('2026-10-19 14:14')).mensagem).toBe(
      'A falta só pode ser registrada 15 minutos após o início da consulta.',
    );
  });

  /**
   * @caso CT-UNI-113
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN29, RN30
   * @objetivo Restringir o registro de falta ao médico da consulta e à recepção
   * @resultadoEsperado verificarFalta devolve PERMISSAO para paciente e para outro médico
   */
  test('paciente e outro médico não registram falta', () => {
    const c = consulta({ inicio: em('2026-10-19 14:00'), fim: em('2026-10-19 14:30') });
    expect(verificarFalta(c, paciente, em('2026-10-19 15:00')).tipo).toBe('PERMISSAO');
    expect(verificarFalta(c, medicoOutro, em('2026-10-19 15:00')).tipo).toBe('PERMISSAO');
    expect(verificarFalta(c, medicoDono, em('2026-10-19 15:00'))).toBe(null);
  });

  /**
   * @caso CT-UNI-114
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN29
   * @objetivo Recusar falta de consulta já realizada
   * @resultadoEsperado verificarFalta devolve regra para status REALIZADA
   */
  test('consulta realizada não pode virar falta', () => {
    const c = consulta({ status: STATUS.REALIZADA, inicio: em('2026-10-19 14:00'), fim: em('2026-10-19 14:30') });
    expect(verificarFalta(c, recepcao, em('2026-10-19 15:00')).mensagem).toBe(
      'Esta consulta não pode ser marcada como falta.',
    );
  });
});
```
