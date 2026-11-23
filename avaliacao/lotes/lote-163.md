# lote-163

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 6 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0495 | CT-INT-146 | StatusBadge traduz AGENDADA para "Agendada" | passou |  |
| mimo-0496 | CT-INT-147 | StatusBadge traduz CONFIRMADA para "Confirmada" | passou |  |
| mimo-0497 | CT-INT-148 | StatusBadge traduz REALIZADA para "Realizada" | passou |  |
| mimo-0498 | CT-INT-149 | StatusBadge traduz FALTA para "Falta" | passou |  |
| mimo-0499 | CT-INT-150 | StatusBadge traduz CANCELADA para "Cancelada" | passou |  |
| mimo-0500 | CT-INT-151 | StatusBadge exibe o valor cru para status desconhecido | passou |  |

## Arquivo: frontend/__testes__/integracao/status-badge.test.jsx

```js
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StatusBadge } from '../../src/components/StatusBadge';

afterEach(cleanup);

describe('components/StatusBadge', () => {
  /**
   * @caso CT-INT-146
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RNF06
   * @objetivo Rotular a consulta agendada em português com identificação acessível do status
   * @resultadoEsperado StatusBadge de AGENDADA exibe "Agendada" com data-status e classe próprias
   */
  test('StatusBadge traduz AGENDADA para "Agendada"', () => {
    render(<StatusBadge status="AGENDADA" />);
    const selo = screen.getByText('Agendada');
    expect(selo).toHaveAttribute('data-status', 'AGENDADA');
    expect(selo).toHaveClass('status', 'status-AGENDADA');
  });

  /**
   * @caso CT-INT-147
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1
   * @objetivo Rotular a consulta confirmada em português
   * @resultadoEsperado StatusBadge de CONFIRMADA exibe "Confirmada" com data-status="CONFIRMADA"
   */
  test('StatusBadge traduz CONFIRMADA para "Confirmada"', () => {
    render(<StatusBadge status="CONFIRMADA" />);
    const selo = screen.getByText('Confirmada');
    expect(selo).toHaveAttribute('data-status', 'CONFIRMADA');
    expect(selo).toHaveClass('status', 'status-CONFIRMADA');
  });

  /**
   * @caso CT-INT-148
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.4
   * @objetivo Rotular o atendimento realizado em português
   * @resultadoEsperado StatusBadge de REALIZADA exibe "Realizada" com data-status="REALIZADA"
   */
  test('StatusBadge traduz REALIZADA para "Realizada"', () => {
    render(<StatusBadge status="REALIZADA" />);
    const selo = screen.getByText('Realizada');
    expect(selo).toHaveAttribute('data-status', 'REALIZADA');
    expect(selo).toHaveClass('status', 'status-REALIZADA');
  });

  /**
   * @caso CT-INT-149
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.5
   * @objetivo Rotular a falta do paciente em português
   * @resultadoEsperado StatusBadge de FALTA exibe "Falta" com data-status="FALTA"
   */
  test('StatusBadge traduz FALTA para "Falta"', () => {
    render(<StatusBadge status="FALTA" />);
    const selo = screen.getByText('Falta');
    expect(selo).toHaveAttribute('data-status', 'FALTA');
    expect(selo).toHaveClass('status', 'status-FALTA');
  });

  /**
   * @caso CT-INT-150
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2
   * @objetivo Rotular a consulta cancelada em português
   * @resultadoEsperado StatusBadge de CANCELADA exibe "Cancelada" com data-status="CANCELADA"
   */
  test('StatusBadge traduz CANCELADA para "Cancelada"', () => {
    render(<StatusBadge status="CANCELADA" />);
    const selo = screen.getByText('Cancelada');
    expect(selo).toHaveAttribute('data-status', 'CANCELADA');
    expect(selo).toHaveClass('status', 'status-CANCELADA');
  });

  /**
   * @caso CT-INT-151
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RNF06
   * @objetivo Não quebrar a linha quando o status recebido não é conhecido
   * @resultadoEsperado Status desconhecido é exibido cru e mantém o atributo data-status
   */
  test('StatusBadge exibe o valor cru para status desconhecido', () => {
    render(<StatusBadge status="NOVO" />);
    const selo = screen.getByText('NOVO');
    expect(selo).toHaveAttribute('data-status', 'NOVO');
  });
});
```
