import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DialogoTexto } from '../../src/components/DialogoTexto';

function montar(props = {}) {
  const aoConfirmar = vi.fn();
  const aoCancelar = vi.fn();
  render(
    <DialogoTexto
      titulo="Cancelar consulta"
      descricao="Ana Pereira · 26/10/2026 08:00. O motivo é obrigatório."
      rotulo="Motivo do cancelamento"
      textoConfirmar="Cancelar consulta"
      perigo
      onConfirmar={aoConfirmar}
      onCancelar={aoCancelar}
      {...props}
    />,
  );
  return { aoConfirmar, aoCancelar };
}

afterEach(cleanup);

describe('components/DialogoTexto', () => {
  /**
   * @caso CT-INT-224
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Apresentar o pedido de texto com rótulo, descrição e campo associados
   * @resultadoEsperado O diálogo exibe título, descrição e textarea acessível pelo rótulo
   */
  test('DialogoTexto exibe título, descrição e campo com rótulo associado', () => {
    montar();

    expect(screen.getByRole('dialog', { name: 'Cancelar consulta' })).toBeInTheDocument();
    expect(screen.getByText('Ana Pereira · 26/10/2026 08:00. O motivo é obrigatório.')).toBeInTheDocument();
    expect(screen.getByLabelText('Motivo do cancelamento')).toHaveAttribute('id', 'texto-campo');
  });

  /**
   * @caso CT-INT-225
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2
   * @objetivo Entregar o motivo digitado à confirmação do cancelamento
   * @resultadoEsperado Confirmar chama onConfirmar com exatamente o texto digitado
   */
  test('DialogoTexto entrega o texto digitado ao confirmar', () => {
    const { aoConfirmar } = montar();

    fireEvent.change(screen.getByLabelText('Motivo do cancelamento'), { target: { value: 'Não vou comparecer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar consulta' }));

    expect(aoConfirmar).toHaveBeenCalledWith('Não vou comparecer');
  });

  /**
   * @caso CT-INT-226
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF06
   * @objetivo Permite desistir da ação sem disparar a confirmação
   * @resultadoEsperado "Voltar" chama onCancelar e não chama onConfirmar
   */
  test('DialogoTexto desiste da ação ao clicar em Voltar', () => {
    const { aoConfirmar, aoCancelar } = montar();

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(aoCancelar).toHaveBeenCalledTimes(1);
    expect(aoConfirmar).not.toHaveBeenCalled();
  });
});
