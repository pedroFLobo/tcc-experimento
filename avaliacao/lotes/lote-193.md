# lote-193

Modelo: nemotron

Avalie com a skill `juiz-casos-teste` **somente os 10 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| nemotron-0277 | (sem @caso) | formata centavos em real brasileiro | erro-de-carga | describe is not defined |
| nemotron-0278 | (sem @caso) | valores sem centavos mostram ,00 | erro-de-carga | describe is not defined |
| nemotron-0279 | (sem @caso) | data e hora → DD/MM/AAAA HH:mm | erro-de-carga | describe is not defined |
| nemotron-0280 | (sem @caso) | apenas data → DD/MM/AAAA | erro-de-carga | describe is not defined |
| nemotron-0281 | (sem @caso) | vazio retorna string vazia | erro-de-carga | describe is not defined |
| nemotron-0282 | (sem @caso) | retorna AAAA-MM-DD de hoje | erro-de-carga | describe is not defined |
| nemotron-0283 | (sem @caso) | tem 7 nomes em português | erro-de-carga | describe is not defined |
| nemotron-0284 | (sem @caso) | lista os 5 status possíveis | erro-de-carga | describe is not defined |
| nemotron-0285 | (sem @caso) | retorna true para AGENDADA e CONFIRMADA | erro-de-carga | describe is not defined |
| nemotron-0286 | (sem @caso) | retorna false para estados finais | erro-de-carga | describe is not defined |

## Arquivo: frontend/__testes__/unitario/formatadores.test.js

```js
// Testes de unidade — frontend: formatadores (RNF06 usabilidade)
// Atributo: Usabilidade
import {
  formatarMoeda,
  formatarDataHora,
  hojeISO,
  NOMES_DIAS,
  STATUS_CONSULTA,
  estaAtiva,
} from '../../src/utils/formatadores';

describe('formatarMoeda', () => {
  test('formata centavos em real brasileiro', () => {
    expect(formatarMoeda(15000)).toBe('R$ 150,00');
    expect(formatarMoeda(30000)).toBe('R$ 300,00');
    expect(formatarMoeda(13500)).toBe('R$ 135,00');
    expect(formatarMoeda(0)).toBe('R$ 0,00');
  });
  test('valores sem centavos mostram ,00', () => {
    expect(formatarMoeda(100)).toBe('R$ 1,00');
  });
});

describe('formatarDataHora', () => {
  test('data e hora → DD/MM/AAAA HH:mm', () => {
    expect(formatarDataHora('2026-10-20 10:00')).toBe('20/10/2026 10:00');
  });
  test('apenas data → DD/MM/AAAA', () => {
    expect(formatarDataHora('2026-10-20')).toBe('20/10/2026');
  });
  test('vazio retorna string vazia', () => {
    expect(formatarDataHora('')).toBe('');
    expect(formatarDataHora(null)).toBe('');
    expect(formatarDataHora(undefined)).toBe('');
  });
});

describe('hojeISO', () => {
  test('retorna AAAA-MM-DD de hoje', () => {
    const d = new Date();
    const esperado = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(hojeISO()).toBe(esperado);
  });
});

describe('NOMES_DIAS', () => {
  test('tem 7 nomes em português', () => {
    expect(NOMES_DIAS).toHaveLength(7);
    expect(NOMES_DIAS[0]).toBe('Domingo');
    expect(NOMES_DIAS[1]).toBe('Segunda');
    expect(NOMES_DIAS[6]).toBe('Sábado');
  });
});

describe('STATUS_CONSULTA', () => {
  test('lista os 5 status possíveis', () => {
    expect(STATUS_CONSULTA).toEqual(['AGENDADA', 'CONFIRMADA', 'REALIZADA', 'FALTA', 'CANCELADA']);
  });
});

describe('estaAtiva', () => {
  test('retorna true para AGENDADA e CONFIRMADA', () => {
    expect(estaAtiva({ status: 'AGENDADA' })).toBe(true);
    expect(estaAtiva({ status: 'CONFIRMADA' })).toBe(true);
  });
  test('retorna false para estados finais', () => {
    expect(estaAtiva({ status: 'REALIZADA' })).toBe(false);
    expect(estaAtiva({ status: 'FALTA' })).toBe(false);
    expect(estaAtiva({ status: 'CANCELADA' })).toBe(false);
  });
});
```
