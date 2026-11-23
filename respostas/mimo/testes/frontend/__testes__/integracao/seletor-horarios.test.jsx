import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { medicosApi } from '../../src/api';
import { SeletorHorarios } from '../../src/components/SeletorHorarios';

vi.mock('../../src/api', () => ({
  medicosApi: { horarios: vi.fn() },
}));

function montar(props = {}) {
  return render(
    <SeletorHorarios
      id="agendar-horarios"
      medicoId="1"
      data="2026-10-26"
      selecionado={null}
      onEscolher={vi.fn()}
      recarregarChave={0}
      {...props}
    />,
  );
}

describe('components/SeletorHorarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  /**
   * @caso CT-INT-180
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF07.1
   * @objetivo Não consultar a API quando o usuário ainda não escolheu médico e data
   * @resultadoEsperado Sem médico ou data, nenhuma chamada é feita e o grupo fica vazio
   */
  test('SeletorHorarios não busca horários sem médico ou sem data', () => {
    montar({ medicoId: '', data: '' });

    expect(medicosApi.horarios).not.toHaveBeenCalled();
    const grupo = document.getElementById('agendar-horarios');
    expect(grupo).toHaveAttribute('aria-busy', 'false');
    expect(grupo.querySelectorAll('button')).toHaveLength(0);
  });

  /**
   * @caso CT-INT-181
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1, RN14
   * @objetivo Listar os horários livres devolvidos pela API como botões escolhíveis
   * @resultadoEsperado Os horários viram botões com data-inicio e a hora visível no rótulo
   */
  test('SeletorHorarios lista os horários devolvidos pela API', async () => {
    medicosApi.horarios.mockResolvedValue({ horarios: ['2026-10-26 08:00', '2026-10-26 08:30'] });

    montar();

    expect(medicosApi.horarios).toHaveBeenCalledWith('1', '2026-10-26');
    expect(await screen.findByRole('button', { name: '08:00' })).toHaveAttribute('data-inicio', '2026-10-26 08:00');
    expect(screen.getByRole('button', { name: '08:30' })).toHaveAttribute('data-inicio', '2026-10-26 08:30');
  });

  /**
   * @caso CT-INT-182
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Avisar em português quando não há nenhum horário livre na data
   * @resultadoEsperado Lista vazia mostra o aviso "Nenhum horário livre nesta data. Tente outro dia."
   */
  test('SeletorHorarios avisa quando a data não tem horários livres', async () => {
    medicosApi.horarios.mockResolvedValue({ horarios: [] });

    montar({ data: '2026-10-27' });

    expect(await screen.findByText('Nenhum horário livre nesta data. Tente outro dia.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-183
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Exibir a mensagem de erro da API sem quebrar o formulário de agendamento
   * @resultadoEsperado Falha na busca aparece como aviso com o texto do erro
   */
  test('SeletorHorarios exibe o erro da API como aviso', async () => {
    medicosApi.horarios.mockRejectedValue(new Error('Data inválida. Use o formato AAAA-MM-DD.'));

    montar({ data: '2026-13-40' });

    expect(await screen.findByText('Data inválida. Use o formato AAAA-MM-DD.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-184
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN17
   * @objetivo Entregar o horário escolhido integralmente ao formulário de agendamento
   * @resultadoEsperado Clicar no botão chama onEscolher com "AAAA-MM-DD HH:mm" completo
   */
  test('SeletorHorarios entrega o horário completo ao clicar', async () => {
    medicosApi.horarios.mockResolvedValue({ horarios: ['2026-10-26 08:00', '2026-10-26 08:30'] });
    const aoEscolher = vi.fn();

    montar({ onEscolher: aoEscolher });

    fireEvent.click(await screen.findByRole('button', { name: '08:30' }));

    expect(aoEscolher).toHaveBeenCalledWith('2026-10-26 08:30');
  });

  /**
   * @caso CT-INT-185
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RNF06
   * @objetivo Destacar o horário já escolhido pelo usuário
   * @resultadoEsperado O horário selecionado tem aria-pressed true e a classe selecionado
   */
  test('SeletorHorarios marca com aria-pressed o horário selecionado', async () => {
    medicosApi.horarios.mockResolvedValue({ horarios: ['2026-10-26 08:00', '2026-10-26 08:30'] });

    montar({ selecionado: '2026-10-26 08:00' });

    const escolhido = await screen.findByRole('button', { name: '08:00' });
    expect(escolhido).toHaveAttribute('aria-pressed', 'true');
    expect(escolhido).toHaveClass('selecionado');
    expect(screen.getByRole('button', { name: '08:30' })).toHaveAttribute('aria-pressed', 'false');
  });

  /**
   * @caso CT-INT-186
   * @nivel integracao
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Recarregar os horários quando a página pede (após um novo agendamento)
   * @resultadoEsperado Mudar recarregarChave dispara uma nova chamada à API de horários
   */
  test('SeletorHorarios busca de novo ao mudar recarregarChave', async () => {
    medicosApi.horarios.mockResolvedValue({ horarios: ['2026-10-26 08:00'] });

    const { rerender } = render(
      <SeletorHorarios id="agendar-horarios" medicoId="1" data="2026-10-26" selecionado={null} onEscolher={vi.fn()} recarregarChave={0} />,
    );
    await screen.findByRole('button', { name: '08:00' });

    rerender(
      <SeletorHorarios id="agendar-horarios" medicoId="1" data="2026-10-26" selecionado={null} onEscolher={vi.fn()} recarregarChave={1} />,
    );

    await waitFor(() => expect(medicosApi.horarios).toHaveBeenCalledTimes(2));
  });

  /**
   * @caso CT-INT-187
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Anunciar o grupo como ocupado enquanto os horários carregam
   * @resultadoEsperado aria-busy fica true durante a busca e volta a false ao concluir
   */
  test('SeletorHorarios mantém aria-busy true enquanto carrega', async () => {
    let resolver;
    medicosApi.horarios.mockReturnValue(new Promise((resolverExterno) => { resolver = resolverExterno; }));

    montar();

    expect(document.getElementById('agendar-horarios')).toHaveAttribute('aria-busy', 'true');
    resolver({ horarios: [] });
    await waitFor(() => expect(document.getElementById('agendar-horarios')).toHaveAttribute('aria-busy', 'false'));
  });
});
