# lote-123

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 3 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0373 | CT-UNI-144 | exibe rótulo amigável do status | passou |  |
| glm-0374 | CT-UNI-145 | rotula todos os status do ciclo de vida | passou |  |
| glm-0375 | CT-UNI-146 | status desconhecido aparece como texto bruto | passou |  |

## Arquivo: frontend/__testes__/unitario/StatusBadge.test.jsx

```js
// @vitest-environment jsdom
// Testes unitários do StatusBadge (RNF06, usabilidade).
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StatusBadge } from '../../src/components/StatusBadge.jsx';

describe('StatusBadge (RNF06)', () => {
  /**
   * @caso CT-UNI-144
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RNF06, RF10
   * @objetivo Exibir o status da consulta em português legível
   * @resultadoEsperado status AGENDADA aparece como 'Agendada' com data-status e classe CSS correspondentes
   */
  test('exibe rótulo amigável do status', () => {
    render(<StatusBadge status="AGENDADA" />);
    const selo = screen.getByText('Agendada');
    expect(selo).toHaveAttribute('data-status', 'AGENDADA');
    expect(selo).toHaveClass('status-AGENDADA');
  });

  /**
   * @caso CT-UNI-145
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RNF06, RF10
   * @objetivo Cobrir os 5 status do ciclo de vida com rótulos em português
   * @resultadoEsperado cada status renderiza o seu rótulo com a classe específica
   */
  test('rotula todos os status do ciclo de vida', () => {
    const rotulos = {
      AGENDADA: 'Agendada', CONFIRMADA: 'Confirmada', REALIZADA: 'Realizada',
      FALTA: 'Falta', CANCELADA: 'Cancelada',
    };
    for (const [status, rotulo] of Object.entries(rotulos)) {
      const { unmount } = render(<StatusBadge status={status} />);
      const selo = screen.getByText(rotulo);
      expect(selo).toHaveAttribute('data-status', status);
      unmount();
    }
  });

  /**
   * @caso CT-UNI-146
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF06
   * @objetivo Não quebrar diante de status desconhecido
   * @resultadoEsperado o texto bruto do status é exibido como último recurso
   */
  test('status desconhecido aparece como texto bruto', () => {
    render(<StatusBadge status="NOVO_STATUS" />);
    expect(screen.getByText('NOVO_STATUS')).toHaveAttribute('data-status', 'NOVO_STATUS');
  });
});
```
