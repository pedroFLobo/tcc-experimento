# lote-029

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 27 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0459 | CT-UNI-088 | aceita bloco válido | passou |  |
| deepseek-0460 | CT-UNI-089 | aceita domingo e sábado | passou |  |
| deepseek-0461 | CT-UNI-090 | recusa dia da semana -1 | passou |  |
| deepseek-0462 | CT-UNI-091 | recusa dia da semana 7 | passou |  |
| deepseek-0463 | CT-UNI-092 | recusa dia da semana fracionário | passou |  |
| deepseek-0464 | CT-UNI-093 | recusa dia da semana em texto | passou |  |
| deepseek-0465 | CT-UNI-094 | aceita bloco de 07:00 a 20:00 | passou |  |
| deepseek-0466 | CT-UNI-095 | recusa início às 06:45 | passou |  |
| deepseek-0467 | CT-UNI-096 | recusa fim às 20:15 | passou |  |
| deepseek-0468 | CT-UNI-097 | recusa horário fora dos múltiplos de 15 | passou |  |
| deepseek-0469 | CT-UNI-098 | recusa início igual ao fim | passou |  |
| deepseek-0470 | CT-UNI-099 | recusa início depois do fim | passou |  |
| deepseek-0471 | CT-UNI-100 | recusa hora sem zero à esquerda | passou |  |
| deepseek-0472 | CT-UNI-101 | detecta sobreposição parcial | passou |  |
| deepseek-0473 | CT-UNI-102 | não considera sobreposição quando encostam | passou |  |
| deepseek-0474 | CT-UNI-103 | detecta intervalo contido | passou |  |
| deepseek-0475 | CT-UNI-104 | não detecta sobreposição entre intervalos separados | passou |  |
| deepseek-0476 | CT-UNI-105 | aceita grade vazia | passou |  |
| deepseek-0477 | CT-UNI-106 | recusa grade que não é lista | passou |  |
| deepseek-0478 | CT-UNI-107 | recusa grade com bloco fora do horário | passou |  |
| deepseek-0479 | CT-UNI-108 | recusa blocos sobrepostos no mesmo dia | passou |  |
| deepseek-0480 | CT-UNI-109 | aceita blocos encostados no mesmo dia | passou |  |
| deepseek-0481 | CT-UNI-110 | aceita mesmo horário em dias diferentes | passou |  |
| deepseek-0482 | CT-UNI-111 | recusa blocos duplicados | passou |  |
| deepseek-0483 | CT-UNI-112 | detecta data dentro do bloqueio | passou |  |
| deepseek-0484 | CT-UNI-113 | inclui as extremidades do bloqueio | passou |  |
| deepseek-0485 | CT-UNI-114 | ignora datas fora do bloqueio | passou |  |

## Arquivo: backend/__testes__/unitario/agenda-blocos.test.js

```js
// Regras puras de grade semanal e bloqueios de data (RN10, RN11, RN12).
const {
  ABERTURA,
  FECHAMENTO,
  intervalosSobrepoem,
  validarBloco,
  validarGrade,
  dataEmBloqueio,
} = require('../../src/domain/agenda');

describe('validarBloco', () => {
  /**
   * @caso CT-UNI-088
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Aceitar um bloco dentro do horário de funcionamento
   * @resultadoEsperado validarBloco devolve null para segunda 08:00–12:00
   */
  test('aceita bloco válido', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' })).toBeNull();
  });

  /**
   * @caso CT-UNI-089
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Aceitar domingo (0) e sábado (6), os extremos da semana
   * @resultadoEsperado validarBloco devolve null para os dois dias
   */
  test('aceita domingo e sábado', () => {
    expect(validarBloco({ diaSemana: 0, horaInicio: '08:00', horaFim: '12:00' })).toBeNull();
    expect(validarBloco({ diaSemana: 6, horaInicio: '08:00', horaFim: '12:00' })).toBeNull();
  });

  /**
   * @caso CT-UNI-090
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Recusar dia da semana negativo
   * @resultadoEsperado validarBloco devolve mensagem de dia inválido
   */
  test('recusa dia da semana -1', () => {
    expect(validarBloco({ diaSemana: -1, horaInicio: '08:00', horaFim: '12:00' })).toContain('0 (domingo) a 6 (sábado)');
  });

  /**
   * @caso CT-UNI-091
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Recusar dia da semana 7
   * @resultadoEsperado validarBloco devolve mensagem de dia inválido
   */
  test('recusa dia da semana 7', () => {
    expect(validarBloco({ diaSemana: 7, horaInicio: '08:00', horaFim: '12:00' })).toContain('0 (domingo) a 6 (sábado)');
  });

  /**
   * @caso CT-UNI-092
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Recusar dia da semana fracionário
   * @resultadoEsperado validarBloco devolve mensagem de dia inválido para 1.5
   */
  test('recusa dia da semana fracionário', () => {
    expect(validarBloco({ diaSemana: 1.5, horaInicio: '08:00', horaFim: '12:00' })).toContain('Dia da semana');
  });

  /**
   * @caso CT-UNI-093
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN10, RNF04
   * @objetivo Recusar dia da semana enviado como texto
   * @resultadoEsperado validarBloco devolve mensagem de dia inválido para '1'
   */
  test('recusa dia da semana em texto', () => {
    expect(validarBloco({ diaSemana: '1', horaInicio: '08:00', horaFim: '12:00' })).toContain('Dia da semana');
  });

  /**
   * @caso CT-UNI-094
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Aceitar os limites exatos de abertura e fechamento
   * @resultadoEsperado validarBloco devolve null para 07:00–20:00
   */
  test('aceita bloco de 07:00 a 20:00', () => {
    expect(ABERTURA).toBe(420);
    expect(FECHAMENTO).toBe(1200);
    expect(validarBloco({ diaSemana: 3, horaInicio: '07:00', horaFim: '20:00' })).toBeNull();
  });

  /**
   * @caso CT-UNI-095
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Recusar bloco que começa antes das 07:00
   * @resultadoEsperado validarBloco devolve mensagem de horário permitido
   */
  test('recusa início às 06:45', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '06:45', horaFim: '12:00' })).toContain('entre 07:00 e 20:00');
  });

  /**
   * @caso CT-UNI-096
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Recusar bloco que termina depois das 20:00
   * @resultadoEsperado validarBloco devolve mensagem de horário permitido
   */
  test('recusa fim às 20:15', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '18:00', horaFim: '20:15' })).toContain('entre 07:00 e 20:00');
  });

  /**
   * @caso CT-UNI-097
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Recusar horário que não é múltiplo de 15 minutos
   * @resultadoEsperado validarBloco devolve a mensagem de múltiplos de 15
   */
  test('recusa horário fora dos múltiplos de 15', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '08:10', horaFim: '12:00' })).toBe('Horários devem ser múltiplos de 15 minutos.');
  });

  /**
   * @caso CT-UNI-098
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Recusar bloco com início igual ao fim
   * @resultadoEsperado validarBloco devolve a mensagem de início anterior ao fim
   */
  test('recusa início igual ao fim', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '08:00', horaFim: '08:00' })).toContain('anterior');
  });

  /**
   * @caso CT-UNI-099
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Recusar bloco com início depois do fim
   * @resultadoEsperado validarBloco devolve a mensagem de início anterior ao fim
   */
  test('recusa início depois do fim', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '12:00', horaFim: '08:00' })).toContain('anterior');
  });

  /**
   * @caso CT-UNI-100
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN10, RNF06
   * @objetivo Explicar o formato quando a hora vem sem zero à esquerda
   * @resultadoEsperado validarBloco devolve a mensagem de formato HH:mm
   */
  test('recusa hora sem zero à esquerda', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '8:00', horaFim: '12:00' })).toBe('Horários devem estar no formato HH:mm.');
  });
});

describe('intervalosSobrepoem', () => {
  /**
   * @caso CT-UNI-101
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Detectar sobreposição parcial entre intervalos
   * @resultadoEsperado intervalosSobrepoem retorna true para 08:00–12:00 e 11:00–14:00
   */
  test('detecta sobreposição parcial', () => {
    expect(intervalosSobrepoem(480, 720, 660, 840)).toBe(true);
  });

  /**
   * @caso CT-UNI-102
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Permitir intervalos que apenas encostam
   * @resultadoEsperado intervalosSobrepoem retorna false para 08:00–12:00 e 12:00–14:00
   */
  test('não considera sobreposição quando encostam', () => {
    expect(intervalosSobrepoem(480, 720, 720, 840)).toBe(false);
  });

  /**
   * @caso CT-UNI-103
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Detectar intervalo totalmente contido em outro
   * @resultadoEsperado intervalosSobrepoem retorna true para 09:00–10:00 dentro de 08:00–12:00
   */
  test('detecta intervalo contido', () => {
    expect(intervalosSobrepoem(480, 720, 540, 600)).toBe(true);
  });

  /**
   * @caso CT-UNI-104
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Não detectar sobreposição entre intervalos separados
   * @resultadoEsperado intervalosSobrepoem retorna false para 08:00–10:00 e 14:00–16:00
   */
  test('não detecta sobreposição entre intervalos separados', () => {
    expect(intervalosSobrepoem(480, 600, 840, 960)).toBe(false);
  });
});

describe('validarGrade', () => {
  /**
   * @caso CT-UNI-105
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Aceitar grade vazia
   * @resultadoEsperado validarGrade devolve null para []
   */
  test('aceita grade vazia', () => {
    expect(validarGrade([])).toBeNull();
  });

  /**
   * @caso CT-UNI-106
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN11, RNF04
   * @objetivo Recusar grade que não é lista
   * @resultadoEsperado validarGrade devolve mensagem de lista de blocos
   */
  test('recusa grade que não é lista', () => {
    expect(validarGrade({ diaSemana: 1 })).toBe('A grade deve ser uma lista de blocos.');
  });

  /**
   * @caso CT-UNI-107
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Apontar o primeiro bloco inválido da lista
   * @resultadoEsperado validarGrade devolve o erro do bloco fora do horário permitido
   */
  test('recusa grade com bloco fora do horário', () => {
    const erro = validarGrade([
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 2, horaInicio: '21:00', horaFim: '22:00' },
    ]);
    expect(erro).toContain('entre 07:00 e 20:00');
  });

  /**
   * @caso CT-UNI-108
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Recusar blocos sobrepostos no mesmo dia
   * @resultadoEsperado validarGrade devolve mensagem citando a sobreposição
   */
  test('recusa blocos sobrepostos no mesmo dia', () => {
    const erro = validarGrade([
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 1, horaInicio: '11:00', horaFim: '14:00' },
    ]);
    expect(erro).toBe('Blocos sobrepostos no dia 1: 08:00–12:00 e 11:00–14:00.');
  });

  /**
   * @caso CT-UNI-109
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Aceitar blocos do mesmo dia que apenas encostam
   * @resultadoEsperado validarGrade devolve null para 08:00–12:00 e 12:00–14:00
   */
  test('aceita blocos encostados no mesmo dia', () => {
    expect(validarGrade([
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 1, horaInicio: '12:00', horaFim: '14:00' },
    ])).toBeNull();
  });

  /**
   * @caso CT-UNI-110
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Aceitar horários iguais em dias diferentes
   * @resultadoEsperado validarGrade devolve null para segunda e terça 08:00–12:00
   */
  test('aceita mesmo horário em dias diferentes', () => {
    expect(validarGrade([
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 2, horaInicio: '08:00', horaFim: '12:00' },
    ])).toBeNull();
  });

  /**
   * @caso CT-UNI-111
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Recusar blocos duplicados
   * @resultadoEsperado validarGrade devolve mensagem de blocos sobrepostos
   */
  test('recusa blocos duplicados', () => {
    expect(validarGrade([
      { diaSemana: 3, horaInicio: '09:00', horaFim: '11:00' },
      { diaSemana: 3, horaInicio: '09:00', horaFim: '11:00' },
    ])).toContain('Blocos sobrepostos no dia 3');
  });
});

describe('dataEmBloqueio', () => {
  /**
   * @caso CT-UNI-112
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN12, RN15
   * @objetivo Reconhecer data dentro do período bloqueado
   * @resultadoEsperado dataEmBloqueio retorna true para uma data entre início e fim
   */
  test('detecta data dentro do bloqueio', () => {
    const bloqueios = [{ dataInicio: '2026-10-20', dataFim: '2026-10-25' }];
    expect(dataEmBloqueio('2026-10-22', bloqueios)).toBe(true);
  });

  /**
   * @caso CT-UNI-113
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN12, RN15
   * @objetivo Considerar as datas inicial e final do bloqueio como bloqueadas
   * @resultadoEsperado dataEmBloqueio retorna true nas duas extremidades
   */
  test('inclui as extremidades do bloqueio', () => {
    const bloqueios = [{ dataInicio: '2026-10-20', dataFim: '2026-10-25' }];
    expect(dataEmBloqueio('2026-10-20', bloqueios)).toBe(true);
    expect(dataEmBloqueio('2026-10-25', bloqueios)).toBe(true);
  });

  /**
   * @caso CT-UNI-114
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Não reconhecer datas fora do bloqueio e lista vazia
   * @resultadoEsperado dataEmBloqueio retorna false para o dia anterior e para lista vazia
   */
  test('ignora datas fora do bloqueio', () => {
    const bloqueios = [{ dataInicio: '2026-10-20', dataFim: '2026-10-25' }];
    expect(dataEmBloqueio('2026-10-19', bloqueios)).toBe(false);
    expect(dataEmBloqueio('2026-10-26', bloqueios)).toBe(false);
    expect(dataEmBloqueio('2026-10-22', [])).toBe(false);
  });
});
```
