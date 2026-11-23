# lote-183

Modelo: nemotron

Avalie com a skill `juiz-casos-teste` **somente os 22 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| nemotron-0162 | (sem @caso) | aceita bloco válido | passou |  |
| nemotron-0163 | (sem @caso) | rejeita dia da semana inválido | passou |  |
| nemotron-0164 | (sem @caso) | rejeita horários fora do formato HH:mm | passou |  |
| nemotron-0165 | (sem @caso) | rejeita horários não múltiplos de 15 minutos | passou |  |
| nemotron-0166 | (sem @caso) | rejeita horários fora do expediente 07:00-20:00 | passou |  |
| nemotron-0167 | (sem @caso) | rejeita início igual ou depois do fim | passou |  |
| nemotron-0168 | (sem @caso) | detecta sobreposição | passou |  |
| nemotron-0169 | (sem @caso) | não considera encosto como sobreposição | passou |  |
| nemotron-0170 | (sem @caso) | intervalos disjuntos não se sobrepõem | passou |  |
| nemotron-0171 | (sem @caso) | aceita grade vazia | passou |  |
| nemotron-0172 | (sem @caso) | rejeita grade não array | passou |  |
| nemotron-0173 | (sem @caso) | propaga erro de bloco inválido | passou |  |
| nemotron-0174 | (sem @caso) | detecta blocos sobrepostos no mesmo dia | passou |  |
| nemotron-0175 | (sem @caso) | não considera encosto como sobreposição | passou |  |
| nemotron-0176 | (sem @caso) | blocos em dias diferentes podem ter mesmo horário | passou |  |
| nemotron-0177 | (sem @caso) | gera slots em passos iguais à duração que cabem inteiros no bloco | passou |  |
| nemotron-0178 | (sem @caso) | não gera slot que excede o fim do bloco | falhou | Error: expect(received).toEqual(expected) // deep equality - Expected - 1 + Received + 0 Array [ "08:00", "08:30", - "09:00", ] at Object.toEqual (C:\Users\pedr |
| nemotron-0179 | (sem @caso) | ordena blocos antes de gerar | falhou | Error: expect(received).toEqual(expected) // deep equality - Expected - 0 + Received + 2 @@ -3,6 +3,8 @@ "08:30", "09:00", "09:30", "10:00", "10:30", + "11:00", |
| nemotron-0180 | (sem @caso) | gera slots de múltiplos blocos do mesmo dia | passou |  |
| nemotron-0181 | (sem @caso) | duração 45 min gera slots de 45 em 45 | passou |  |
| nemotron-0182 | (sem @caso) | retorna true para datas dentro do bloqueio | passou |  |
| nemotron-0183 | (sem @caso) | retorna true para datas fora do bloqueio | passou |  |

## Arquivo: backend/__testes__/unitario/agenda.test.js

```js
// Testes de unidade — domínio: grade de horários e geração de slots (RN10, RN11, RN14)
// Atributo: Adequação funcional
const {
  validarBloco,
  validarGrade,
  gerarSlots,
  intervalosSobrepoem,
  dataEmBloqueio,
} = require('../../src/domain/agenda');

describe('validarBloco (RN10)', () => {
  test('aceita bloco válido', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' })).toBe(null);
  });
  test('rejeita dia da semana inválido', () => {
    expect(validarBloco({ diaSemana: 7, horaInicio: '08:00', horaFim: '12:00' })).toBe('Dia da semana deve ser um inteiro de 0 (domingo) a 6 (sábado).');
    expect(validarBloco({ diaSemana: -1, horaInicio: '08:00', horaFim: '12:00' })).toBe('Dia da semana deve ser um inteiro de 0 (domingo) a 6 (sábado).');
    expect(validarBloco({ diaSemana: 1.5, horaInicio: '08:00', horaFim: '12:00' })).toBe('Dia da semana deve ser um inteiro de 0 (domingo) a 6 (sábado).');
  });
  test('rejeita horários fora do formato HH:mm', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '8:00', horaFim: '12:00' })).toBe('Horários devem estar no formato HH:mm.');
    expect(validarBloco({ diaSemana: 1, horaInicio: '08:00', horaFim: '12:0' })).toBe('Horários devem estar no formato HH:mm.');
  });
  test('rejeita horários não múltiplos de 15 minutos', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '08:05', horaFim: '12:00' })).toBe('Horários devem ser múltiplos de 15 minutos.');
    expect(validarBloco({ diaSemana: 1, horaInicio: '08:00', horaFim: '12:07' })).toBe('Horários devem ser múltiplos de 15 minutos.');
  });
  test('rejeita horários fora do expediente 07:00-20:00', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '06:00', horaFim: '12:00' })).toBe('Horários devem estar entre 07:00 e 20:00.');
    expect(validarBloco({ diaSemana: 1, horaInicio: '08:00', horaFim: '20:30' })).toBe('Horários devem estar entre 07:00 e 20:00.');
  });
  test('rejeita início igual ou depois do fim', () => {
    expect(validarBloco({ diaSemana: 1, horaInicio: '12:00', horaFim: '12:00' })).toBe('Hora de início deve ser anterior à hora de fim.');
    expect(validarBloco({ diaSemana: 1, horaInicio: '14:00', horaFim: '12:00' })).toBe('Hora de início deve ser anterior à hora de fim.');
  });
});

describe('intervalosSobrepoem', () => {
  test('detecta sobreposição', () => {
    expect(intervalosSobrepoem(480, 720, 600, 840)).toBe(true); // 08-12 e 10-14
  });
  test('não considera encosto como sobreposição', () => {
    expect(intervalosSobrepoem(480, 720, 720, 840)).toBe(false); // 08-12 e 12-14 encostam
  });
  test('intervalos disjuntos não se sobrepõem', () => {
    expect(intervalosSobrepoem(480, 540, 600, 660)).toBe(false); // 08-09 e 10-11
  });
});

describe('validarGrade (RN11)', () => {
  test('aceita grade vazia', () => {
    expect(validarGrade([])).toBe(null);
  });
  test('rejeita grade não array', () => {
    expect(validarGrade(null)).toBe('A grade deve ser uma lista de blocos.');
    expect(validarGrade('não é array')).toBe('A grade deve ser uma lista de blocos.');
  });
  test('propaga erro de bloco inválido', () => {
    const erro = validarGrade([{ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' }, { diaSemana: 99, horaInicio: '08:00', horaFim: '12:00' }]);
    expect(erro).toContain('Dia da semana');
  });
  test('detecta blocos sobrepostos no mesmo dia', () => {
    const erro = validarGrade([
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 1, horaInicio: '10:00', horaFim: '14:00' },
    ]);
    expect(erro).toContain('Blocos sobrepostos');
    expect(erro).toContain('dia 1');
  });
  test('não considera encosto como sobreposição', () => {
    expect(
      validarGrade([
        { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
        { diaSemana: 1, horaInicio: '12:00', horaFim: '14:00' },
      ])
    ).toBe(null);
  });
  test('blocos em dias diferentes podem ter mesmo horário', () => {
    expect(
      validarGrade([
        { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
        { diaSemana: 2, horaInicio: '08:00', horaFim: '12:00' },
      ])
    ).toBe(null);
  });
});

describe('gerarSlots (RN14)', () => {
  test('gera slots em passos iguais à duração que cabem inteiros no bloco', () => {
    const blocos = [{ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' }];
    expect(gerarSlots(blocos, 30)).toEqual(['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
  });
  test('não gera slot que excede o fim do bloco', () => {
    const blocos = [{ diaSemana: 1, horaInicio: '08:00', horaFim: '09:20' }];
    expect(gerarSlots(blocos, 30)).toEqual(['08:00', '08:30', '09:00']);
  });
  test('ordena blocos antes de gerar', () => {
    const blocos = [
      { diaSemana: 1, horaInicio: '10:00', horaFim: '12:00' },
      { diaSemana: 1, horaInicio: '08:00', horaFim: '10:00' },
    ];
    expect(gerarSlots(blocos, 30)).toEqual(['08:00', '08:30', '09:00', '09:30', '10:00', '10:30']);
  });
  test('gera slots de múltiplos blocos do mesmo dia', () => {
    const blocos = [
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 1, horaInicio: '14:00', horaFim: '18:00' },
    ];
    const slots = gerarSlots(blocos, 60);
    expect(slots).toEqual(['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']);
  });
  test('duração 45 min gera slots de 45 em 45', () => {
    const blocos = [{ diaSemana: 1, horaInicio: '09:00', horaFim: '15:00' }];
    expect(gerarSlots(blocos, 45)).toEqual(['09:00', '09:45', '10:30', '11:15', '12:00', '12:45', '13:30', '14:15']);
  });
});

describe('dataEmBloqueio (RN15)', () => {
  const bloqueios = [
    { dataInicio: '2026-10-20', dataFim: '2026-10-22' },
    { dataInicio: '2026-11-01', dataFim: '2026-11-01' },
  ];
  test('retorna true para datas dentro do bloqueio', () => {
    expect(dataEmBloqueio('2026-10-20', bloqueios)).toBe(true);
    expect(dataEmBloqueio('2026-10-21', bloqueios)).toBe(true);
    expect(dataEmBloqueio('2026-10-22', bloqueios)).toBe(true);
    expect(dataEmBloqueio('2026-11-01', bloqueios)).toBe(true);
  });
  test('retorna true para datas fora do bloqueio', () => {
    expect(dataEmBloqueio('2026-10-19', bloqueios)).toBe(false);
    expect(dataEmBloqueio('2026-10-23', bloqueios)).toBe(false);
    expect(dataEmBloqueio('2026-11-02', bloqueios)).toBe(false);
  });
});
```
