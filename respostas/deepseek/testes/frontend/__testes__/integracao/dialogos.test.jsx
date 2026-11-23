// Integração dos diálogos e do seletor de horários: foco, teclado, escolha e remarcação (RF05, RNF06).
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/api', () => ({
  authApi: { login: vi.fn(), registrar: vi.fn(), me: vi.fn() },
  especialidadesApi: { listar: vi.fn(), criar: vi.fn() },
  medicosApi: { listar: vi.fn(), criar: vi.fn(), horarios: vi.fn(), grade: vi.fn(), salvarGrade: vi.fn(), bloqueios: vi.fn(), criarBloqueio: vi.fn(), removerBloqueio: vi.fn() },
  pacientesApi: { listar: vi.fn(), criar: vi.fn() },
  consultasApi: { listar: vi.fn(), agendar: vi.fn(), confirmar: vi.fn(), cancelar: vi.fn(), remarcar: vi.fn(), realizar: vi.fn(), falta: vi.fn() },
  adminApi: { definirAtivo: vi.fn(), resumo: vi.fn() },
}));

import { medicosApi, consultasApi } from '../../src/api';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { Modal } from '../../src/components/Modal';
import { DialogoTexto } from '../../src/components/DialogoTexto';
import { SeletorHorarios } from '../../src/components/SeletorHorarios';
import { DialogoRemarcar } from '../../src/components/DialogoRemarcar';

beforeEach(() => {
  vi.clearAllMocks();
  medicosApi.horarios.mockResolvedValue({ horarios: ['2026-10-21 09:00', '2026-10-21 09:45'] });
});

afterEach(cleanup);

describe('Modal', () => {
  /**
   * @caso CT-INT-353
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Apresentar o diálogo com título associado
   * @resultadoEsperado Um role dialog nomeado pelo título é exibido
   */
  test('renders an accessible dialog with title', () => {
    render(<Modal titulo="Remarcar consulta" aberto onFechar={() => {}}><p>Conteúdo</p></Modal>);
    expect(screen.getByRole('dialog', { name: 'Remarcar consulta' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-354
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Explicar o contexto da ação no diálogo
   * @resultadoEsperado A descrição aparece junto do título
   */
  test('shows the description', () => {
    render(<Modal titulo="Cancelar" descricao="Esta ação não pode ser desfeita." aberto onFechar={() => {}}><p>Conteúdo</p></Modal>);
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-355
   * @nivel integracao
   * @atributo manutenibilidade
   * @subatributo reusabilidade
   * @requisito RNF07
   * @objetivo Permitir qualquer conteúdo dentro do diálogo
   * @resultadoEsperado Os filhos são renderizados dentro do diálogo
   */
  test('renders its children', () => {
    render(<Modal titulo="T" aberto onFechar={() => {}}><button type="button">Confirmar</button></Modal>);
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-356
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Fechar o diálogo pelo teclado
   * @resultadoEsperado A tecla Esc chama onFechar
   */
  test('closes on Escape', async () => {
    const usuario = userEvent.setup();
    const fechar = vi.fn();
    render(<Modal titulo="T" aberto onFechar={fechar}><input aria-label="Campo" /></Modal>);
    await usuario.keyboard('{Escape}');
    expect(fechar).toHaveBeenCalledTimes(1);
  });

  /**
   * @caso CT-INT-357
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Fechar ao clicar fora da caixa
   * @resultadoEsperado O clique no fundo chama onFechar
   */
  test('closes when the backdrop is clicked', async () => {
    const usuario = userEvent.setup();
    const fechar = vi.fn();
    const { container } = render(<Modal titulo="T" aberto onFechar={fechar}><p>Conteúdo</p></Modal>);
    await usuario.click(container.querySelector('.modal-fundo'));
    expect(fechar).toHaveBeenCalledTimes(1);
  });

  /**
   * @caso CT-INT-358
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF06
   * @objetivo Não fechar quando o clique ocorre no conteúdo
   * @resultadoEsperado Clicar dentro do diálogo não chama onFechar
   */
  test('does not close when clicking inside', async () => {
    const usuario = userEvent.setup();
    const fechar = vi.fn();
    render(<Modal titulo="T" aberto onFechar={fechar}><p>Conteúdo interno</p></Modal>);
    await usuario.click(screen.getByText('Conteúdo interno'));
    expect(fechar).not.toHaveBeenCalled();
  });

  /**
   * @caso CT-INT-359
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Não reservar diálogo quando ele está fechado
   * @resultadoEsperado Com aberto=false nada é renderizado
   */
  test('renders nothing when closed', () => {
    const { container } = render(<Modal titulo="T" aberto={false} onFechar={() => {}}><p>Conteúdo</p></Modal>);
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * @caso CT-INT-360
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Levar o foco ao primeiro controle ao abrir
   * @resultadoEsperado O primeiro input recebe foco
   */
  test('focuses the first field on open', () => {
    render(<Modal titulo="T" aberto onFechar={() => {}}><input aria-label="Motivo" /></Modal>);
    expect(screen.getByLabelText('Motivo')).toHaveFocus();
  });
});

describe('DialogoTexto', () => {
  /**
   * @caso CT-INT-361
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Pedir o texto com rótulo e contexto
   * @resultadoEsperado O textarea é encontrável pelo rótulo informado
   */
  test('renders the labelled textarea', () => {
    render(<DialogoTexto titulo="Cancelar consulta" descricao="Motivo é obrigatório." rotulo="Motivo do cancelamento" onConfirmar={() => {}} onCancelar={() => {}} />);
    expect(screen.getByLabelText('Motivo do cancelamento').tagName).toBe('TEXTAREA');
  });

  /**
   * @caso CT-INT-362
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Entregar o motivo digitado ao confirmar
   * @resultadoEsperado onConfirmar recebe o texto do textarea
   */
  test('submits the typed text', async () => {
    const usuario = userEvent.setup();
    const confirmar = vi.fn();
    render(<DialogoTexto titulo="Cancelar" rotulo="Motivo" onConfirmar={confirmar} onCancelar={() => {}} />);
    await usuario.type(screen.getByLabelText('Motivo'), 'Imprevisto');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(confirmar).toHaveBeenCalledWith('Imprevisto');
  });

  /**
   * @caso CT-INT-363
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Nomear a ação com o texto específico da tela
   * @resultadoEsperado O botão usa "Registrar atendimento"
   */
  test('uses the custom confirm label', () => {
    render(<DialogoTexto titulo="T" rotulo="Observações" textoConfirmar="Registrar atendimento" onConfirmar={() => {}} onCancelar={() => {}} />);
    expect(screen.getByRole('button', { name: 'Registrar atendimento' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-364
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Desistir da ação sem enviar nada
   * @resultadoEsperado O botão Voltar chama onCancelar
   */
  test('cancels the action', async () => {
    const usuario = userEvent.setup();
    const cancelar = vi.fn();
    render(<DialogoTexto titulo="T" rotulo="Motivo" onConfirmar={() => {}} onCancelar={cancelar} />);
    await usuario.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(cancelar).toHaveBeenCalledTimes(1);
  });

  /**
   * @caso CT-INT-365
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Identificar o diálogo pelo título em qualquer contexto
   * @resultadoEsperado O role dialog é nomeado pelo título
   */
  test('exposes the dialog title', () => {
    render(<DialogoTexto titulo="Registrar atendimento" rotulo="Observações" onConfirmar={() => {}} onCancelar={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Registrar atendimento' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-366
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Permitir observação vazia quando o campo é opcional
   * @resultadoEsperado Confirmar sem digitar chama onConfirmar com string vazia
   */
  test('confirms with empty text', async () => {
    const usuario = userEvent.setup();
    const confirmar = vi.fn();
    render(<DialogoTexto titulo="T" rotulo="Observações (opcional)" onConfirmar={confirmar} onCancelar={() => {}} />);
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(confirmar).toHaveBeenCalledWith('');
  });
});

describe('SeletorHorarios', () => {
  /**
   * @caso CT-INT-367
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Agrupar os horários como uma escolha única
   * @resultadoEsperado O contêiner tem aria-label "Horários disponíveis"
   */
  test('renders the hours group', () => {
    render(<SeletorHorarios id="horarios" medicoId={1} data="2026-10-21" selecionado={null} onEscolher={() => {}} />);
    expect(screen.getByRole('group', { name: 'Horários disponíveis' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-368
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Sinalizar espera enquanto os horários carregam
   * @resultadoEsperado O grupo fica aria-busy enquanto a chamada está pendente
   */
  test('marks the group as busy while loading', () => {
    medicosApi.horarios.mockReturnValue(new Promise(() => {}));
    render(<SeletorHorarios medicoId={1} data="2026-10-21" selecionado={null} onEscolher={() => {}} />);
    expect(screen.getByRole('group')).toHaveAttribute('aria-busy', 'true');
  });

  /**
   * @caso CT-INT-369
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1
   * @objetivo Listar os horários livres retornados pela API
   * @resultadoEsperado Dois botões 09:00 e 09:45 aparecem
   */
  test('lists the available times', async () => {
    render(<SeletorHorarios medicoId={1} data="2026-10-21" selecionado={null} onEscolher={() => {}} />);
    expect(await screen.findByRole('button', { name: '09:00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '09:45' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-370
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1
   * @objetivo Entregar data e hora completas ao escolher um horário
   * @resultadoEsperado onEscolher recebe "2026-10-21 09:45"
   */
  test('returns the full timestamp when chosen', async () => {
    const usuario = userEvent.setup();
    const escolher = vi.fn();
    render(<SeletorHorarios medicoId={1} data="2026-10-21" selecionado={null} onEscolher={escolher} />);
    await usuario.click(await screen.findByRole('button', { name: '09:45' }));
    expect(escolher).toHaveBeenCalledWith('2026-10-21 09:45');
  });

  /**
   * @caso CT-INT-371
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Destacar visualmente o horário escolhido
   * @resultadoEsperado O botão do horário selecionado tem aria-pressed true
   */
  test('marks the selected time as pressed', async () => {
    render(<SeletorHorarios medicoId={1} data="2026-10-21" selecionado="2026-10-21 09:00" onEscolher={() => {}} />);
    expect(await screen.findByRole('button', { name: '09:00' })).toHaveAttribute('aria-pressed', 'true');
  });

  /**
   * @caso CT-INT-372
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Orientar quando o dia não tem vagas
   * @resultadoEsperado A mensagem sugere tentar outro dia
   */
  test('explains when there are no free times', async () => {
    medicosApi.horarios.mockResolvedValue({ horarios: [] });
    render(<SeletorHorarios medicoId={1} data="2026-10-21" selecionado={null} onEscolher={() => {}} />);
    expect(await screen.findByText('Nenhum horário livre nesta data. Tente outro dia.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-373
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Explicar a falha ao carregar horários
   * @resultadoEsperado A mensagem da API é exibida no lugar da grade
   */
  test('shows the API error when loading fails', async () => {
    medicosApi.horarios.mockRejectedValue(new Error('Não foi possível conectar ao servidor.'));
    render(<SeletorHorarios medicoId={1} data="2026-10-21" selecionado={null} onEscolher={() => {}} />);
    expect(await screen.findByText('Não foi possível conectar ao servidor.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-374
   * @nivel integracao
   * @atributo eficiencia-de-desempenho
   * @subatributo comportamento
   * @requisito RNF05
   * @objetivo Não consultar horários antes de médico e data estarem definidos
   * @resultadoEsperado Sem médico ou data, a API não é chamada
   */
  test('does not load without doctor and date', () => {
    render(<SeletorHorarios medicoId="" data="" selecionado={null} onEscolher={() => {}} />);
    expect(medicosApi.horarios).not.toHaveBeenCalled();
  });

  /**
   * @caso CT-INT-375
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.1
   * @objetivo Atualizar a lista depois de um agendamento bem-sucedido
   * @resultadoEsperado Mudar recarregarChave consulta os horários outra vez
   */
  test('reloads when the reload key changes', async () => {
    const { rerender } = render(<SeletorHorarios medicoId={1} data="2026-10-21" selecionado={null} onEscolher={() => {}} recarregarChave={0} />);
    await waitFor(() => expect(medicosApi.horarios).toHaveBeenCalledTimes(1));
    rerender(<SeletorHorarios medicoId={1} data="2026-10-21" selecionado={null} onEscolher={() => {}} recarregarChave={1} />);
    await waitFor(() => expect(medicosApi.horarios).toHaveBeenCalledTimes(2));
  });

  /**
   * @caso CT-INT-376
   * @nivel integracao
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Expor o horário completo em cada botão para automação
   * @resultadoEsperado Cada botão declara data-inicio com o timestamp
   */
  test('exposes data-inicio on each time button', async () => {
    render(<SeletorHorarios medicoId={1} data="2026-10-21" selecionado={null} onEscolher={() => {}} />);
    const botao = await screen.findByRole('button', { name: '09:00' });
    expect(botao).toHaveAttribute('data-inicio', '2026-10-21 09:00');
  });
});

describe('DialogoRemarcar', () => {
  const CONSULTA = {
    id: 12,
    medicoId: 1,
    medicoNome: 'Dr. Carlos Almeida',
    inicio: '2026-10-20 10:00',
    status: 'AGENDADA',
  };

  function montarDialogo(props = {}) {
    return render(
      <ToastProvider>
        <DialogoRemarcar consulta={CONSULTA} onFechar={props.onFechar ?? (() => {})} onRemarcada={props.onRemarcada ?? (() => {})} />
      </ToastProvider>,
    );
  }

  /**
   * @caso CT-INT-377
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF09.3
   * @objetivo Mostrar o horário atual antes da troca
   * @resultadoEsperado A descrição exibe médico e data atual
   */
  test('shows the current appointment', () => {
    montarDialogo();
    expect(screen.getByText(/horário atual: 20\/10\/2026 10:00/)).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-378
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF09.3, RNF06
   * @objetivo Impedir confirmação sem escolher o novo horário
   * @resultadoEsperado O botão de confirmar começa desabilitado
   */
  test('disables confirmation without a chosen time', () => {
    montarDialogo();
    expect(screen.getByRole('button', { name: 'Confirmar nova data' })).toBeDisabled();
  });

  /**
   * @caso CT-INT-379
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.3, RN27
   * @objetivo Remarcar para o horário escolhido no seletor
   * @resultadoEsperado consultasApi.remarcar recebe id e novo início
   */
  test('calls the API with the chosen time', async () => {
    const usuario = userEvent.setup();
    consultasApi.remarcar.mockResolvedValue({ ...CONSULTA, inicio: '2026-10-21 09:45' });
    montarDialogo();
    fireEvent.change(screen.getByLabelText('Nova data'), { target: { value: '2026-10-21' } });
    await usuario.click(await screen.findByRole('button', { name: '09:45' }));
    await usuario.click(screen.getByRole('button', { name: 'Confirmar nova data' }));
    await waitFor(() => expect(consultasApi.remarcar).toHaveBeenCalledWith(12, '2026-10-21 09:45'));
  });

  /**
   * @caso CT-INT-380
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.3
   * @objetivo Devolver a consulta atualizada para a lista
   * @resultadoEsperado onRemarcada recebe o objeto retornado pela API
   */
  test('notifies the parent with the updated appointment', async () => {
    const usuario = userEvent.setup();
    const atualizada = { ...CONSULTA, inicio: '2026-10-21 09:45' };
    consultasApi.remarcar.mockResolvedValue(atualizada);
    const remarcada = vi.fn();
    montarDialogo({ onRemarcada: remarcada });
    fireEvent.change(screen.getByLabelText('Nova data'), { target: { value: '2026-10-21' } });
    await usuario.click(await screen.findByRole('button', { name: '09:45' }));
    await usuario.click(screen.getByRole('button', { name: 'Confirmar nova data' }));
    await waitFor(() => expect(remarcada).toHaveBeenCalledWith(atualizada));
  });

  /**
   * @caso CT-INT-381
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Explicar por que a remarcação foi recusada
   * @resultadoEsperado O erro da API aparece em alerta dentro do diálogo
   */
  test('shows the remarcation error', async () => {
    const usuario = userEvent.setup();
    consultasApi.remarcar.mockRejectedValue(new Error('Remarcação permitida apenas uma vez.'));
    montarDialogo();
    fireEvent.change(screen.getByLabelText('Nova data'), { target: { value: '2026-10-21' } });
    await usuario.click(await screen.findByRole('button', { name: '09:45' }));
    await usuario.click(screen.getByRole('button', { name: 'Confirmar nova data' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Remarcação permitida apenas uma vez.');
  });

  /**
   * @caso CT-INT-382
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Voltar sem alterar a consulta
   * @resultadoEsperado O botão Voltar chama onFechar
   */
  test('closes without changing', async () => {
    const usuario = userEvent.setup();
    const fechar = vi.fn();
    montarDialogo({ onFechar: fechar });
    await usuario.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(fechar).toHaveBeenCalledTimes(1);
    expect(consultasApi.remarcar).not.toHaveBeenCalled();
  });
});
