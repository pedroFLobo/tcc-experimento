# lote-168

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 13 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0534 | CT-UNI-128 | formatarMoeda converte centavos em reais no formato pt-BR | passou |  |
| mimo-0535 | CT-UNI-129 | formatarMoeda mostra zero para o retorno gratuito | passou |  |
| mimo-0536 | CT-UNI-130 | formatarMoeda exibe o valor do desconto do paciente idoso | passou |  |
| mimo-0537 | CT-UNI-131 | formatarDataHora converte data e hora para DD/MM/AAAA HH:mm | passou |  |
| mimo-0538 | CT-UNI-132 | formatarDataHora converte data sem hora para DD/MM/AAAA | passou |  |
| mimo-0539 | CT-UNI-133 | formatarDataHora devolve string vazia para entrada vazia | passou |  |
| mimo-0540 | CT-UNI-134 | formatarDataHora devolve string vazia para null e undefined | passou |  |
| mimo-0541 | CT-UNI-135 | STATUS_CONSULTA cobre todos os status da máquina de estados | passou |  |
| mimo-0542 | CT-UNI-136 | estaAtiva reconhece consulta AGENDADA como ativa | passou |  |
| mimo-0543 | CT-UNI-137 | estaAtiva reconhece consulta CONFIRMADA como ativa | passou |  |
| mimo-0544 | CT-UNI-138 | estaAtiva devolve false para os estados finais | passou |  |
| mimo-0545 | CT-UNI-139 | NOMES_DIAS cobre a semana começando no domingo | passou |  |
| mimo-0546 | CT-UNI-140 | hojeISO usa o relógio injetável e devolve a data no formato AAAA-MM-DD | passou |  |

## Arquivo: frontend/__testes__/unitario/formatadores.test.js

```js
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  NOMES_DIAS,
  STATUS_CONSULTA,
  estaAtiva,
  formatarDataHora,
  formatarMoeda,
  hojeISO,
} from '../../src/utils/formatadores';

// O toLocaleString('pt-BR') usa um espaço não separável entre "R$" e o valor.
const moeda = (centavos) => formatarMoeda(centavos).replace(/\u00a0/g, ' ');

describe('utils/formatadores', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * @caso CT-UNI-128
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN22, RF08.2
   * @objetivo Exibir o preço base da especialidade em reais no formato brasileiro
   * @resultadoEsperado formatarMoeda(15000) devolve "R$ 150,00"
   */
  test('formatarMoeda converte centavos em reais no formato pt-BR', () => {
    expect(moeda(15000)).toBe('R$ 150,00');
  });

  /**
   * @caso CT-UNI-129
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Exibir valor zero de retorno gratuito sem casas decimais estranhas
   * @resultadoEsperado formatarMoeda(0) devolve "R$ 0,00"
   */
  test('formatarMoeda mostra zero para o retorno gratuito', () => {
    expect(moeda(0)).toBe('R$ 0,00');
  });

  /**
   * @caso CT-UNI-130
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Exibir o valor com desconto de 10% do paciente idoso já arredondado
   * @resultadoEsperado formatarMoeda(27000) devolve "R$ 270,00"
   */
  test('formatarMoeda exibe o valor do desconto do paciente idoso', () => {
    expect(moeda(27000)).toBe('R$ 270,00');
  });

  /**
   * @caso CT-UNI-131
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Converter data e hora do padrão do sistema para o formato brasileiro com hora
   * @resultadoEsperado formatarDataHora("2026-10-19 08:30") devolve "19/10/2026 08:30"
   */
  test('formatarDataHora converte data e hora para DD/MM/AAAA HH:mm', () => {
    expect(formatarDataHora('2026-10-19 08:30')).toBe('19/10/2026 08:30');
  });

  /**
   * @caso CT-UNI-132
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Converter apenas a data sem inventar uma hora
   * @resultadoEsperado formatarDataHora("2026-10-19") devolve "19/10/2026"
   */
  test('formatarDataHora converte data sem hora para DD/MM/AAAA', () => {
    expect(formatarDataHora('2026-10-19')).toBe('19/10/2026');
  });

  /**
   * @caso CT-UNI-133
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RNF06
   * @objetivo Tratar entrada vazia de data sem lançar exceção
   * @resultadoEsperado formatarDataHora("") devolve string vazia
   */
  test('formatarDataHora devolve string vazia para entrada vazia', () => {
    expect(formatarDataHora('')).toBe('');
  });

  /**
   * @caso CT-UNI-134
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RNF06
   * @objetivo Tratar data nula ou indefinida sem lançar exceção
   * @resultadoEsperado formatarDataHora(null) e formatarDataHora(undefined) devolvem string vazia
   */
  test('formatarDataHora devolve string vazia para null e undefined', () => {
    expect(formatarDataHora(null)).toBe('');
    expect(formatarDataHora(undefined)).toBe('');
  });

  /**
   * @caso CT-UNI-135
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09
   * @objetivo Disponibilizar todos os status da máquina de estados da consulta
   * @resultadoEsperado STATUS_CONSULTA lista AGENDADA, CONFIRMADA, REALIZADA, FALTA e CANCELADA nessa ordem
   */
  test('STATUS_CONSULTA cobre todos os status da máquina de estados', () => {
    expect(STATUS_CONSULTA).toEqual(['AGENDADA', 'CONFIRMADA', 'REALIZADA', 'FALTA', 'CANCELADA']);
  });

  /**
   * @caso CT-UNI-136
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Considerar consulta AGENDADA como ativa para os limites do paciente
   * @resultadoEsperado estaAtiva({ status: "AGENDADA" }) devolve true
   */
  test('estaAtiva reconhece consulta AGENDADA como ativa', () => {
    expect(estaAtiva({ status: 'AGENDADA' })).toBe(true);
  });

  /**
   * @caso CT-UNI-137
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Considerar consulta CONFIRMADA como ativa para os limites do paciente
   * @resultadoEsperado estaAtiva({ status: "CONFIRMADA" }) devolve true
   */
  test('estaAtiva reconhece consulta CONFIRMADA como ativa', () => {
    expect(estaAtiva({ status: 'CONFIRMADA' })).toBe(true);
  });

  /**
   * @caso CT-UNI-138
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Não tratar estados finais da consulta como ativos
   * @resultadoEsperado estaAtiva devolve false para REALIZADA, FALTA e CANCELADA
   */
  test('estaAtiva devolve false para os estados finais', () => {
    const resultados = ['REALIZADA', 'FALTA', 'CANCELADA'].map((status) => estaAtiva({ status }));
    expect(resultados).toEqual([false, false, false]);
  });

  /**
   * @caso CT-UNI-139
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF05.1
   * @objetivo Disponibilizar os nomes dos dias da semana em português para a grade
   * @resultadoEsperado NOMES_DIAS tem 7 posições começando em "Domingo" e terminando em "Sábado"
   */
  test('NOMES_DIAS cobre a semana começando no domingo', () => {
    expect(NOMES_DIAS).toHaveLength(7);
    expect(NOMES_DIAS[0]).toBe('Domingo');
    expect(NOMES_DIAS[6]).toBe('Sábado');
  });

  /**
   * @caso CT-UNI-140
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Permitir fixar o relógio para testar o cálculo da data de hoje
   * @resultadoEsperado Com o relógio fixado em 2026-10-19T08:00:00, hojeISO devolve "2026-10-19"
   */
  test('hojeISO usa o relógio injetável e devolve a data no formato AAAA-MM-DD', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-19T08:00:00'));
    expect(hojeISO()).toBe('2026-10-19');
  });
});
```
