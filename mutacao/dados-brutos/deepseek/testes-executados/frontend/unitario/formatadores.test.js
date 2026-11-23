// Formatadores puros usados por toda a interface (RF09, RN23, RNF06).
import { describe, test, expect, afterEach, vi } from 'vitest';
import {
  formatarMoeda,
  formatarDataHora,
  hojeISO,
  NOMES_DIAS,
  STATUS_CONSULTA,
  estaAtiva,
} from '../../src/utils/formatadores';

// O Intl separa "R$" do valor com espaço não separável; normalizamos só para comparar.
const brl = (texto) => texto.replace(/\u00a0/g, ' ');

describe('formatarMoeda', () => {
  /**
   * @caso CT-UNI-301
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN22, RNF06
   * @objetivo Converter centavos inteiros em moeda brasileira
   * @resultadoEsperado 15000 centavos viram "R$ 150,00"
   */
  test('formata valores em reais a partir de centavos', () => {
    expect(brl(formatarMoeda(15000))).toBe('R$ 150,00');
  });

  /**
   * @caso CT-UNI-302
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.2, RN24
   * @objetivo Representar o retorno gratuito sem casas decimais indevidas
   * @resultadoEsperado 0 centavos vira "R$ 0,00"
   */
  test('formata o valor zero', () => {
    expect(brl(formatarMoeda(0))).toBe('R$ 0,00');
  });

  /**
   * @caso CT-UNI-303
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Formatar o preço com desconto de idoso da Clínica Geral
   * @resultadoEsperado 13500 centavos viram "R$ 135,00"
   */
  test('formata o valor com desconto de idoso', () => {
    expect(brl(formatarMoeda(13500))).toBe('R$ 135,00');
  });

  /**
   * @caso CT-UNI-304
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF03.1, RN22
   * @objetivo Formatar o preço base da Cardiologia
   * @resultadoEsperado 30000 centavos viram "R$ 300,00"
   */
  test('formata o preço da Cardiologia', () => {
    expect(brl(formatarMoeda(30000))).toBe('R$ 300,00');
  });

  /**
   * @caso CT-UNI-305
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Usar separador de milhar e vírgula decimal do padrão brasileiro
   * @resultadoEsperado 123456 centavos viram "R$ 1.234,56"
   */
  test('usa milhar com ponto e decimal com vírgula', () => {
    expect(brl(formatarMoeda(123456))).toBe('R$ 1.234,56');
  });

  /**
   * @caso CT-UNI-306
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Formatar centavos com apenas um dígito de centavo
   * @resultadoEsperado 199 centavos viram "R$ 1,99"
   */
  test('preserva centavos menores que dez', () => {
    expect(brl(formatarMoeda(199))).toBe('R$ 1,99');
  });

  /**
   * @caso CT-UNI-307
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Exibir o sinal negativo em estornos ou ajustes
   * @resultadoEsperado -1000 centavos viram "-R$ 10,00"
   */
  test('formata valores negativos', () => {
    expect(brl(formatarMoeda(-1000))).toBe('-R$ 10,00');
  });

  /**
   * @caso CT-UNI-308
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF11.1, RNF05
   * @objetivo Suportar faturamento alto no relatório sem perder legibilidade
   * @resultadoEsperado 100000000 centavos viram "R$ 1.000.000,00"
   */
  test('formata faturamento de sete dígitos', () => {
    expect(brl(formatarMoeda(100000000))).toBe('R$ 1.000.000,00');
  });
});

describe('formatarDataHora', () => {
  /**
   * @caso CT-UNI-309
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Converter data ISO em data brasileira
   * @resultadoEsperado "2026-10-19" vira "19/10/2026"
   */
  test('converte data ISO para o padrão brasileiro', () => {
    expect(formatarDataHora('2026-10-19')).toBe('19/10/2026');
  });

  /**
   * @caso CT-UNI-310
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Converter data e hora ISO em data e hora brasileiras
   * @resultadoEsperado "2026-10-19 08:00" vira "19/10/2026 08:00"
   */
  test('converte data e hora ISO', () => {
    expect(formatarDataHora('2026-10-19 08:00')).toBe('19/10/2026 08:00');
  });

  /**
   * @caso CT-UNI-311
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Não quebrar ao renderizar um campo sem valor
   * @resultadoEsperado String vazia é devolvida para entrada vazia
   */
  test('devolve string vazia para entrada vazia', () => {
    expect(formatarDataHora('')).toBe('');
  });

  /**
   * @caso CT-UNI-312
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Tratar campos opcionais nulos como ausentes
   * @resultadoEsperado null e undefined devolvem string vazia
   */
  test('devolve string vazia para null e undefined', () => {
    expect(formatarDataHora(null)).toBe('');
    expect(formatarDataHora(undefined)).toBe('');
  });

  /**
   * @caso CT-UNI-313
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.3, RNF06
   * @objetivo Formatar a data de nascimento de um paciente adulto
   * @resultadoEsperado "1990-05-14" vira "14/05/1990"
   */
  test('formata data de nascimento', () => {
    expect(formatarDataHora('1990-05-14')).toBe('14/05/1990');
  });

  /**
   * @caso CT-UNI-314
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Manter horários no fim do dia sem conversão de fuso
   * @resultadoEsperado "2026-01-05 23:59" vira "05/01/2026 23:59"
   */
  test('preserva horário no fim do dia', () => {
    expect(formatarDataHora('2026-01-05 23:59')).toBe('05/01/2026 23:59');
  });

  /**
   * @caso CT-UNI-315
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RNF06
   * @objetivo Formatar ano bissexto sem deslocar o dia
   * @resultadoEsperado "2028-02-29" vira "29/02/2028"
   */
  test('formata 29 de fevereiro', () => {
    expect(formatarDataHora('2028-02-29')).toBe('29/02/2028');
  });

  /**
   * @caso CT-UNI-316
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Formatar o último dia do ano com meia-noite
   * @resultadoEsperado "2026-12-31 00:00" vira "31/12/2026 00:00"
   */
  test('formata virada de ano à meia-noite', () => {
    expect(formatarDataHora('2026-12-31 00:00')).toBe('31/12/2026 00:00');
  });
});

describe('hojeISO', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * @caso CT-UNI-317
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Devolver a data local no formato usado pela API
   * @resultadoEsperado Retorna uma string no padrão AAAA-MM-DD
   */
  test('devolve data no formato AAAA-MM-DD', () => {
    expect(hojeISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  /**
   * @caso CT-UNI-318
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.2, RNF06
   * @objetivo Preencher o filtro de data da agenda do médico com o dia atual
   * @resultadoEsperado Com o relógio em 19/10/2026 devolve "2026-10-19"
   */
  test('usa o dia corrente do relógio local', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 19, 8, 0, 0));
    expect(hojeISO()).toBe('2026-10-19');
  });

  /**
   * @caso CT-UNI-319
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF07
   * @objetivo Não perder o zero à esquerda em meses e dias menores que dez
   * @resultadoEsperado Em 05/01/2026 devolve "2026-01-05"
   */
  test('preenche mês e dia com zero à esquerda', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0, 0));
    expect(hojeISO()).toBe('2026-01-05');
  });

  /**
   * @caso CT-UNI-320
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RNF07
   * @objetivo Manter o ano correto no último dia do ano
   * @resultadoEsperado Em 31/12/2026 devolve "2026-12-31"
   */
  test('devolve o ano corrente na virada do ano', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 31, 23, 30, 0));
    expect(hojeISO()).toBe('2026-12-31');
  });
});

describe('NOMES_DIAS', () => {
  /**
   * @caso CT-UNI-321
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.1, RN10
   * @objetivo Oferecer os sete dias usados na grade semanal
   * @resultadoEsperado O array tem exatamente sete posições
   */
  test('lista os sete dias da semana', () => {
    expect(NOMES_DIAS).toHaveLength(7);
  });

  /**
   * @caso CT-UNI-322
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.1, RN10
   * @objetivo Alinhar o índice do array ao retorno de Date.getDay
   * @resultadoEsperado Índice 0 é Domingo e índice 6 é Sábado
   */
  test('começa no domingo e termina no sábado', () => {
    expect(NOMES_DIAS[0]).toBe('Domingo');
    expect(NOMES_DIAS[6]).toBe('Sábado');
  });

  /**
   * @caso CT-UNI-323
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.1, RN10
   * @objetivo Nomear a segunda-feira, dia da semana fixado nos testes
   * @resultadoEsperado Índice 1 corresponde a "Segunda"
   */
  test('nomeia a segunda-feira no índice 1', () => {
    const segunda = new Date(2026, 9, 19);
    expect(NOMES_DIAS[segunda.getDay()]).toBe('Segunda');
  });
});

describe('STATUS_CONSULTA', () => {
  /**
   * @caso CT-UNI-324
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09
   * @objetivo Expor todos os estados da máquina de consultas nos filtros
   * @resultadoEsperado O array contém os cinco status na ordem de exibição
   */
  test('lista os cinco status na ordem esperada', () => {
    expect(STATUS_CONSULTA).toEqual(['AGENDADA', 'CONFIRMADA', 'REALIZADA', 'FALTA', 'CANCELADA']);
  });

  /**
   * @caso CT-UNI-325
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2
   * @objetivo Garantir que o status final CANCELADA não some da lista de filtros
   * @resultadoEsperado O array inclui CANCELADA
   */
  test('inclui o status final CANCELADA', () => {
    expect(STATUS_CONSULTA).toContain('CANCELADA');
  });
});

describe('estaAtiva', () => {
  /**
   * @caso CT-UNI-326
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09, RN25
   * @objetivo Considerar AGENDADA como consulta que ainda aceita ações
   * @resultadoEsperado estaAtiva devolve true
   */
  test('considera AGENDADA ativa', () => {
    expect(estaAtiva({ status: 'AGENDADA' })).toBe(true);
  });

  /**
   * @caso CT-UNI-327
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RF09.3, RN26, RN27
   * @objetivo Considerar CONFIRMADA como consulta que ainda aceita cancelamento e remarcação
   * @resultadoEsperado estaAtiva devolve true
   */
  test('considera CONFIRMADA ativa', () => {
    expect(estaAtiva({ status: 'CONFIRMADA' })).toBe(true);
  });

  /**
   * @caso CT-UNI-328
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.4
   * @objetivo Não oferecer ações para consultas já realizadas
   * @resultadoEsperado estaAtiva devolve false para REALIZADA
   */
  test('considera REALIZADA inativa', () => {
    expect(estaAtiva({ status: 'REALIZADA' })).toBe(false);
  });

  /**
   * @caso CT-UNI-329
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.5, RN29
   * @objetivo Não oferecer ações para consultas com falta registrada
   * @resultadoEsperado estaAtiva devolve false para FALTA
   */
  test('considera FALTA inativa', () => {
    expect(estaAtiva({ status: 'FALTA' })).toBe(false);
  });

  /**
   * @caso CT-UNI-330
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Tratar status desconhecido como inativo em vez de lançar erro
   * @resultadoEsperado estaAtiva devolve false para CANCELADA e para valor arbitrário
   */
  test('considera CANCELADA e status desconhecido inativos', () => {
    expect(estaAtiva({ status: 'CANCELADA' })).toBe(false);
    expect(estaAtiva({ status: 'INEXISTENTE' })).toBe(false);
  });
});
