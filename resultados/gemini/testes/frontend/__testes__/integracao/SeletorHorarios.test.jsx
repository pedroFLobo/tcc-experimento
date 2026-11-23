import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SeletorHorarios } from '../../src/components/SeletorHorarios';
import { medicosApi } from '../../src/api';

vi.mock('../../src/api', () => ({
  medicosApi: {
    horarios: vi.fn(),
  },
}));

describe('Integração Frontend: SeletorHorarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * @caso CT-INT-052
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF07.1, RNF06
   * @objetivo Carregar horários disponíveis da API e permitir seleção por clique
   * @resultadoEsperado Dispara onEscolher com o horário clicado e marca aria-pressed
   */
  test('deve listar horários livres e invocar callback ao selecionar um botão', async () => {
    const user = userEvent.setup();
    const onEscolherMock = vi.fn();
    medicosApi.horarios.mockResolvedValueOnce({
      horarios: ['2026-10-20 09:00', '2026-10-20 09:30', '2026-10-20 10:00'],
    });

    render(
      <SeletorHorarios
        id="seletor-teste"
        medicoId={1}
        data="2026-10-20"
        selecionado="2026-10-20 09:30"
        onEscolher={onEscolherMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('09:30')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    const botaoSelecionado = screen.getByText('09:30');
    expect(botaoSelecionado).toHaveAttribute('aria-pressed', 'true');
    expect(botaoSelecionado).toHaveClass('selecionado');

    const botao09 = screen.getByText('09:00');
    await user.click(botao09);
    expect(onEscolherMock).toHaveBeenCalledWith('2026-10-20 09:00');
  });

  /**
   * @caso CT-INT-053
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF07.1, RNF06
   * @objetivo Exibir aviso claro quando nenhum horário estiver disponível na data
   * @resultadoEsperado Mensagem "Nenhum horário livre nesta data. Tente outro dia." é exibida
   */
  test('deve exibir mensagem amigável quando médico não tiver horários vagos', async () => {
    medicosApi.horarios.mockResolvedValueOnce({ horarios: [] });

    render(
      <SeletorHorarios
        id="seletor-vazio"
        medicoId={1}
        data="2026-10-20"
        selecionado=""
        onEscolher={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Nenhum horário livre nesta data/i)).toBeInTheDocument();
    });
  });

  /**
   * @caso CT-INT-054
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04, RNF06
   * @objetivo Exibir mensagem de erro inline se a requisição à API falhar
   * @resultadoEsperado Mensagem de falha visível sem travar componente
   */
  test('deve exibir erro quando a requisição falhar', async () => {
    medicosApi.horarios.mockRejectedValueOnce(new Error('Falha de conexão com o servidor'));

    render(
      <SeletorHorarios
        id="seletor-erro"
        medicoId={1}
        data="2026-10-20"
        selecionado=""
        onEscolher={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Falha de conexão com o servidor')).toBeInTheDocument();
    });
  });
});
