# lote-030

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 9 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0486 | CT-UNI-115 | gera 8 horários de 30 minutos | passou |  |
| deepseek-0487 | CT-UNI-116 | gera horários de 45 minutos | passou |  |
| deepseek-0488 | CT-UNI-117 | gera horários de 15 minutos | passou |  |
| deepseek-0489 | CT-UNI-118 | descarta horário que não cabe inteiro | passou |  |
| deepseek-0490 | CT-UNI-119 | gera horário que preenche o bloco inteiro | passou |  |
| deepseek-0491 | CT-UNI-120 | ordena os blocos antes de gerar | passou |  |
| deepseek-0492 | CT-UNI-121 | devolve lista vazia sem blocos | passou |  |
| deepseek-0493 | CT-UNI-122 | devolve lista vazia quando a consulta não cabe | passou |  |
| deepseek-0494 | CT-UNI-123 | mantém sequência entre blocos encostados | passou |  |

## Arquivo: backend/__testes__/unitario/agenda-slots.test.js

```js
// Geração de horários a partir dos blocos da grade (RN14).
const { gerarSlots } = require('../../src/domain/agenda');

describe('gerarSlots', () => {
  /**
   * @caso CT-UNI-115
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Gerar horários de 30 em 30 minutos em um bloco de 4 horas
   * @resultadoEsperado São gerados 8 horários, de 08:00 a 11:30
   */
  test('gera 8 horários de 30 minutos', () => {
    const slots = gerarSlots([{ horaInicio: '08:00', horaFim: '12:00' }], 30);
    expect(slots).toHaveLength(8);
    expect(slots[0]).toBe('08:00');
    expect(slots[7]).toBe('11:30');
  });

  /**
   * @caso CT-UNI-116
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Respeitar a duração de 45 minutos do médico
   * @resultadoEsperado O último horário de 09:00–15:00 é 14:15
   */
  test('gera horários de 45 minutos', () => {
    const slots = gerarSlots([{ horaInicio: '09:00', horaFim: '15:00' }], 45);
    expect(slots).toEqual(['09:00', '09:45', '10:30', '11:15', '12:00', '12:45', '13:30', '14:15']);
  });

  /**
   * @caso CT-UNI-117
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Gerar horários de 15 em 15 minutos
   * @resultadoEsperado Um bloco de 07:00 a 08:00 gera 4 horários
   */
  test('gera horários de 15 minutos', () => {
    const slots = gerarSlots([{ horaInicio: '07:00', horaFim: '08:00' }], 15);
    expect(slots).toEqual(['07:00', '07:15', '07:30', '07:45']);
  });

  /**
   * @caso CT-UNI-118
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Não gerar horário que não cabe inteiro no bloco
   * @resultadoEsperado Um bloco de 08:00 a 08:50 gera apenas 08:00
   */
  test('descarta horário que não cabe inteiro', () => {
    expect(gerarSlots([{ horaInicio: '08:00', horaFim: '08:50' }], 30)).toEqual(['08:00']);
  });

  /**
   * @caso CT-UNI-119
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Aceitar horário que ocupa o bloco exatamente
   * @resultadoEsperado Um bloco de 08:00 a 09:00 com duração de 60 gera 08:00
   */
  test('gera horário que preenche o bloco inteiro', () => {
    expect(gerarSlots([{ horaInicio: '08:00', horaFim: '09:00' }], 60)).toEqual(['08:00']);
  });

  /**
   * @caso CT-UNI-120
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Ordenar os blocos antes de gerar os horários
   * @resultadoEsperado Os horários da tarde vêm antes dos da manhã quando a entrada está fora de ordem
   */
  test('ordena os blocos antes de gerar', () => {
    const slots = gerarSlots(
      [
        { horaInicio: '14:00', horaFim: '15:00' },
        { horaInicio: '08:00', horaFim: '09:00' },
      ],
      30,
    );
    expect(slots).toEqual(['08:00', '08:30', '14:00', '14:30']);
  });

  /**
   * @caso CT-UNI-121
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Não gerar horários sem blocos no dia
   * @resultadoEsperado gerarSlots devolve lista vazia
   */
  test('devolve lista vazia sem blocos', () => {
    expect(gerarSlots([], 30)).toEqual([]);
  });

  /**
   * @caso CT-UNI-122
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Não gerar horários quando a duração é maior que o bloco
   * @resultadoEsperado Um bloco de 08:00 a 08:45 com duração de 60 devolve lista vazia
   */
  test('devolve lista vazia quando a consulta não cabe', () => {
    expect(gerarSlots([{ horaInicio: '08:00', horaFim: '08:45' }], 60)).toEqual([]);
  });

  /**
   * @caso CT-UNI-123
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Manter a sequência de horários entre blocos encostados
   * @resultadoEsperado 08:00–09:00 e 09:00–10:00 geram 08:00, 08:30, 09:00 e 09:30
   */
  test('mantém sequência entre blocos encostados', () => {
    const slots = gerarSlots(
      [
        { horaInicio: '08:00', horaFim: '09:00' },
        { horaInicio: '09:00', horaFim: '10:00' },
      ],
      30,
    );
    expect(slots).toEqual(['08:00', '08:30', '09:00', '09:30']);
  });
});
```
