# lote-081

Modelo: gemini

Avalie com a skill `juiz-casos-teste` **somente os 32 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| gemini-0110 | CT-UNI-039 | deve permitir transições válidas de AGENDADA | passou |  |
| gemini-0111 | CT-UNI-040 | deve proibir transições a partir de estados terminais | passou |  |
| gemini-0112 | CT-UNI-041 | deve identificar status ativos corretamente | passou |  |
| gemini-0113 | CT-UNI-042 | deve aceitar horário com exatamente 2 horas de antecedência ou mais até 60 dias | passou |  |
| gemini-0114 | CT-UNI-043 | deve rejeitar agendamento com 119 minutos de antecedência | passou |  |
| gemini-0115 | CT-UNI-044 | deve rejeitar agendamento além de 60 dias | passou |  |
| gemini-0116 | CT-UNI-045 | deve permitir agendamento dentro dos limites de consultas ativas futuras | passou |  |
| gemini-0117 | CT-UNI-046 | deve bloquear agendamento ao atingir 3 consultas ativas futuras | passou |  |
| gemini-0118 | CT-UNI-047 | deve bloquear agendamento repetido na mesma especialidade | passou |  |
| gemini-0119 | CT-UNI-048 | não deve suspender paciente com 2 faltas recentes | passou |  |
| gemini-0120 | CT-UNI-049 | deve suspender paciente com 3 faltas nos últimos 90 dias por 30 dias após a última | passou |  |
| gemini-0121 | CT-UNI-050 | não deve considerar faltas ocorridas além de 90 dias | passou |  |
| gemini-0122 | CT-UNI-051 | deve cobrar preço integral para paciente adulto sem direito a retorno | passou |  |
| gemini-0123 | CT-UNI-052 | deve aplicar 10% de desconto para idoso de 60 anos ou mais | passou |  |
| gemini-0124 | CT-UNI-053 | deve retornar 0 quando for retorno gratuito mesmo para idoso | passou |  |
| gemini-0125 | CT-UNI-054 | deve identificar consulta elegível para retorno dentro de 30 dias | passou |  |
| gemini-0126 | CT-UNI-055 | deve ignorar consulta já utilizada anteriormente como retorno | passou |  |
| gemini-0127 | CT-UNI-056 | deve permitir confirmação nas 48 horas anteriores à consulta pelo paciente | passou |  |
| gemini-0128 | CT-UNI-057 | deve impedir que outro paciente confirme a consulta | passou |  |
| gemini-0129 | CT-UNI-058 | deve impedir confirmação antes da janela de 48 horas | passou |  |
| gemini-0130 | CT-UNI-059 | deve permitir cancelamento pelo paciente com antecedência de 24 horas | passou |  |
| gemini-0131 | CT-UNI-060 | deve impedir cancelamento do paciente com menos de 24 horas | passou |  |
| gemini-0132 | CT-UNI-061 | deve exigir motivo de cancelamento quando efetuado pela recepção ou médico | passou |  |
| gemini-0133 | CT-UNI-062 | deve permitir remarcação válida até 24h antes e dentro do limite de 2 vezes | passou |  |
| gemini-0134 | CT-UNI-063 | deve impedir consulta de ser remarcada pela 3ª vez | passou |  |
| gemini-0135 | CT-UNI-064 | deve permitir ao médico dono registrar atendimento no horário da consulta | passou |  |
| gemini-0136 | CT-UNI-065 | deve impedir que recepção ou outro médico registre atendimento realizado | passou |  |
| gemini-0137 | CT-UNI-066 | deve impedir atendimento antes do horário de início | passou |  |
| gemini-0138 | CT-UNI-067 | deve permitir registro de falta após 15 minutos do início | passou |  |
| gemini-0139 | CT-UNI-068 | deve impedir registro de falta antes de 15 minutos do início | passou |  |
| gemini-0140 | CT-UNI-069 | deve impedir paciente de registrar falta | passou |  |
| gemini-0141 | CT-UNI-070 | deve manter objeto REGRAS imutável com os parâmetros do sistema | passou |  |

## Arquivo: backend/__testes__/unitario/consultas.test.js

```js
const {
  STATUS,
  STATUS_ATIVOS,
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
const { somarDias, somarMinutos } = require('../../src/utils/datas');

describe('Regras de Consultas e Ciclo de Vida (consultas.js)', () => {
  const agoraPadrao = new Date('2026-10-19T08:00:00');

  // --- Máquina de Estados (RN25 a RN29) ---
  /**
   * @caso CT-UNI-039
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09
   * @objetivo Permitir transições válidas a partir de AGENDADA
   * @resultadoEsperado podeTransitar retorna true para CONFIRMADA, CANCELADA, REALIZADA, FALTA
   */
  test('deve permitir transições válidas de AGENDADA', () => {
    expect(podeTransitar(STATUS.AGENDADA, STATUS.CONFIRMADA)).toBe(true);
    expect(podeTransitar(STATUS.AGENDADA, STATUS.CANCELADA)).toBe(true);
    expect(podeTransitar(STATUS.AGENDADA, STATUS.REALIZADA)).toBe(true);
    expect(podeTransitar(STATUS.AGENDADA, STATUS.FALTA)).toBe(true);
  });

  /**
   * @caso CT-UNI-040
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09
   * @objetivo Proibir transições a partir de estados finais
   * @resultadoEsperado podeTransitar retorna false para REALIZADA, FALTA e CANCELADA
   */
  test('deve proibir transições a partir de estados terminais', () => {
    expect(podeTransitar(STATUS.REALIZADA, STATUS.CANCELADA)).toBe(false);
    expect(podeTransitar(STATUS.FALTA, STATUS.CONFIRMADA)).toBe(false);
    expect(podeTransitar(STATUS.CANCELADA, STATUS.AGENDADA)).toBe(false);
  });

  /**
   * @caso CT-UNI-041
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF09
   * @objetivo Identificar corretamente se uma consulta é ativa
   * @resultadoEsperado estaAtiva retorna true apenas para AGENDADA e CONFIRMADA
   */
  test('deve identificar status ativos corretamente', () => {
    expect(estaAtiva(STATUS.AGENDADA)).toBe(true);
    expect(estaAtiva(STATUS.CONFIRMADA)).toBe(true);
    expect(estaAtiva(STATUS.REALIZADA)).toBe(false);
    expect(estaAtiva(STATUS.FALTA)).toBe(false);
    expect(estaAtiva(STATUS.CANCELADA)).toBe(false);
  });

  // --- RN16: Antecedência mínima e máxima ---
  /**
   * @caso CT-UNI-042
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Aceitar agendamento com antecedência entre 2 horas e 60 dias
   * @resultadoEsperado validarAntecedencia retorna null
   */
  test('deve aceitar horário com exatamente 2 horas de antecedência ou mais até 60 dias', () => {
    const inicioValido = somarMinutos(agoraPadrao, 120); // 2h
    expect(validarAntecedencia(inicioValido, agoraPadrao)).toBeNull();

    const inicio60Dias = somarDias(agoraPadrao, 60);
    expect(validarAntecedencia(inicio60Dias, agoraPadrao)).toBeNull();
  });

  /**
   * @caso CT-UNI-043
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN16
   * @objetivo Rejeitar agendamento com menos de 2 horas de antecedência
   * @resultadoEsperado validarAntecedencia retorna erro de 2 horas mínimas
   */
  test('deve rejeitar agendamento com 119 minutos de antecedência', () => {
    const inicioLimite = somarMinutos(agoraPadrao, 119);
    expect(validarAntecedencia(inicioLimite, agoraPadrao)).toMatch(/mínimo 2 horas de antecedência/i);
  });

  /**
   * @caso CT-UNI-044
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN16
   * @objetivo Rejeitar agendamento com mais de 60 dias de antecedência
   * @resultadoEsperado validarAntecedencia retorna erro de 60 dias máximos
   */
  test('deve rejeitar agendamento além de 60 dias', () => {
    const inicioDistante = somarDias(agoraPadrao, 61);
    expect(validarAntecedencia(inicioDistante, agoraPadrao)).toMatch(/máximo 60 dias de antecedência/i);
  });

  // --- RN19: Limites do paciente ---
  /**
   * @caso CT-UNI-045
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Permitir agendamento quando paciente tem menos de 3 consultas e nenhuma na especialidade
   * @resultadoEsperado validarLimitesPaciente retorna null
   */
  test('deve permitir agendamento dentro dos limites de consultas ativas futuras', () => {
    const ativas = [{ especialidadeId: 1 }, { especialidadeId: 2 }];
    expect(validarLimitesPaciente(ativas, 3)).toBeNull();
  });

  /**
   * @caso CT-UNI-046
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN19
   * @objetivo Rejeitar agendamento quando paciente já possui 3 consultas ativas futuras
   * @resultadoEsperado Retornar erro do limite de 3 consultas
   */
  test('deve bloquear agendamento ao atingir 3 consultas ativas futuras', () => {
    const ativas = [{ especialidadeId: 1 }, { especialidadeId: 2 }, { especialidadeId: 3 }];
    expect(validarLimitesPaciente(ativas, 4)).toMatch(/limite/i);
  });

  /**
   * @caso CT-UNI-047
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN19
   * @objetivo Rejeitar agendamento quando paciente já possui 1 consulta ativa na mesma especialidade
   * @resultadoEsperado Retornar erro de consulta agendada na especialidade
   */
  test('deve bloquear agendamento repetido na mesma especialidade', () => {
    const ativas = [{ especialidadeId: 1 }];
    expect(validarLimitesPaciente(ativas, 1)).toMatch(/já possui uma consulta agendada nesta especialidade/i);
  });

  // --- RN20: Suspensão por faltas ---
  /**
   * @caso CT-UNI-048
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Não suspender paciente com menos de 3 faltas nos últimos 90 dias
   * @resultadoEsperado calcularSuspensao retorna null
   */
  test('não deve suspender paciente com 2 faltas recentes', () => {
    const faltas = [
      somarDias(agoraPadrao, -10),
      somarDias(agoraPadrao, -5),
    ];
    expect(calcularSuspensao(faltas, agoraPadrao)).toBeNull();
  });

  /**
   * @caso CT-UNI-049
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Suspender paciente com 3 ou mais faltas nos últimos 90 dias até 30 dias após a última falta
   * @resultadoEsperado calcularSuspensao retorna a data final da suspensão (última falta + 30 dias)
   */
  test('deve suspender paciente com 3 faltas nos últimos 90 dias por 30 dias após a última', () => {
    const ultimaFalta = somarDias(agoraPadrao, -5);
    const faltas = [
      somarDias(agoraPadrao, -50),
      somarDias(agoraPadrao, -20),
      ultimaFalta,
    ];
    const dataFim = calcularSuspensao(faltas, agoraPadrao);
    expect(dataFim).toEqual(somarDias(ultimaFalta, 30));
  });

  /**
   * @caso CT-UNI-050
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN20
   * @objetivo Ignorar faltas ocorridas há mais de 90 dias
   * @resultadoEsperado calcularSuspensao retorna null se apenas 2 estiverem na janela
   */
  test('não deve considerar faltas ocorridas além de 90 dias', () => {
    const faltas = [
      somarDias(agoraPadrao, -95), // fora da janela
      somarDias(agoraPadrao, -40),
      somarDias(agoraPadrao, -10),
    ];
    expect(calcularSuspensao(faltas, agoraPadrao)).toBeNull();
  });

  // --- RN22, RN23 e RN24: Valor da consulta ---
  /**
   * @caso CT-UNI-051
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN22
   * @objetivo Cobrar preço integral para paciente comum (< 60 anos, sem retorno)
   * @resultadoEsperado Retornar o precoBaseCentavos sem modificação
   */
  test('deve cobrar preço integral para paciente adulto sem direito a retorno', () => {
    const valor = calcularValor({ precoBaseCentavos: 15000, idadePaciente: 35, ehRetorno: false });
    expect(valor).toBe(15000);
  });

  /**
   * @caso CT-UNI-052
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Aplicar 10% de desconto para paciente com 60 anos ou mais
   * @resultadoEsperado Retornar 90% do valor arredondado ao centavo mais próximo
   */
  test('deve aplicar 10% de desconto para idoso de 60 anos ou mais', () => {
    // 15000 * 0.9 = 13500
    expect(calcularValor({ precoBaseCentavos: 15000, idadePaciente: 60, ehRetorno: false })).toBe(13500);
    // 25000 * 0.9 = 22500
    expect(calcularValor({ precoBaseCentavos: 25000, idadePaciente: 75, ehRetorno: false })).toBe(22500);
  });

  /**
   * @caso CT-UNI-053
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Retorno gratuito tem custo zero e prevalece sobre desconto de idade
   * @resultadoEsperado Retornar 0 mesmo se paciente for idoso
   */
  test('deve retornar 0 quando for retorno gratuito mesmo para idoso', () => {
    expect(calcularValor({ precoBaseCentavos: 30000, idadePaciente: 68, ehRetorno: true })).toBe(0);
    expect(calcularValor({ precoBaseCentavos: 20000, idadePaciente: 25, ehRetorno: true })).toBe(0);
  });

  /**
   * @caso CT-UNI-054
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Encontrar consulta realizada dentro dos 30 dias para conceder retorno gratuito
   * @resultadoEsperado Retornar o id da consulta realizada mais recente elegível
   */
  test('deve identificar consulta elegível para retorno dentro de 30 dias', () => {
    const novoInicio = new Date('2026-10-19T09:00:00');
    const realizadas = [
      { id: 10, inicio: new Date('2026-10-01T09:00:00') }, // 18 dias atrás
      { id: 5, inicio: new Date('2026-09-01T09:00:00') },  // mais de 30 dias atrás
    ];
    const idRetorno = encontrarConsultaDeRetorno(realizadas, [], novoInicio);
    expect(idRetorno).toBe(10);
  });

  /**
   * @caso CT-UNI-055
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Não conceder retorno se consulta realizada já foi utilizada em outro retorno
   * @resultadoEsperado encontrarConsultaDeRetorno retorna null
   */
  test('deve ignorar consulta já utilizada anteriormente como retorno', () => {
    const novoInicio = new Date('2026-10-19T09:00:00');
    const realizadas = [{ id: 10, inicio: new Date('2026-10-01T09:00:00') }];
    const idRetorno = encontrarConsultaDeRetorno(realizadas, [10], novoInicio);
    expect(idRetorno).toBeNull();
  });

  // --- RN25: Confirmação ---
  /**
   * @caso CT-UNI-056
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Permitir confirmação pelo paciente dono nas 48h anteriores à consulta
   * @resultadoEsperado verificarConfirmacao retorna null
   */
  test('deve permitir confirmação nas 48 horas anteriores à consulta pelo paciente', () => {
    const consulta = { status: STATUS.AGENDADA, inicio: somarMinutos(agoraPadrao, 24 * 60) }; // em 24h
    const ator = { perfil: 'PACIENTE', ehDono: true };
    expect(verificarConfirmacao(consulta, ator, agoraPadrao)).toBeNull();
  });

  /**
   * @caso CT-UNI-057
   * @nivel unitario
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN25
   * @objetivo Proibir confirmação por paciente que não é dono da consulta
   * @resultadoEsperado verificarConfirmacao retorna erro de PERMISSAO
   */
  test('deve impedir que outro paciente confirme a consulta', () => {
    const consulta = { status: STATUS.AGENDADA, inicio: somarMinutos(agoraPadrao, 24 * 60) };
    const ator = { perfil: 'PACIENTE', ehDono: false };
    const res = verificarConfirmacao(consulta, ator, agoraPadrao);
    expect(res).toEqual({ tipo: 'PERMISSAO', mensagem: expect.stringMatching(/Somente o paciente da consulta ou a recepção/i) });
  });

  /**
   * @caso CT-UNI-058
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN25
   * @objetivo Proibir confirmação com mais de 48 horas de antecedência
   * @resultadoEsperado Retornar erro informando o prazo de 48 horas
   */
  test('deve impedir confirmação antes da janela de 48 horas', () => {
    const consulta = { status: STATUS.AGENDADA, inicio: somarMinutos(agoraPadrao, 50 * 60) }; // em 50h
    const ator = { perfil: 'PACIENTE', ehDono: true };
    const res = verificarConfirmacao(consulta, ator, agoraPadrao);
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toMatch(/48 horas anteriores/i);
  });

  // --- RN26: Cancelamento ---
  /**
   * @caso CT-UNI-059
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Permitir cancelamento pelo paciente com mais de 24 horas de antecedência
   * @resultadoEsperado verificarCancelamento retorna null
   */
  test('deve permitir cancelamento pelo paciente com antecedência de 24 horas', () => {
    const consulta = { status: STATUS.AGENDADA, inicio: somarMinutos(agoraPadrao, 25 * 60) };
    const ator = { perfil: 'PACIENTE', ehDono: true };
    expect(verificarCancelamento(consulta, ator, agoraPadrao, '')).toBeNull();
  });

  /**
   * @caso CT-UNI-060
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN26
   * @objetivo Impedir cancelamento pelo paciente com menos de 24 horas de antecedência
   * @resultadoEsperado Retornar erro de regra informando prazo de 24h e para procurar a recepção
   */
  test('deve impedir cancelamento do paciente com menos de 24 horas', () => {
    const consulta = { status: STATUS.AGENDADA, inicio: somarMinutos(agoraPadrao, 20 * 60) };
    const ator = { perfil: 'PACIENTE', ehDono: true };
    const res = verificarCancelamento(consulta, ator, agoraPadrao, '');
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toMatch(/com no mínimo 24 horas de antecedência/i);
  });

  /**
   * @caso CT-UNI-061
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN26
   * @objetivo Exigir motivo de cancelamento para recepção e médico
   * @resultadoEsperado Retornar erro de regra caso motivo esteja em branco
   */
  test('deve exigir motivo de cancelamento quando efetuado pela recepção ou médico', () => {
    const consulta = { status: STATUS.AGENDADA, inicio: somarMinutos(agoraPadrao, 2 * 60) };
    const atorRecepcao = { perfil: 'RECEPCAO', ehDono: false };
    expect(verificarCancelamento(consulta, atorRecepcao, agoraPadrao, '')).toEqual({
      tipo: 'REGRA',
      mensagem: 'Informe o motivo do cancelamento.',
    });
    expect(verificarCancelamento(consulta, atorRecepcao, agoraPadrao, 'Paciente solicitou')).toBeNull();
  });

  // --- RN27: Remarcação ---
  /**
   * @caso CT-UNI-062
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Permitir remarcação com mais de 24h de antecedência quando remarcacoes < 2
   * @resultadoEsperado verificarRemarcacao retorna null
   */
  test('deve permitir remarcação válida até 24h antes e dentro do limite de 2 vezes', () => {
    const consulta = { status: STATUS.AGENDADA, inicio: somarMinutos(agoraPadrao, 26 * 60), remarcacoes: 1 };
    const ator = { perfil: 'PACIENTE', ehDono: true };
    expect(verificarRemarcacao(consulta, ator, agoraPadrao)).toBeNull();
  });

  /**
   * @caso CT-UNI-063
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN27
   * @objetivo Impedir remarcação que exceda o limite de 2 remarcações
   * @resultadoEsperado Retornar erro informando que atingiu o limite de 2 remarcações
   */
  test('deve impedir consulta de ser remarcada pela 3ª vez', () => {
    const consulta = { status: STATUS.AGENDADA, inicio: somarMinutos(agoraPadrao, 30 * 60), remarcacoes: 2 };
    const ator = { perfil: 'PACIENTE', ehDono: true };
    const res = verificarRemarcacao(consulta, ator, agoraPadrao);
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toMatch(/limite de 2 remarcações/i);
  });

  // --- RN28: Realização ---
  /**
   * @caso CT-UNI-064
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN28
   * @objetivo Permitir ao médico dono registrar atendimento a partir do horário de início
   * @resultadoEsperado verificarRealizacao retorna null
   */
  test('deve permitir ao médico dono registrar atendimento no horário da consulta', () => {
    const consulta = { status: STATUS.CONFIRMADA, inicio: agoraPadrao };
    const ator = { perfil: 'MEDICO', ehDono: true };
    expect(verificarRealizacao(consulta, ator, agoraPadrao)).toBeNull();
  });

  /**
   * @caso CT-UNI-065
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN28
   * @objetivo Proibir médico que não é dono ou recepção de registrar atendimento
   * @resultadoEsperado Retornar erro de PERMISSAO
   */
  test('deve impedir que recepção ou outro médico registre atendimento realizado', () => {
    const consulta = { status: STATUS.CONFIRMADA, inicio: agoraPadrao };
    expect(verificarRealizacao(consulta, { perfil: 'RECEPCAO', ehDono: false }, agoraPadrao)).toEqual({
      tipo: 'PERMISSAO',
      mensagem: expect.stringMatching(/Somente o médico da consulta/i),
    });
    expect(verificarRealizacao(consulta, { perfil: 'MEDICO', ehDono: false }, agoraPadrao)).toEqual({
      tipo: 'PERMISSAO',
      mensagem: expect.stringMatching(/Somente o médico da consulta/i),
    });
  });

  /**
   * @caso CT-UNI-066
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN28
   * @objetivo Impedir registro de atendimento antes do horário de início da consulta
   * @resultadoEsperado Retornar erro de regra informando que só pode registrar a partir do horário
   */
  test('deve impedir atendimento antes do horário de início', () => {
    const consulta = { status: STATUS.CONFIRMADA, inicio: somarMinutos(agoraPadrao, 10) };
    const ator = { perfil: 'MEDICO', ehDono: true };
    const res = verificarRealizacao(consulta, ator, agoraPadrao);
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toMatch(/a partir do horário da consulta/i);
  });

  // --- RN29: Falta ---
  /**
   * @caso CT-UNI-067
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Permitir registrar falta após 15 minutos do horário de início
   * @resultadoEsperado verificarFalta retorna null para médico dono e recepção
   */
  test('deve permitir registro de falta após 15 minutos do início', () => {
    const consulta = { status: STATUS.AGENDADA, inicio: somarMinutos(agoraPadrao, -16) }; // começou há 16 min
    expect(verificarFalta(consulta, { perfil: 'MEDICO', ehDono: true }, agoraPadrao)).toBeNull();
    expect(verificarFalta(consulta, { perfil: 'RECEPCAO', ehDono: false }, agoraPadrao)).toBeNull();
  });

  /**
   * @caso CT-UNI-068
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN29
   * @objetivo Impedir registro de falta antes de decorridos 15 minutos do início
   * @resultadoEsperado Retornar erro de tolerância de 15 minutos
   */
  test('deve impedir registro de falta antes de 15 minutos do início', () => {
    const consulta = { status: STATUS.AGENDADA, inicio: somarMinutos(agoraPadrao, -10) }; // começou há 10 min
    const res = verificarFalta(consulta, { perfil: 'RECEPCAO', ehDono: false }, agoraPadrao);
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toMatch(/15 minutos após o início/i);
  });

  /**
   * @caso CT-UNI-069
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN29
   * @objetivo Impedir paciente de registrar falta
   * @resultadoEsperado Retornar erro de PERMISSAO
   */
  test('deve impedir paciente de registrar falta', () => {
    const consulta = { status: STATUS.AGENDADA, inicio: somarMinutos(agoraPadrao, -30) };
    const res = verificarFalta(consulta, { perfil: 'PACIENTE', ehDono: true }, agoraPadrao);
    expect(res.tipo).toBe('PERMISSAO');
  });

  // --- RNF07: Manutenibilidade e Constantes do Domínio ---
  /**
   * @caso CT-UNI-070
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF07
   * @objetivo Validar que o objeto REGRAS é imutável e expõe todos os limites especificados
   * @resultadoEsperado REGRAS está congelado com Object.freeze e contém constantes corretas
   */
  test('deve manter objeto REGRAS imutável com os parâmetros do sistema', () => {
    expect(Object.isFrozen(REGRAS)).toBe(true);
    expect(REGRAS.ANTECEDENCIA_MINIMA_MIN).toBe(120);
    expect(REGRAS.ANTECEDENCIA_MAXIMA_DIAS).toBe(60);
    expect(REGRAS.MAX_CONSULTAS_ATIVAS).toBe(3);
    expect(REGRAS.MAX_ATIVAS_POR_ESPECIALIDADE).toBe(1);
    expect(REGRAS.LIMITE_FALTAS).toBe(3);
    expect(REGRAS.DESCONTO_IDOSO_PERCENTUAL).toBe(10);
  });
});
```
