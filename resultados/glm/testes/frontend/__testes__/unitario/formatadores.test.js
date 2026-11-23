// Testes unitários dos formatadores e constantes do frontend (RNF06, usabilidade).
import { describe, test, expect, vi, afterEach } from 'vitest';
import { formatarMoeda, formatarDataHora, hojeISO, NOMES_DIAS, STATUS_CONSULTA, estaAtiva } from '../../src/utils/formatadores.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('formatarMoeda (RNF06)', () => {
  /**
   * @caso CT-UNI-122
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Converter centavos em reais com duas casas no padrão brasileiro
   * @resultadoEsperado 15000 centavos aparece como R$ 150,00
   */
  test('converte centavos em reais', () => {
    expect(formatarMoeda(15000)).toContain('150,00');
    expect(formatarMoeda(15000)).toContain('R$');
  });

  /**
   * @caso CT-UNI-123
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Exibir valor zero de consulta de retorno de forma legível
   * @resultadoEsperado 0 centavos aparece como R$ 0,00
   */
  test('exibe zero corretamente', () => {
    expect(formatarMoeda(0)).toContain('0,00');
  });

  /**
   * @caso CT-UNI-124
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06, RN23
   * @objetivo Exibir valor com desconto de idoso aplicado (24300 centavos)
   * @resultadoEsperado 24300 centavos aparece como R$ 243,00
   */
  test('exibe valor com centavos exatos', () => {
    expect(formatarMoeda(24300)).toContain('243,00');
  });
});

describe('formatarDataHora (RNF06)', () => {
  /**
   * @caso CT-UNI-125
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Converter data e hora ISO para o formato nacional
   * @resultadoEsperado '2026-10-20 08:00' vira '20/10/2026 08:00'
   */
  test('formata data com hora', () => {
    expect(formatarDataHora('2026-10-20 08:00')).toBe('20/10/2026 08:00');
  });

  /**
   * @caso CT-UNI-126
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Converter data sem hora
   * @resultadoEsperado '2026-10-20' vira '20/10/2026'
   */
  test('formata data sem hora', () => {
    expect(formatarDataHora('2026-10-20')).toBe('20/10/2026');
  });

  /**
   * @caso CT-UNI-127
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF06
   * @objetivo Tratar valores vazios sem quebrar a tela
   * @resultadoEsperado texto vazio e nulo retornam string vazia
   */
  test('retorna vazio para datas ausentes', () => {
    expect(formatarDataHora('')).toBe('');
    expect(formatarDataHora(null)).toBe('');
  });
});

describe('hojeISO (RNF07)', () => {
  /**
   * @caso CT-UNI-128
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Produzir a data local de hoje no formato AAAA-MM-DD
   * @resultadoEsperado com relógio em 2026-10-19, hojeISO devolve '2026-10-19'
   */
  test('devolve a data de hoje no formato ISO', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 19, 8, 0));
    expect(hojeISO()).toBe('2026-10-19');
  });

  /**
   * @caso CT-UNI-129
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Preencher mês e dia com zeros à esquerda
   * @resultadoEsperado com relógio em 2026-03-05, hojeISO devolve '2026-03-05'
   */
  test('preenche mês e dia com zeros', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 5, 7, 30));
    expect(hojeISO()).toBe('2026-03-05');
  });
});

describe('constantes e utilidades de status (RF10)', () => {
  /**
   * @caso CT-UNI-130
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10, RN25
   * @objetivo Expor os 5 status do ciclo de vida na ordem da máquina de estados
   * @resultadoEsperado STATUS_CONSULTA contém exatamente AGENDADA, CONFIRMADA, REALIZADA, FALTA e CANCELADA
   */
  test('STATUS_CONSULTA traz os 5 status', () => {
    expect(STATUS_CONSULTA).toEqual(['AGENDADA', 'CONFIRMADA', 'REALIZADA', 'FALTA', 'CANCELADA']);
  });

  /**
   * @caso CT-UNI-131
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Classificar como ativas apenas consultas AGENDADA e CONFIRMADA
   * @resultadoEsperado estaAtiva retorna true para AGENDADA/CONFIRMADA e false para os demais
   */
  test('estaAtiva reconhece apenas status ativos', () => {
    expect(estaAtiva({ status: 'AGENDADA' })).toBe(true);
    expect(estaAtiva({ status: 'CONFIRMADA' })).toBe(true);
    expect(estaAtiva({ status: 'REALIZADA' })).toBe(false);
    expect(estaAtiva({ status: 'FALTA' })).toBe(false);
    expect(estaAtiva({ status: 'CANCELADA' })).toBe(false);
  });
});
