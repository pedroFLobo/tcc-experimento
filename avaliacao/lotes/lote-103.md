# lote-103

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 7 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0192 | CT-UNI-050 | gera slots de 30 minutos no bloco da manhã | passou |  |
| glm-0193 | CT-UNI-051 | só gera slots que cabem inteiros no bloco | passou |  |
| glm-0194 | CT-UNI-052 | retorna lista vazia quando a duração não cabe | passou |  |
| glm-0195 | CT-UNI-053 | ordena blocos fora de ordem e não gera slots no intervalo | passou |  |
| glm-0196 | CT-UNI-054 | reconhece datas dentro do bloqueio, inclusive as bordas | passou |  |
| glm-0197 | CT-UNI-055 | recusa datas fora do bloqueio | passou |  |
| glm-0198 | CT-UNI-056 | verifica todos os bloqueios da lista | passou |  |

## Arquivo: backend/__testes__/unitario/agenda-horarios.test.js

```js
// Testes unitários da geração de horários e verificação de bloqueios (RN14, RN15).
const { gerarSlots, dataEmBloqueio } = require('../../src/domain/agenda');

describe('gerarSlots (RN14)', () => {
  /**
   * @caso CT-UNI-050
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Gerar horários em passos iguais à duração da consulta dentro do bloco
   * @resultadoEsperado gerarSlots retorna 8 horários de 08:00 a 11:30 para bloco 08:00–12:00 com 30 minutos
   */
  test('gera slots de 30 minutos no bloco da manhã', () => {
    const slots = gerarSlots([{ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' }], 30);
    expect(slots).toHaveLength(8);
    expect(slots[0]).toBe('08:00');
    expect(slots[7]).toBe('11:30');
    expect(slots).toEqual(['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
  });

  /**
   * @caso CT-UNI-051
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Gerar apenas slots que cabem inteiros no bloco, descartando o resto
   * @resultadoEsperado gerarSlots retorna apenas 08:00 e 08:45 para bloco 08:00–10:00 com 45 minutos
   */
  test('só gera slots que cabem inteiros no bloco', () => {
    const slots = gerarSlots([{ diaSemana: 2, horaInicio: '08:00', horaFim: '10:00' }], 45);
    expect(slots).toEqual(['08:00', '08:45']);
  });

  /**
   * @caso CT-UNI-052
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Retornar lista vazia quando a duração não cabe nem uma vez no bloco
   * @resultadoEsperado gerarSlots retorna [] para bloco de 30 minutos com duração de 45 minutos
   */
  test('retorna lista vazia quando a duração não cabe', () => {
    const slots = gerarSlots([{ diaSemana: 3, horaInicio: '08:00', horaFim: '08:30' }], 45);
    expect(slots).toEqual([]);
  });

  /**
   * @caso CT-UNI-053
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN14
   * @objetivo Ordenar os slots cronologicamente mesmo com blocos informados fora de ordem
   * @resultadoEsperado gerarSlots retorna manhã antes da tarde, sem slot no intervalo entre os blocos
   */
  test('ordena blocos fora de ordem e não gera slots no intervalo', () => {
    const slots = gerarSlots([
      { diaSemana: 1, horaInicio: '14:00', horaFim: '15:00' },
      { diaSemana: 1, horaInicio: '08:00', horaFim: '09:00' },
    ], 30);
    expect(slots).toEqual(['08:00', '08:30', '14:00', '14:30']);
  });
});

describe('dataEmBloqueio (RN15)', () => {
  const bloqueios = [{ id: 1, medicoId: 1, dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Férias' }];

  /**
   * @caso CT-UNI-054
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Reconhecer datas dentro do período de bloqueio, inclusive nas bordas
   * @resultadoEsperado dataEmBloqueio retorna true para 2026-11-02, 2026-11-04 e 2026-11-06
   */
  test('reconhece datas dentro do bloqueio, inclusive as bordas', () => {
    expect(dataEmBloqueio('2026-11-02', bloqueios)).toBe(true);
    expect(dataEmBloqueio('2026-11-04', bloqueios)).toBe(true);
    expect(dataEmBloqueio('2026-11-06', bloqueios)).toBe(true);
  });

  /**
   * @caso CT-UNI-055
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Recusar datas fora do período de bloqueio
   * @resultadoEsperado dataEmBloqueio retorna false para 2026-11-01 e 2026-11-07
   */
  test('recusa datas fora do bloqueio', () => {
    expect(dataEmBloqueio('2026-11-01', bloqueios)).toBe(false);
    expect(dataEmBloqueio('2026-11-07', bloqueios)).toBe(false);
  });

  /**
   * @caso CT-UNI-056
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Reconhecer qualquer uma das datas quando existem vários bloqueios cadastrados
   * @resultadoEsperado dataEmBloqueio retorna true para uma data em cada bloqueio da lista
   */
  test('verifica todos os bloqueios da lista', () => {
    const varios = [
      ...bloqueios,
      { id: 2, medicoId: 1, dataInicio: '2026-12-20', dataFim: '2026-12-22', motivo: 'Congresso' },
    ];
    expect(dataEmBloqueio('2026-12-21', varios)).toBe(true);
    expect(dataEmBloqueio('2026-11-03', varios)).toBe(true);
    expect(dataEmBloqueio('2026-12-15', varios)).toBe(false);
  });
});
```
