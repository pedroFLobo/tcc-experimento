# lote-102

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 13 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0179 | CT-UNI-037 | detecta sobreposição parcial | passou |  |
| glm-0180 | CT-UNI-038 | permite blocos encostados | passou |  |
| glm-0181 | CT-UNI-039 | aceita bloco válido de segunda-feira | passou |  |
| glm-0182 | CT-UNI-040 | aceita domingo, sábado e os extremos de 07:00 e 20:00 | passou |  |
| glm-0183 | CT-UNI-041 | rejeita dia da semana inválido | passou |  |
| glm-0184 | CT-UNI-042 | rejeita horário malformado | passou |  |
| glm-0185 | CT-UNI-043 | rejeita minutos que não são múltiplos de 15 | passou |  |
| glm-0186 | CT-UNI-044 | rejeita blocos fora da janela de 07:00 a 20:00 | passou |  |
| glm-0187 | CT-UNI-045 | rejeita início igual ou posterior ao fim | passou |  |
| glm-0188 | CT-UNI-046 | rejeita entrada que não é lista | passou |  |
| glm-0189 | CT-UNI-047 | aceita grade vazia | passou |  |
| glm-0190 | CT-UNI-048 | detecta blocos sobrepostos no mesmo dia | passou |  |
| glm-0191 | CT-UNI-049 | permite blocos encostados e dias diferentes | passou |  |

## Arquivo: backend/__testes__/unitario/agenda-blocos.test.js

```js
// Testes unitários das regras puras de grade de disponibilidade (RN10, RN11).
const { intervalosSobrepoem, validarBloco, validarGrade } = require('../../src/domain/agenda');

describe('intervalosSobrepoem (RN11)', () => {
  /**
   * @caso CT-UNI-037
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Detectar sobreposição parcial entre dois intervalos
   * @resultadoEsperado intervalosSobrepoem retorna true para 08:00–12:00 e 11:00–13:00
   */
  test('detecta sobreposição parcial', () => {
    expect(intervalosSobrepoem(480, 720, 660, 780)).toBe(true);
  });

  /**
   * @caso CT-UNI-038
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Permitir blocos que apenas se encostam, sem sobrepor (valor-limite)
   * @resultadoEsperado intervalosSobrepoem retorna false para 08:00–12:00 e 12:00–14:00
   */
  test('permite blocos encostados', () => {
    expect(intervalosSobrepoem(480, 720, 720, 840)).toBe(false);
  });
});

describe('validarBloco (RN10)', () => {
  /**
   * @caso CT-UNI-039
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Aceitar um bloco de atendimento válido no meio da semana
   * @resultadoEsperado validarBloco retorna null para { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' }
   */
  test('aceita bloco válido de segunda-feira', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' })).toBeNull();
  });

  /**
   * @caso CT-UNI-040
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Aceitar blocos nos extremos do dia da semana e da janela de atendimento
   * @resultadoEsperado validarBloco retorna null para domingo 07:00–20:00 e sábado 18:00–20:00
   */
  test('aceita domingo, sábado e os extremos de 07:00 e 20:00', () => {
    expect(validarBloco({ diaSemana: 0, horaInicio: '07:00', horaFim: '20:00' })).toBeNull();
    expect(validarBloco({ diaSemana: 6, horaInicio: '18:00', horaFim: '20:00' })).toBeNull();
  });

  /**
   * @caso CT-UNI-041
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Rejeitar dia da semana fora do intervalo de 0 a 6
   * @resultadoEsperado validarBloco retorna mensagem para dia -1 e dia 7
   */
  test('rejeita dia da semana inválido', () => {
    const mensagem = validarBloco({ diaSemana: 7, horaInicio: '08:00', horaFim: '12:00' });
    expect(mensagem).toBe('Dia da semana deve ser um inteiro de 0 (domingo) a 6 (sábado).');
    expect(validarBloco({ diaSemana: -1, horaInicio: '08:00', horaFim: '12:00' })).toBe(mensagem);
  });

  /**
   * @caso CT-UNI-042
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN10
   * @objetivo Rejeitar horários fora do formato HH:mm
   * @resultadoEsperado validarBloco retorna mensagem de formato para '8:00' e '0800'
   */
  test('rejeita horário malformado', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '8:00', horaFim: '12:00' })).toBe('Horários devem estar no formato HH:mm.');
    expect(validarBloco({ diaSemana: 1, horaInicio: '0800', horaFim: '12:00' })).toBe('Horários devem estar no formato HH:mm.');
  });

  /**
   * @caso CT-UNI-043
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Rejeitar horários que não são múltiplos de 15 minutos
   * @resultadoEsperado validarBloco retorna mensagem de múltiplos para início 08:10
   */
  test('rejeita minutos que não são múltiplos de 15', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '08:10', horaFim: '12:00' })).toBe('Horários devem ser múltiplos de 15 minutos.');
  });

  /**
   * @caso CT-UNI-044
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Rejeitar blocos que começam antes das 07:00 ou terminam depois das 20:00
   * @resultadoEsperado validarBloco retorna mensagem de janela para 06:45–12:00 e para 18:00–20:15
   */
  test('rejeita blocos fora da janela de 07:00 a 20:00', () => {
    const mensagem = 'Horários devem estar entre 07:00 e 20:00.';
    expect(validarBloco({ diaSemana: 1, horaInicio: '06:45', horaFim: '12:00' })).toBe(mensagem);
    expect(validarBloco({ diaSemana: 1, horaInicio: '18:00', horaFim: '20:15' })).toBe(mensagem);
  });

  /**
   * @caso CT-UNI-045
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Rejeitar bloco cujo início não é anterior ao fim
   * @resultadoEsperado validarBloco retorna mensagem de ordem para 12:00–12:00 e 12:00–08:00
   */
  test('rejeita início igual ou posterior ao fim', () => {
    const mensagem = 'Hora de início deve ser anterior à hora de fim.';
    expect(validarBloco({ diaSemana: 1, horaInicio: '12:00', horaFim: '12:00' })).toBe(mensagem);
    expect(validarBloco({ diaSemana: 1, horaInicio: '12:00', horaFim: '08:00' })).toBe(mensagem);
  });
});

describe('validarGrade (RN10, RN11)', () => {
  /**
   * @caso CT-UNI-046
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN10
   * @objetivo Rejeitar entrada que não é uma lista de blocos
   * @resultadoEsperado validarGrade retorna mensagem para null e para uma string
   */
  test('rejeita entrada que não é lista', () => {
    expect(validarGrade(null)).toBe('A grade deve ser uma lista de blocos.');
    expect(validarGrade('segunda 08:00')).toBe('A grade deve ser uma lista de blocos.');
  });

  /**
   * @caso CT-UNI-047
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10, RF05.2
   * @objetivo Aceitar grade vazia (médico pode limpar a própria grade)
   * @resultadoEsperado validarGrade retorna null para []
   */
  test('aceita grade vazia', () => {
    expect(validarGrade([])).toBeNull();
  });

  /**
   * @caso CT-UNI-048
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Detectar sobreposição entre dois blocos do mesmo dia
   * @resultadoEsperado validarGrade retorna mensagem citando o dia e os horários sobrepostos
   */
  test('detecta blocos sobrepostos no mesmo dia', () => {
    const mensagem = validarGrade([
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 1, horaInicio: '11:00', horaFim: '14:00' },
    ]);
    expect(mensagem).toBe('Blocos sobrepostos no dia 1: 08:00–12:00 e 11:00–14:00.');
  });

  /**
   * @caso CT-UNI-049
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Permitir blocos encostados no mesmo dia e blocos iguais em dias diferentes
   * @resultadoEsperado validarGrade retorna null nos dois cenários
   */
  test('permite blocos encostados e dias diferentes', () => {
    expect(validarGrade([
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 1, horaInicio: '12:00', horaFim: '14:00' },
    ])).toBeNull();
    expect(validarGrade([
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 3, horaInicio: '08:00', horaFim: '12:00' },
    ])).toBeNull();
  });
});
```
