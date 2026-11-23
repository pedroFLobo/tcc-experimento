# lote-038

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 24 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0612 | CT-UNI-064 | converte data válida | passou |  |
| deepseek-0613 | CT-UNI-065 | devolve null para entrada vazia | passou |  |
| deepseek-0614 | CT-UNI-066 | recusa formato diferente | passou |  |
| deepseek-0615 | CT-UNI-067 | recusa data inexistente | passou |  |
| deepseek-0616 | CT-UNI-068 | aceita 29 de fevereiro bissexto | passou |  |
| deepseek-0617 | CT-UNI-069 | recusa 29 de fevereiro em ano comum | passou |  |
| deepseek-0618 | CT-UNI-070 | converte data e hora com espaço | passou |  |
| deepseek-0619 | CT-UNI-071 | aceita separador T | passou |  |
| deepseek-0620 | CT-UNI-072 | recusa hora 24:00 | passou |  |
| deepseek-0621 | CT-UNI-073 | recusa minuto 60 | passou |  |
| deepseek-0622 | CT-UNI-074 | recusa texto sem hora | passou |  |
| deepseek-0623 | CT-UNI-075 | formata data com zero à esquerda | passou |  |
| deepseek-0624 | CT-UNI-076 | formata data e hora | passou |  |
| deepseek-0625 | CT-UNI-077 | formatação é inversa da interpretação | passou |  |
| deepseek-0626 | CT-UNI-078 | converte 07:00 em 420 minutos | passou |  |
| deepseek-0627 | CT-UNI-079 | converte extremos do dia | passou |  |
| deepseek-0628 | CT-UNI-080 | recusa horário malformado | passou |  |
| deepseek-0629 | CT-UNI-081 | converte minutos para hora | passou |  |
| deepseek-0630 | CT-UNI-082 | soma minutos atravessando a hora | passou |  |
| deepseek-0631 | CT-UNI-083 | soma dias atravessando o mês | passou |  |
| deepseek-0632 | CT-UNI-084 | subtrai dias | passou |  |
| deepseek-0633 | CT-UNI-085 | calcula diferença em minutos | passou |  |
| deepseek-0634 | CT-UNI-086 | calcula diferença negativa | passou |  |
| deepseek-0635 | CT-UNI-087 | obtém o início do dia | passou |  |

## Arquivo: backend/__testes__/unitario/utils-datas.test.js

```js
// Utilitários puros de data e hora (formato local AAAA-MM-DD[ HH:mm]).
const {
  parseData,
  parseDataHora,
  formatarData,
  formatarDataHora,
  horaParaMinutos,
  minutosParaHora,
  somarMinutos,
  somarDias,
  minutosEntre,
  inicioDoDia,
} = require('../../src/utils/datas');

describe('parseData', () => {
  /**
   * @caso CT-UNI-064
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Converter uma data ISO em Date local
   * @resultadoEsperado parseData devolve 19/10/2026
   */
  test('converte data válida', () => {
    const d = parseData('2026-10-19');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(19);
  });

  /**
   * @caso CT-UNI-065
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04, RNF07
   * @objetivo Devolver null para entradas vazias
   * @resultadoEsperado parseData devolve null para '', null e undefined
   */
  test('devolve null para entrada vazia', () => {
    expect(parseData('')).toBeNull();
    expect(parseData(null)).toBeNull();
    expect(parseData(undefined)).toBeNull();
  });

  /**
   * @caso CT-UNI-066
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Recusar data em formato diferente de AAAA-MM-DD
   * @resultadoEsperado parseData devolve null para 19/10/2026 e para 2026-1-1
   */
  test('recusa formato diferente', () => {
    expect(parseData('19/10/2026')).toBeNull();
    expect(parseData('2026-1-1')).toBeNull();
  });

  /**
   * @caso CT-UNI-067
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar data inexistente no calendário
   * @resultadoEsperado parseData devolve null para 31 de fevereiro e mês 13
   */
  test('recusa data inexistente', () => {
    expect(parseData('2026-02-31')).toBeNull();
    expect(parseData('2026-13-01')).toBeNull();
  });

  /**
   * @caso CT-UNI-068
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Aceitar 29 de fevereiro em ano bissexto
   * @resultadoEsperado parseData devolve a data de 29/02/2024
   */
  test('aceita 29 de fevereiro bissexto', () => {
    expect(parseData('2024-02-29').getDate()).toBe(29);
  });

  /**
   * @caso CT-UNI-069
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Recusar 29 de fevereiro em ano não bissexto
   * @resultadoEsperado parseData devolve null para 29/02/2023
   */
  test('recusa 29 de fevereiro em ano comum', () => {
    expect(parseData('2023-02-29')).toBeNull();
  });
});

describe('parseDataHora', () => {
  /**
   * @caso CT-UNI-070
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Converter data e hora separadas por espaço
   * @resultadoEsperado parseDataHora devolve 08:30 do dia 19/10/2026
   */
  test('converte data e hora com espaço', () => {
    const d = parseDataHora('2026-10-19 08:30');
    expect(d.getHours()).toBe(8);
    expect(d.getMinutes()).toBe(30);
  });

  /**
   * @caso CT-UNI-071
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF07
   * @objetivo Aceitar a variante ISO com a letra T entre data e hora
   * @resultadoEsperado parseDataHora devolve a mesma data para o formato com T
   */
  test('aceita separador T', () => {
    expect(parseDataHora('2026-10-19T14:00').getHours()).toBe(14);
  });

  /**
   * @caso CT-UNI-072
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Recusar hora inexistente 24:00
   * @resultadoEsperado parseDataHora devolve null
   */
  test('recusa hora 24:00', () => {
    expect(parseDataHora('2026-10-19 24:00')).toBeNull();
  });

  /**
   * @caso CT-UNI-073
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Recusar minuto 60
   * @resultadoEsperado parseDataHora devolve null
   */
  test('recusa minuto 60', () => {
    expect(parseDataHora('2026-10-19 10:60')).toBeNull();
  });

  /**
   * @caso CT-UNI-074
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar texto sem hora
   * @resultadoEsperado parseDataHora devolve null para '2026-10-19'
   */
  test('recusa texto sem hora', () => {
    expect(parseDataHora('2026-10-19')).toBeNull();
  });
});

describe('formatação de data e hora', () => {
  /**
   * @caso CT-UNI-075
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Formatar data com zero à esquerda
   * @resultadoEsperado formatarData devolve '2026-01-05'
   */
  test('formata data com zero à esquerda', () => {
    expect(formatarData(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  /**
   * @caso CT-UNI-076
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Formatar data e hora no padrão AAAA-MM-DD HH:mm
   * @resultadoEsperado formatarDataHora devolve '2026-10-19 08:05'
   */
  test('formata data e hora', () => {
    expect(formatarDataHora(new Date(2026, 9, 19, 8, 5))).toBe('2026-10-19 08:05');
  });

  /**
   * @caso CT-UNI-077
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF07
   * @objetivo Garantir que formatar e interpretar sejam operações inversas
   * @resultadoEsperado formatarDataHora(parseDataHora(t)) devolve o mesmo texto
   */
  test('formatação é inversa da interpretação', () => {
    const texto = '2026-10-19 17:45';
    expect(formatarDataHora(parseDataHora(texto))).toBe(texto);
  });
});

describe('horaParaMinutos e minutosParaHora', () => {
  /**
   * @caso CT-UNI-078
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Converter 07:00 para 420 minutos
   * @resultadoEsperado horaParaMinutos devolve 420
   */
  test('converte 07:00 em 420 minutos', () => {
    expect(horaParaMinutos('07:00')).toBe(420);
  });

  /**
   * @caso CT-UNI-079
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Converter os extremos do dia
   * @resultadoEsperado 00:00 vira 0 e 23:59 vira 1439
   */
  test('converte extremos do dia', () => {
    expect(horaParaMinutos('00:00')).toBe(0);
    expect(horaParaMinutos('23:59')).toBe(1439);
  });

  /**
   * @caso CT-UNI-080
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar horários malformados
   * @resultadoEsperado horaParaMinutos devolve null para '7:00', '24:00' e null
   */
  test('recusa horário malformado', () => {
    expect(horaParaMinutos('7:00')).toBeNull();
    expect(horaParaMinutos('24:00')).toBeNull();
    expect(horaParaMinutos(null)).toBeNull();
  });

  /**
   * @caso CT-UNI-081
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Converter minutos de volta para HH:mm
   * @resultadoEsperado 420 vira '07:00' e 1439 vira '23:59'
   */
  test('converte minutos para hora', () => {
    expect(minutosParaHora(420)).toBe('07:00');
    expect(minutosParaHora(1439)).toBe('23:59');
    expect(minutosParaHora(0)).toBe('00:00');
  });
});

describe('aritmética de datas', () => {
  /**
   * @caso CT-UNI-082
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Somar minutos atravessando a hora cheia
   * @resultadoEsperado 08:50 + 30 minutos devolve 09:20
   */
  test('soma minutos atravessando a hora', () => {
    const r = somarMinutos(new Date(2026, 9, 19, 8, 50), 30);
    expect(formatarDataHora(r)).toBe('2026-10-19 09:20');
  });

  /**
   * @caso CT-UNI-083
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Somar dias atravessando o fim do mês
   * @resultadoEsperado 30/01/2026 + 3 dias devolve 02/02/2026
   */
  test('soma dias atravessando o mês', () => {
    expect(formatarData(somarDias(new Date(2026, 0, 30), 3))).toBe('2026-02-02');
  });

  /**
   * @caso CT-UNI-084
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Subtrair dias para janelas de tempo
   * @resultadoEsperado 19/10/2026 - 90 dias devolve 21/07/2026
   */
  test('subtrai dias', () => {
    expect(formatarData(somarDias(new Date(2026, 9, 19), -90))).toBe('2026-07-21');
  });

  /**
   * @caso CT-UNI-085
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Calcular a diferença em minutos entre duas datas
   * @resultadoEsperado 08:00 e 10:30 do mesmo dia resultam em 150 minutos
   */
  test('calcula diferença em minutos', () => {
    expect(minutosEntre(new Date(2026, 9, 19, 8, 0), new Date(2026, 9, 19, 10, 30))).toBe(150);
  });

  /**
   * @caso CT-UNI-086
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Calcular diferença negativa quando a segunda data é anterior
   * @resultadoEsperado minutosEntre devolve -120 para 10:00 → 08:00
   */
  test('calcula diferença negativa', () => {
    expect(minutosEntre(new Date(2026, 9, 19, 10, 0), new Date(2026, 9, 19, 8, 0))).toBe(-120);
  });

  /**
   * @caso CT-UNI-087
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Zerar horas, minutos e segundos de uma data
   * @resultadoEsperado inicioDoDia devolve 00:00 do mesmo dia
   */
  test('obtém o início do dia', () => {
    expect(formatarDataHora(inicioDoDia(new Date(2026, 9, 19, 23, 59)))).toBe('2026-10-19 00:00');
  });
});
```
