# lote-089

Modelo: gemini

Avalie com a skill `juiz-casos-teste` **somente os 3 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| gemini-0186 | CT-INT-046 | deve renderizar rótulo em português para status AGENDADA e CONFIRMADA | passou |  |
| gemini-0187 | CT-INT-047 | deve renderizar status terminais corretamente | passou |  |
| gemini-0188 | CT-INT-048 | deve exibir status desconhecido sem lançar erro | passou |  |

## Arquivo: frontend/__testes__/integracao/StatusBadge.test.jsx

```js
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StatusBadge } from '../../src/components/StatusBadge';

describe('Integração Frontend: StatusBadge', () => {
  /**
   * @caso CT-INT-046
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RF09, RNF06
   * @objetivo Exibir texto legível em português e classe correspondente para cada status
   * @resultadoEsperado Elemento span com texto e atributo data-status apropriados
   */
  test('deve renderizar rótulo em português para status AGENDADA e CONFIRMADA', () => {
    const { rerender } = render(<StatusBadge status="AGENDADA" />);
    const agendada = screen.getByText('Agendada');
    expect(agendada).toBeInTheDocument();
    expect(agendada).toHaveAttribute('data-status', 'AGENDADA');

    rerender(<StatusBadge status="CONFIRMADA" />);
    const confirmada = screen.getByText('Confirmada');
    expect(confirmada).toBeInTheDocument();
    expect(confirmada).toHaveAttribute('data-status', 'CONFIRMADA');
  });

  /**
   * @caso CT-INT-047
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RF09, RNF06
   * @objetivo Renderizar badges para status terminais REALIZADA, FALTA e CANCELADA
   * @resultadoEsperado Textos Realizada, Falta e Cancelada exibidos com classe status-{status}
   */
  test('deve renderizar status terminais corretamente', () => {
    const { rerender } = render(<StatusBadge status="REALIZADA" />);
    expect(screen.getByText('Realizada')).toHaveClass('status-REALIZADA');

    rerender(<StatusBadge status="FALTA" />);
    expect(screen.getByText('Falta')).toHaveClass('status-FALTA');

    rerender(<StatusBadge status="CANCELADA" />);
    expect(screen.getByText('Cancelada')).toHaveClass('status-CANCELADA');
  });

  /**
   * @caso CT-INT-048
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF06
   * @objetivo Lidar com status desconhecido sem quebrar renderização
   * @resultadoEsperado Exibe o próprio valor informado
   */
  test('deve exibir status desconhecido sem lançar erro', () => {
    render(<StatusBadge status="DESCONHECIDO" />);
    expect(screen.getByText('DESCONHECIDO')).toBeInTheDocument();
  });
});
```
