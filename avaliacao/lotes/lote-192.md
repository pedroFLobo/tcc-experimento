# lote-192

Modelo: nemotron

Avalie com a skill `juiz-casos-teste` **somente os 1 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| nemotron-0276 | (sem @caso) | renderiza rótulo em português para cada status | passou |  |

## Arquivo: frontend/__testes__/integracao/StatusBadge.integracao.test.jsx

```js
// Testes de integração — frontend: componente StatusBadge (RNF06 usabilidade)
// Atributo: Usabilidade
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../../src/components/StatusBadge';

describe('StatusBadge', () => {
  test('renderiza rótulo em português para cada status', () => {
    const casos = [
      ['AGENDADA', 'Agendada'],
      ['CONFIRMADA', 'Confirmada'],
      ['REALIZADA', 'Realizada'],
      ['FALTA', 'Falta'],
      ['CANCELADA', 'Cancelada'],
    ];
    for (const [status, rotulo] of casos) {
      render(<StatusBadge status={status} />);
      const el = screen.getByText(rotulo);
      expect(el).toBeInTheDocument();
      expect(el).toHaveAttribute('data-status', status);
      expect(el).toHaveClass(`status-${status}`);
    }
  });
});
```
