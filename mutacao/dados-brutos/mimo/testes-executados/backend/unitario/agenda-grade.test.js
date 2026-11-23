/**
 * Regras puras de grade de disponibilidade e geração de horários (RN10, RN11, RN14).
 */
const {
  ABERTURA,
  FECHAMENTO,
  intervalosSobrepoem,
  validarBloco,
  validarGrade,
  gerarSlots,
  dataEmBloqueio,
} = require('../../src/domain/agenda');

const bloco = (diaSemana, horaInicio, horaFim) => ({ diaSemana, horaInicio, horaFim });

describe('RN10 — validação de bloco de disponibilidade', () => {
  /**
   * @caso CT-UNI-034
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Aceitar bloco dentro dos limites de dia, horário e múltiplos de 15
   * @resultadoEsperado validarBloco devolve null para 08:00–12:00 na segunda-feira
   */
  test('bloco válido dentro da janela de atendimento é aceito', () => {
    expect(validarBloco(bloco(1, '08:00', '12:00'))).toBe(null);
  });

  /**
   * @caso CT-UNI-035
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN10
   * @objetivo Rejeitar dia da semana fora da faixa 0–6
   * @resultadoEsperado validarBloco devolve mensagem de dia inválido para -1, 7 e 1.5
   */
  test('dia da semana fora de 0 a 6 é rejeitado', () => {
    const esperado = 'Dia da semana deve ser um inteiro de 0 (domingo) a 6 (sábado).';
    expect(validarBloco(bloco(-1, '08:00', '12:00'))).toBe(esperado);
    expect(validarBloco(bloco(7, '08:00', '12:00'))).toBe(esperado);
    expect(validarBloco(bloco(1.5, '08:00', '12:00'))).toBe(esperado);
    expect(validarBloco(bloco('1', '08:00', '12:00'))).toBe(esperado);
  });

  /**
   * @caso CT-UNI-036
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN10
   * @objetivo Rejeitar hora fora do padrão HH:mm
   * @resultadoEsperado validarBloco devolve mensagem de formato para '8:00' e '08:60'
   */
  test('horário fora do formato HH:mm é rejeitado', () => {
    const esperado = 'Horários devem estar no formato HH:mm.';
    expect(validarBloco(bloco(1, '8:00', '12:00'))).toBe(esperado);
    expect(validarBloco(bloco(1, '08:60', '12:00'))).toBe(esperado);
    expect(validarBloco(bloco(1, '08:00', '25:00'))).toBe(esperado);
  });

  /**
   * @caso CT-UNI-037
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN10
   * @objetivo Rejeitar horário que não é múltiplo de 15 minutos
   * @resultadoEsperado validarBloco devolve mensagem de múltiplos para 08:07
   */
  test('minutos que não são múltiplos de 15 são rejeitados', () => {
    expect(validarBloco(bloco(1, '08:07', '12:00'))).toBe('Horários devem ser múltiplos de 15 minutos.');
    expect(validarBloco(bloco(1, '08:00', '12:10'))).toBe('Horários devem ser múltiplos de 15 minutos.');
  });

  /**
   * @caso CT-UNI-038
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Rejeitar horário anterior às 07:00 ou posterior às 20:00 (valor-limite)
   * @resultadoEsperado validarBloco devolve mensagem de janela para 06:45 e 20:15
   */
  test('horário fora da janela 07:00–20:00 é rejeitado', () => {
    const esperado = 'Horários devem estar entre 07:00 e 20:00.';
    expect(validarBloco(bloco(1, '06:45', '12:00'))).toBe(esperado);
    expect(validarBloco(bloco(1, '08:00', '20:15'))).toBe(esperado);
    expect(validarBloco(bloco(1, '07:00', '20:00'))).toBe(null);
  });

  /**
   * @caso CT-UNI-039
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN10
   * @objetivo Rejeitar bloco cuja hora de fim não é posterior à de início
   * @resultadoEsperado validarBloco devolve mensagem para início igual e maior que o fim
   */
  test('início igual ou posterior ao fim é rejeitado', () => {
    const esperado = 'Hora de início deve ser anterior à hora de fim.';
    expect(validarBloco(bloco(1, '12:00', '12:00'))).toBe(esperado);
    expect(validarBloco(bloco(1, '14:00', '08:00'))).toBe(esperado);
  });

  /**
   * @caso CT-UNI-040
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Expor os limites de abertura e fechamento da clínica
   * @resultadoEsperado ABERTURA vale 420 minutos e FECHAMENTO vale 1200 minutos
   */
  test('limites de abertura e fechamento da clínica', () => {
    expect(ABERTURA).toBe(7 * 60);
    expect(FECHAMENTO).toBe(20 * 60);
  });
});

describe('RN11 — sobreposição de blocos', () => {
  /**
   * @caso CT-UNI-041
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Considerar que blocos encostados não se sobrepõem
   * @resultadoEsperado intervalosSobrepoem devolve false para 08:00–12:00 e 12:00–14:00
   */
  test('blocos encostados não se sobrepõem', () => {
    expect(intervalosSobrepoem(480, 720, 720, 840)).toBe(false);
  });

  /**
   * @caso CT-UNI-042
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Detectar sobreposição parcial entre dois blocos do mesmo dia
   * @resultadoEsperado validarGrade devolve mensagem de blocos sobrepostos
   */
  test('grade com blocos sobrepostos no mesmo dia é rejeitada', () => {
    const erro = validarGrade([bloco(1, '08:00', '12:00'), bloco(1, '11:00', '14:00')]);
    expect(erro).toBe('Blocos sobrepostos no dia 1: 08:00–12:00 e 11:00–14:00.');
  });

  /**
   * @caso CT-UNI-043
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Aceitar dois blocos encostados no mesmo dia
   * @resultadoEsperado validarGrade devolve null para 08:00–12:00 e 12:00–14:00
   */
  test('grade com blocos encostados no mesmo dia é aceita', () => {
    expect(validarGrade([bloco(1, '08:00', '12:00'), bloco(1, '12:00', '14:00')])).toBe(null);
  });

  /**
   * @caso CT-UNI-044
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN11
   * @objetivo Permitir o mesmo horário em dias diferentes da semana
   * @resultadoEsperado validarGrade devolve null para blocos idênticos em dias distintos
   */
  test('mesmo horário em dias diferentes é permitido', () => {
    expect(validarGrade([bloco(1, '08:00', '12:00'), bloco(3, '08:00', '12:00')])).toBe(null);
  });

  /**
   * @caso CT-UNI-045
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN10, RN11
   * @objetivo Rejeitar grade que não seja lista de blocos
   * @resultadoEsperado validarGrade devolve mensagem de lista para entrada não-array
   */
  test('grade que não é lista é rejeitada', () => {
    expect(validarGrade('08:00-12:00')).toBe('A grade deve ser uma lista de blocos.');
    expect(validarGrade(null)).toBe('A grade deve ser uma lista de blocos.');
  });

  /**
   * @caso CT-UNI-046
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN10
   * @objetivo Aceitar grade vazia como ausência de atendimento
   * @resultadoEsperado validarGrade devolve null para lista vazia
   */
  test('grade vazia é aceita', () => {
    expect(validarGrade([])).toBe(null);
  });
});

describe('RN14 — geração de slots', () => {
  /**
   * @caso CT-UNI-047
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Gerar slots de 30 minutos em um bloco de quatro horas
   * @resultadoEsperado gerarSlots devolve oito horários de 08:00 a 11:30
   */
  test('bloco de 4 horas com duração de 30 minutos gera 8 slots', () => {
    const slots = gerarSlots([bloco(1, '08:00', '12:00')], 30);
    expect(slots).toEqual(['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
  });

  /**
   * @caso CT-UNI-048
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Gerar slots de 45 minutos respeitando o encaixe inteiro no bloco
   * @resultadoEsperado gerarSlots devolve oito horários terminando em 14:15
   */
  test('duração de 45 minutos gera slots que cabem inteiros no bloco', () => {
    const slots = gerarSlots([bloco(3, '09:00', '15:00')], 45);
    expect(slots).toEqual(['09:00', '09:45', '10:30', '11:15', '12:00', '12:45', '13:30', '14:15']);
  });

  /**
   * @caso CT-UNI-049
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN14
   * @objetivo Descartar a sobra do bloco quando a consulta não cabe inteira
   * @resultadoEsperado gerarSlots devolve apenas 08:00 para bloco de 50 minutos com duração 30
   */
  test('sobra menor que a duração não vira slot', () => {
    expect(gerarSlots([bloco(1, '08:00', '08:50')], 30)).toEqual(['08:00']);
  });

  /**
   * @caso CT-UNI-050
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN14
   * @objetivo Gerar lista vazia quando o dia não tem bloco
   * @resultadoEsperado gerarSlots devolve [] para lista de blocos vazia
   */
  test('dia sem bloco gera nenhum slot', () => {
    expect(gerarSlots([], 30)).toEqual([]);
  });

  /**
   * @caso CT-UNI-051
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Gerar slots mesmo com os blocos fora de ordem na lista
   * @resultadoEsperado gerarSlots ordena pelo horário de início e devolve a sequência crescente
   */
  test('blocos desordenados são gerados em ordem crescente', () => {
    const slots = gerarSlots([bloco(1, '14:00', '18:00'), bloco(1, '08:00', '12:00')], 120);
    expect(slots).toEqual(['08:00', '10:00', '14:00', '16:00']);
  });

  /**
   * @caso CT-UNI-052
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Detectar data coberta por um bloqueio de agenda, inclusive nos limites
   * @resultadoEsperado dataEmBloqueio devolve true dentro do período e false fora dele
   */
  test('dataEmBloqueio respeita os limites inicial e final', () => {
    const bloqueios = [{ dataInicio: '2026-11-01', dataFim: '2026-11-05' }];
    expect(dataEmBloqueio('2026-11-01', bloqueios)).toBe(true);
    expect(dataEmBloqueio('2026-11-03', bloqueios)).toBe(true);
    expect(dataEmBloqueio('2026-11-05', bloqueios)).toBe(true);
    expect(dataEmBloqueio('2026-10-31', bloqueios)).toBe(false);
    expect(dataEmBloqueio('2026-11-06', bloqueios)).toBe(false);
  });

  /**
   * @caso CT-UNI-053
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN15
   * @objetivo Considerar dia sem nenhum bloqueio como disponível
   * @resultadoEsperado dataEmBloqueio devolve false para lista de bloqueios vazia
   */
  test('data sem bloqueios está disponível', () => {
    expect(dataEmBloqueio('2026-11-03', [])).toBe(false);
  });
});
