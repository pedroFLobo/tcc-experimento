// @vitest-environment jsdom
// Testes de integração do SeletorHorarios (RF07.1, usabilidade, confiabilidade).
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { SeletorHorarios } from '../../src/components/SeletorHorarios';
import { medicosApi } from '../../src/api';

vi.mock('../../src/api', () => ({
  medicosApi: { horarios: vi.fn() },
}));

const montar = (props = {}) => {
  const onEscolher = vi.fn();
  render(<SeletorHorarios id="seletor-teste" medicoId={1} data="2026-10-20" onEscolher={onEscolher} {...props} />);
  return onEscolher;
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => cleanup());

describe('SeletorHorarios (RF07.1)', () => {
  /**
   * @caso CT-INT-118
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1
   * @objetivo Carregar os horários livres e escolher um por clique
   * @resultadoEsperado botões com data-inicio aparecem, o escolhido fica marcado e onEscolher recebe o início completo
   */
  test('carrega horários e escolhe um slot', async () => {
    medicosApi.horarios.mockResolvedValue({ horarios: ['2026-10-20 08:00', '2026-10-20 08:30'] });
    const onEscolher = montar({ selecionado: '2026-10-20 08:00' });
    const slot = await screen.findByRole('button', { name: '08:00' });
    expect(slot).toHaveAttribute('data-inicio', '2026-10-20 08:00');
    expect(slot).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: '08:30' }));
    expect(onEscolher).toHaveBeenCalledWith('2026-10-20 08:30');
    expect(medicosApi.horarios).toHaveBeenCalledWith(1, '2026-10-20');
  });

  /**
   * @caso CT-INT-119
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF07.1, RNF06
   * @objetivo Orientar o paciente quando o dia não tem horários livres
   * @resultadoEsperado aparece o aviso 'Nenhum horário livre nesta data. Tente outro dia.'
   */
  test('dia sem horários mostra aviso orientador', async () => {
    medicosApi.horarios.mockResolvedValue({ horarios: [] });
    montar();
    expect(await screen.findByText('Nenhum horário livre nesta data. Tente outro dia.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-120
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF07.1
   * @objetivo Não consultar a API sem médico ou data escolhidos
   * @resultadoEsperado nenhum chamada a medicosApi.horarios e nenhum aviso exibido
   */
  test('sem médico e data não consulta a API', async () => {
    montar({ medicoId: null, data: null });
    await waitFor(() => expect(medicosApi.horarios).not.toHaveBeenCalled());
    expect(document.querySelector('.vazio')).toBeNull();
  });

  /**
   * @caso CT-INT-121
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF07.1, RNF04
   * @objetivo Exibir a mensagem da API quando a carga de horários falha
   * @resultadoEsperado erro rejeitado aparece como aviso legível na área de horários
   */
  test('falha da API aparece como aviso', async () => {
    medicosApi.horarios.mockRejectedValue(new Error('Não foi possível conectar ao servidor.'));
    montar();
    expect(await screen.findByText('Não foi possível conectar ao servidor.')).toBeInTheDocument();
  });
});
