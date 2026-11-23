// Testes unitários das funções puras de data/hora — base das regras de agenda (RNF07).
const {
  parseData, parseDataHora, formatarData, formatarDataHora,
  horaParaMinutos, minutosParaHora, somarMinutos, somarDias, minutosEntre, inicioDoDia,
} = require('../../src/utils/datas');

describe('utilitários de datas (RNF07)', () => {
  /**
   * @caso CT-UNI-114
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Converter texto AAAA-MM-DD em Date local e recusar datas inexistentes
   * @resultadoEsperado parseData retorna Date local para '2026-10-19' e null para '2026-02-30' e '19/10/2026'
   */
  test('parseData valida datas reais no formato AAAA-MM-DD', () => {
    expect(parseData('2026-10-19')).toEqual(new Date(2026, 9, 19));
    expect(parseData('2026-02-30')).toBeNull();
    expect(parseData('19/10/2026')).toBeNull();
  });

  /**
   * @caso CT-UNI-115
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Aceitar data e hora com espaço ou com 'T' e recusar horas inválidas
   * @resultadoEsperado parseDataHora aceita '2026-10-19 08:30' e '2026-10-19T08:30'; retorna null para '2026-10-19 24:00' e '2026-10-19 08:60'
   */
  test('parseDataHora aceita os dois separadores e recusa horas inválidas', () => {
    const esperado = new Date(2026, 9, 19, 8, 30);
    expect(parseDataHora('2026-10-19 08:30')).toEqual(esperado);
    expect(parseDataHora('2026-10-19T08:30')).toEqual(esperado);
    expect(parseDataHora('2026-10-19 24:00')).toBeNull();
    expect(parseDataHora('2026-10-19 08:60')).toBeNull();
  });

  /**
   * @caso CT-UNI-116
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF07
   * @objetivo Formatar datas e data-hora no padrão da clínica com zeros à esquerda
   * @resultadoEsperado formatarDataHora retorna '2026-10-19 08:05' e formatarData '2026-10-19'
   */
  test('formata com zeros à esquerda', () => {
    expect(formatarDataHora(new Date(2026, 9, 19, 8, 5))).toBe('2026-10-19 08:05');
    expect(formatarData(new Date(2026, 9, 19, 8, 5))).toBe('2026-10-19');
  });

  /**
   * @caso CT-UNI-117
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF07, RN14
   * @objetivo Converter horas em minutos e voltar, base da geração de slots
   * @resultadoEsperado horaParaMinutos('08:30') é 510 e minutosParaHora(510) é '08:30'
   */
  test('horaParaMinutos e minutosParaHora são simétricos', () => {
    expect(horaParaMinutos('08:30')).toBe(510);
    expect(minutosParaHora(510)).toBe('08:30');
    expect(horaParaMinutos('07:00')).toBe(420);
  });

  /**
   * @caso CT-UNI-118
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF07
   * @objetivo Retornar null para hora malformada em vez de lançar erro
   * @resultadoEsperado horaParaMinutos retorna null para '8h30', '' e null
   */
  test('horaParaMinutos recusa texto inválido', () => {
    expect(horaParaMinutos('8h30')).toBeNull();
    expect(horaParaMinutos('')).toBeNull();
    expect(horaParaMinutos(null)).toBeNull();
  });

  /**
   * @caso CT-UNI-119
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07, RN16
   * @objetivo Somar dias atravessando o fim do mês corretamente
   * @resultadoEsperado somarDias de 2026-10-31 mais 1 dia é 2026-11-01
   */
  test('somarDias atravessa o fim do mês', () => {
    expect(somarDias(new Date(2026, 9, 31), 1)).toEqual(new Date(2026, 10, 1));
  });

  /**
   * @caso CT-UNI-120
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07, RN29
   * @objetivo Somar minutos para a tolerância de falta e medir intervalos em minutos
   * @resultadoEsperado somarMinutos avança 15 minutos e minutosEntre retorna 150 para 08:00 até 10:30
   */
  test('somarMinutos e minutosEntre calculam em minutos', () => {
    const inicio = new Date(2026, 9, 19, 8, 0);
    expect(somarMinutos(inicio, 15)).toEqual(new Date(2026, 9, 19, 8, 15));
    expect(minutosEntre(inicio, new Date(2026, 9, 19, 10, 30))).toBe(150);
  });

  /**
   * @caso CT-UNI-121
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Zerar o horário ao obter o início do dia
   * @resultadoEsperado inicioDoDia retorna 2026-10-19 00:00 para 2026-10-19 08:37
   */
  test('inicioDoDia zera horas e minutos', () => {
    expect(inicioDoDia(new Date(2026, 9, 19, 8, 37))).toEqual(new Date(2026, 9, 19, 0, 0));
  });
});
