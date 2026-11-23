# lote-091

Modelo: gemini

Avalie com a skill `juiz-casos-teste` **somente os 8 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| gemini-0192 | CT-UNI-071 | deve formatar centavos para moeda Real (BRL) | passou |  |
| gemini-0193 | CT-UNI-072 | deve formatar zero centavos como R$ 0,00 | passou |  |
| gemini-0194 | CT-UNI-073 | deve formatar data simples sem hora para formato DD/MM/AAAA | passou |  |
| gemini-0195 | CT-UNI-074 | deve formatar data com hora para DD/MM/AAAA HH:mm | passou |  |
| gemini-0196 | CT-UNI-075 | deve lidar com valor vazio de data graciosamente | passou |  |
| gemini-0197 | CT-UNI-076 | deve retornar data no formato ISO AAAA-MM-DD | passou |  |
| gemini-0198 | CT-UNI-077 | deve expor constantes de dias e status corretas | passou |  |
| gemini-0199 | CT-UNI-078 | deve verificar se consulta é ativa no frontend | passou |  |

## Arquivo: frontend/__testes__/unitario/formatadores.test.js

```js
import { describe, test, expect } from 'vitest';
import {
  formatarMoeda,
  formatarDataHora,
  hojeISO,
  NOMES_DIAS,
  STATUS_CONSULTA,
  estaAtiva,
} from '../../src/utils/formatadores';

describe('Formatadores Utilitários (formatadores.js)', () => {
  // --- formatarMoeda (RN22, RNF06) ---
  /**
   * @caso CT-UNI-071
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RN22, RNF06
   * @objetivo Formatar valor em centavos para moeda brasileira BRL
   * @resultadoEsperado Retornar string no formato de moeda contendo '150,00'
   */
  test('deve formatar centavos para moeda Real (BRL)', () => {
    const formatado = formatarMoeda(15000);
    // substitui possíveis non-breaking space (char 160) por espaço simples
    const normalizado = formatado.replace(/\u00a0/g, ' ');
    expect(normalizado).toContain('150,00');
    expect(normalizado).toContain('R$');
  });

  /**
   * @caso CT-UNI-072
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24, RNF06
   * @objetivo Formatar valor zero centavos
   * @resultadoEsperado Retornar representação de R$ 0,00
   */
  test('deve formatar zero centavos como R$ 0,00', () => {
    const formatado = formatarMoeda(0).replace(/\u00a0/g, ' ');
    expect(formatado).toContain('0,00');
  });

  // --- formatarDataHora (RNF06) ---
  /**
   * @caso CT-UNI-073
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RNF06
   * @objetivo Converter data no formato ISO AAAA-MM-DD para DD/MM/AAAA
   * @resultadoEsperado Formato brasileiro de data
   */
  test('deve formatar data simples sem hora para formato DD/MM/AAAA', () => {
    expect(formatarDataHora('2026-10-19')).toBe('19/10/2026');
  });

  /**
   * @caso CT-UNI-074
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RNF06
   * @objetivo Converter data e hora AAAA-MM-DD HH:mm para DD/MM/AAAA HH:mm
   * @resultadoEsperado Formato brasileiro completo com horário
   */
  test('deve formatar data com hora para DD/MM/AAAA HH:mm', () => {
    expect(formatarDataHora('2026-10-19 08:30')).toBe('19/10/2026 08:30');
  });

  /**
   * @caso CT-UNI-075
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF06
   * @objetivo Retornar string vazia quando entrada for nula ou indefinida
   * @resultadoEsperado formatarDataHora retorna ''
   */
  test('deve lidar com valor vazio de data graciosamente', () => {
    expect(formatarDataHora('')).toBe('');
    expect(formatarDataHora(null)).toBe('');
    expect(formatarDataHora(undefined)).toBe('');
  });

  // --- hojeISO (RNF06) ---
  /**
   * @caso CT-UNI-076
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Gerar string da data atual no padrão AAAA-MM-DD
   * @resultadoEsperado Formato regex /^\d{4}-\d{2}-\d{2}$/
   */
  test('deve retornar data no formato ISO AAAA-MM-DD', () => {
    const hoje = hojeISO();
    expect(hoje).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // --- NOMES_DIAS e STATUS_CONSULTA ---
  /**
   * @caso CT-UNI-077
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF07
   * @objetivo Validar array de dias e lista de status
   * @resultadoEsperado NOMES_DIAS possui 7 itens começando em Domingo e STATUS_CONSULTA tem os 5 status
   */
  test('deve expor constantes de dias e status corretas', () => {
    expect(NOMES_DIAS).toHaveLength(7);
    expect(NOMES_DIAS[0]).toBe('Domingo');
    expect(NOMES_DIAS[6]).toBe('Sábado');
    expect(STATUS_CONSULTA).toEqual(['AGENDADA', 'CONFIRMADA', 'REALIZADA', 'FALTA', 'CANCELADA']);
  });

  // --- estaAtiva (RF09, RN25) ---
  /**
   * @caso CT-UNI-078
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF09
   * @objetivo Identificar se o objeto de consulta está com status ativo
   * @resultadoEsperado estaAtiva retorna true para AGENDADA e CONFIRMADA, false para os demais
   */
  test('deve verificar se consulta é ativa no frontend', () => {
    expect(estaAtiva({ status: 'AGENDADA' })).toBe(true);
    expect(estaAtiva({ status: 'CONFIRMADA' })).toBe(true);
    expect(estaAtiva({ status: 'REALIZADA' })).toBe(false);
    expect(estaAtiva({ status: 'CANCELADA' })).toBe(false);
    expect(estaAtiva({ status: 'FALTA' })).toBe(false);
  });
});
```
