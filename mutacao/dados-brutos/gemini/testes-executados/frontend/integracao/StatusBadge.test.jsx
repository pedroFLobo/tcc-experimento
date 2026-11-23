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
