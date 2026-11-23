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
