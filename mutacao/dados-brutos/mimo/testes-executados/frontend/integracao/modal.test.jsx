import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Modal } from '../../src/components/Modal';

function montar(props = {}) {
  const aoFechar = vi.fn();
  const utils = render(
    <Modal
      titulo="Cancelar consulta?"
      descricao="Esta ação não pode ser desfeita."
      aberto
      onFechar={aoFechar}
      {...props}
    >
      <input id="campo-modal" aria-label="Campo do modal" />
    </Modal>,
  );
  return { ...utils, aoFechar };
}

afterEach(cleanup);

describe('components/Modal', () => {
  /**
   * @caso CT-INT-188
   * @nivel integracao
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF07
   * @objetivo Não deixar rastro no DOM quando o diálogo está fechado
   * @resultadoEsperado Com aberto=false, Modal devolve nada na árvore
   */
  test('Modal fechado não renderiza elemento algum', () => {
    const { container } = render(
      <Modal titulo="Cancelar consulta?" aberto={false} onFechar={vi.fn()}>filhos</Modal>,
    );
    expect(container.innerHTML).toBe('');
  });

  /**
   * @caso CT-INT-189
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Expôr o diálogo com rótulo acessível para leitores de tela
   * @resultadoEsperado Diálogo aberto tem role dialog, aria-modal e o nome do título
   */
  test('Modal abre como role dialog com aria-modal e nome acessível', () => {
    montar();
    const dialogo = screen.getByRole('dialog', { name: 'Cancelar consulta?' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-190
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Levar o foco para o primeiro campo do diálogo ao abri-lo
   * @resultadoEsperado O input do modal recebe o foco após a abertura
   */
  test('Modal foca o primeiro controle ao abrir', async () => {
    montar();

    await waitFor(() => expect(document.getElementById('campo-modal')).toHaveFocus());
  });

  /**
   * @caso CT-INT-191
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Permitir fechar o diálogo pelo teclado com a tecla Esc
   * @resultadoEsperado Pressionar Escape chama onFechar uma vez
   */
  test('Modal fecha com a tecla Escape', () => {
    const { aoFechar } = montar();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  /**
   * @caso CT-INT-192
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Fechar o diálogo ao clicar fora dele
   * @resultadoEsperado MouseDown no fundo do modal chama onFechar
   */
  test('Modal fecha ao clicar no fundo', () => {
    const { aoFechar, container } = montar();

    fireEvent.mouseDown(container.querySelector('.modal-fundo'));

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  /**
   * @caso CT-INT-193
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF06
   * @objetivo Não fechar o diálogo quando o clique é no próprio conteúdo
   * @resultadoEsperado MouseDown dentro do diálogo não chama onFechar
   */
  test('Modal não fecha ao clicar no conteúdo interno', () => {
    const { aoFechar } = montar();

    fireEvent.mouseDown(screen.getByRole('dialog'));

    expect(aoFechar).not.toHaveBeenCalled();
  });
});
