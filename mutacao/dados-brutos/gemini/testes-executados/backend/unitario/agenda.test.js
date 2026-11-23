const {
  ABERTURA,
  FECHAMENTO,
  intervalosSobrepoem,
  validarBloco,
  validarGrade,
  gerarSlots,
  dataEmBloqueio,
} = require('../../src/domain/agenda');

describe('Regras de Agenda (agenda.js)', () => {
  // --- RN10: Blocos de Disponibilidade ---
  /**
   * @caso CT-UNI-023
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Aceitar bloco de disponibilidade com dados válidos
   * @resultadoEsperado validarBloco retorna null
   */
  test('deve validar bloco com dia de 0 a 6 e horário múltiplo de 15 entre 07:00 e 20:00', () => {
    const bloco = { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' };
    expect(validarBloco(bloco)).toBeNull();
  });

  /**
   * @caso CT-UNI-024
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN10
   * @objetivo Rejeitar bloco com dia da semana inválido (< 0 ou > 6 ou não inteiro)
   * @resultadoEsperado Retornar mensagem de erro sobre dia da semana
   */
  test('deve rejeitar dia da semana menor que 0 ou maior que 6', () => {
    expect(validarBloco({ diaSemana: -1, horaInicio: '08:00', horaFim: '12:00' })).toMatch(/Dia da semana deve ser um inteiro/i);
    expect(validarBloco({ diaSemana: 7, horaInicio: '08:00', horaFim: '12:00' })).toMatch(/Dia da semana deve ser um inteiro/i);
    expect(validarBloco({ diaSemana: '1', horaInicio: '08:00', horaFim: '12:00' })).toMatch(/Dia da semana deve ser um inteiro/i);
  });

  /**
   * @caso CT-UNI-025
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN10
   * @objetivo Rejeitar horários fora do formato HH:mm
   * @resultadoEsperado Retornar erro de formato de horários
   */
  test('deve rejeitar horários malformados', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '8:00', horaFim: '12:00' })).toMatch(/formato HH:mm/i);
    expect(validarBloco({ diaSemana: 1, horaInicio: '08:00', horaFim: 'tarde' })).toMatch(/formato HH:mm/i);
  });

  /**
   * @caso CT-UNI-026
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Rejeitar horários que não sejam múltiplos de 15 minutos
   * @resultadoEsperado Retornar erro sobre múltiplos de 15 minutos
   */
  test('deve rejeitar minutos não múltiplos de 15', () => {
    const bloco = { diaSemana: 2, horaInicio: '08:10', horaFim: '12:00' };
    expect(validarBloco(bloco)).toMatch(/múltiplos de 15 minutos/i);
  });

  /**
   * @caso CT-UNI-027
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN10
   * @objetivo Rejeitar horários antes das 07:00 ou após as 20:00
   * @resultadoEsperado Retornar erro de horários fora de 07:00 a 20:00
   */
  test('deve respeitar horários de abertura e fechamento da clínica', () => {
    expect(validarBloco({ diaSemana: 3, horaInicio: '06:45', horaFim: '10:00' })).toMatch(/entre 07:00 e 20:00/i);
    expect(validarBloco({ diaSemana: 3, horaInicio: '18:00', horaFim: '20:15' })).toMatch(/entre 07:00 e 20:00/i);
  });

  /**
   * @caso CT-UNI-028
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Rejeitar bloco onde hora de início seja igual ou posterior à hora de fim
   * @resultadoEsperado Retornar erro informando que início deve ser anterior ao fim
   */
  test('deve rejeitar início igual ou superior ao fim', () => {
    expect(validarBloco({ diaSemana: 4, horaInicio: '12:00', horaFim: '12:00' })).toMatch(/início deve ser anterior à hora de fim/i);
    expect(validarBloco({ diaSemana: 4, horaInicio: '14:00', horaFim: '12:00' })).toMatch(/início deve ser anterior à hora de fim/i);
  });

  // --- RN11: Sobreposição de Blocos ---
  /**
   * @caso CT-UNI-029
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Permitir blocos adjacentes no mesmo dia (encostar é permitido)
   * @resultadoEsperado validarGrade retorna null para blocos contíguos
   */
  test('deve permitir blocos encostados no mesmo dia', () => {
    const blocos = [
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 1, horaInicio: '12:00', horaFim: '16:00' },
    ];
    expect(validarGrade(blocos)).toBeNull();
  });

  /**
   * @caso CT-UNI-030
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Rejeitar blocos que se sobreponham no mesmo dia
   * @resultadoEsperado validarGrade retorna mensagem de sobreposição com os horários envolvidos
   */
  test('deve rejeitar blocos que se sobrepõem no mesmo dia', () => {
    const blocos = [
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 1, horaInicio: '11:00', horaFim: '14:00' },
    ];
    expect(validarGrade(blocos)).toMatch(/Blocos sobrepostos no dia 1/i);
  });

  /**
   * @caso CT-UNI-031
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Permitir horários coincidentes se forem em dias da semana diferentes
   * @resultadoEsperado validarGrade retorna null
   */
  test('deve permitir mesmos horários em dias da semana diferentes', () => {
    const blocos = [
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 2, horaInicio: '08:00', horaFim: '12:00' },
    ];
    expect(validarGrade(blocos)).toBeNull();
  });

  /**
   * @caso CT-UNI-032
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN11
   * @objetivo Rejeitar argumento de grade que não seja um array
   * @resultadoEsperado validarGrade retorna erro informando que deve ser uma lista
   */
  test('deve rejeitar entrada de grade não array', () => {
    expect(validarGrade(null)).toMatch(/A grade deve ser uma lista/i);
    expect(validarGrade({})).toMatch(/A grade deve ser uma lista/i);
  });

  // --- RN14: Geração de Slots ---
  /**
   * @caso CT-UNI-033
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Gerar slots sequenciais conforme a duração da consulta
   * @resultadoEsperado Retornar lista de horários de início calculados corretamente
   */
  test('deve gerar slots de 30 minutos em bloco de 08:00 as 10:00', () => {
    const blocos = [{ horaInicio: '08:00', horaFim: '10:00' }];
    const slots = gerarSlots(blocos, 30);
    expect(slots).toEqual(['08:00', '08:30', '09:00', '09:30']);
  });

  /**
   * @caso CT-UNI-034
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Descartar sobras de tempo onde uma consulta não cabe inteira
   * @resultadoEsperado Se bloco for de 45 min e consulta durar 30, gera apenas 1 slot
   */
  test('deve descartar minutos finais onde a consulta não cabe por inteiro', () => {
    const blocos = [{ horaInicio: '08:00', horaFim: '08:45' }];
    const slots = gerarSlots(blocos, 30);
    expect(slots).toEqual(['08:00']);
  });

  /**
   * @caso CT-UNI-035
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Ordenar slots cronologicamente mesmo se blocos forem passados fora de ordem
   * @resultadoEsperado Slots ordenados do mais cedo para o mais tarde
   */
  test('deve gerar slots ordenados independentemente da ordem dos blocos', () => {
    const blocos = [
      { horaInicio: '14:00', horaFim: '15:00' },
      { horaInicio: '08:00', horaFim: '09:00' },
    ];
    const slots = gerarSlots(blocos, 30);
    expect(slots).toEqual(['08:00', '08:30', '14:00', '14:30']);
  });

  // --- RN15: Bloqueio de Agenda ---
  /**
   * @caso CT-UNI-036
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Identificar se uma data está dentro de um período de bloqueio
   * @resultadoEsperado dataEmBloqueio retorna true para datas no intervalo inclusive
   */
  test('deve detectar datas contidas dentro do período de bloqueio', () => {
    const bloqueios = [
      { dataInicio: '2026-11-01', dataFim: '2026-11-10' },
    ];
    expect(dataEmBloqueio('2026-11-01', bloqueios)).toBe(true);
    expect(dataEmBloqueio('2026-11-05', bloqueios)).toBe(true);
    expect(dataEmBloqueio('2026-11-10', bloqueios)).toBe(true);
    expect(dataEmBloqueio('2026-11-11', bloqueios)).toBe(false);
    expect(dataEmBloqueio('2026-10-31', bloqueios)).toBe(false);
  });

  // --- RNF07: Manutenibilidade e Modularidade ---
  /**
   * @caso CT-UNI-037
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Testar função pura intervalosSobrepoem para casos limites
   * @resultadoEsperado Retornar true apenas quando há sobreposição real de horários
   */
  test('deve testar lógica de sobreposição de intervalos', () => {
    // 8h às 10h (480 a 600) e 9h às 11h (540 a 660) -> sobrepõe
    expect(intervalosSobrepoem(480, 600, 540, 660)).toBe(true);
    // 8h às 10h (480 a 600) e 10h às 12h (600 a 720) -> encosta, não sobrepõe
    expect(intervalosSobrepoem(480, 600, 600, 720)).toBe(false);
  });

  /**
   * @caso CT-UNI-038
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF07
   * @objetivo Constantes de abertura e fechamento são puras e calculadas em minutos
   * @resultadoEsperado ABERTURA = 420 (07:00) e FECHAMENTO = 1200 (20:00)
   */
  test('deve expor constantes de abertura e fechamento corretas em minutos', () => {
    expect(ABERTURA).toBe(7 * 60);
    expect(FECHAMENTO).toBe(20 * 60);
  });
});
