// Integração da tela "Minhas consultas": ordenação, confirmação, cancelamento e remarcação (RF05, RF11).
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../src/api', () => ({
  authApi: { login: vi.fn(), registrar: vi.fn(), me: vi.fn() },
  especialidadesApi: { listar: vi.fn(), criar: vi.fn() },
  medicosApi: { listar: vi.fn(), criar: vi.fn(), horarios: vi.fn(), grade: vi.fn(), salvarGrade: vi.fn(), bloqueios: vi.fn(), criarBloqueio: vi.fn(), removerBloqueio: vi.fn() },
  pacientesApi: { listar: vi.fn(), criar: vi.fn() },
  consultasApi: { listar: vi.fn(), agendar: vi.fn(), confirmar: vi.fn(), cancelar: vi.fn(), remarcar: vi.fn(), realizar: vi.fn(), falta: vi.fn() },
  adminApi: { definirAtivo: vi.fn(), resumo: vi.fn() },
}));

import { consultasApi, medicosApi } from '../../src/api';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { MinhasConsultasPage } from '../../src/pages/paciente/MinhasConsultasPage';

const consulta = (extra = {}) => ({
  id: 1,
  inicio: '2026-10-20 10:00',
  medicoNome: 'Dr. Carlos Almeida',
  especialidadeNome: 'Clínica Geral',
  valorCentavos: 15000,
  status: 'AGENDADA',
  ...extra,
});

function montar() {
  return render(
    <MemoryRouter initialEntries={['/paciente']}>
      <ToastProvider>
        <Routes>
          <Route path="/paciente" element={<MinhasConsultasPage />} />
          <Route path="/paciente/agendar" element={<div>Tela de agendamento</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

function linha(id) {
  return document.querySelector(`tr[data-consulta-id="${id}"]`);
}

beforeEach(() => {
  vi.clearAllMocks();
  consultasApi.listar.mockResolvedValue([consulta()]);
  consultasApi.confirmar.mockResolvedValue({ ...consulta(), status: 'CONFIRMADA' });
  consultasApi.cancelar.mockResolvedValue(null);
  consultasApi.remarcar.mockResolvedValue({ ...consulta(), inicio: '2026-10-21 09:45' });
  medicosApi.horarios.mockResolvedValue({ horarios: ['2026-10-21 09:45'] });
});

afterEach(cleanup);

describe('MinhasConsultasPage — listagem', () => {
  /**
   * @caso CT-INT-383
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Informar que a lista está sendo carregada
   * @resultadoEsperado Antes da resposta aparece "Carregando..."
   */
  test('shows the loading caption', () => {
    consultasApi.listar.mockReturnValue(new Promise(() => {}));
    montar();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-384
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Resumir quantas consultas ainda estão ativas
   * @resultadoEsperado O texto informa 1 ativa de 2 no total
   */
  test('summarizes active appointments', async () => {
    consultasApi.listar.mockResolvedValue([consulta(), consulta({ id: 2, status: 'REALIZADA' })]);
    montar();
    expect(await screen.findByText('1 consulta(s) ativa(s) de 2 no total.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-385
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.1
   * @objetivo Exibir o histórico retornado pela API
   * @resultadoEsperado A linha da consulta mostra médico e valor
   */
  test('renders the appointment rows', async () => {
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    expect(linha(1)).toHaveTextContent('Dr. Carlos Almeida');
    expect(linha(1)).toHaveTextContent('150,00');
  });

  /**
   * @caso CT-INT-386
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Convidar o paciente novo a agendar a primeira consulta
   * @resultadoEsperado A mensagem "Você ainda não tem consultas" é exibida
   */
  test('shows the empty state for a new patient', async () => {
    consultasApi.listar.mockResolvedValue([]);
    montar();
    expect(await screen.findByText('Você ainda não tem consultas. Que tal agendar a primeira?')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-387
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.1
   * @objetivo Mostrar primeiro o atendimento mais recente
   * @resultadoEsperado A consulta de 25/10 aparece antes da de 20/10
   */
  test('sorts appointments from newest to oldest', async () => {
    consultasApi.listar.mockResolvedValue([
      consulta({ id: 1, inicio: '2026-10-20 10:00' }),
      consulta({ id: 2, inicio: '2026-10-25 09:00' }),
    ]);
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    const ids = [...document.querySelectorAll('tbody tr[data-consulta-id]')].map((tr) => tr.getAttribute('data-consulta-id'));
    expect(ids).toEqual(['2', '1']);
  });

  /**
   * @caso CT-INT-388
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Oferecer o atalho para uma nova consulta
   * @resultadoEsperado O link "Nova consulta" abre a tela de agendamento
   */
  test('links to a new appointment', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(screen.getByRole('link', { name: 'Nova consulta' }));
    expect(screen.getByText('Tela de agendamento')).toBeInTheDocument();
  });
});

describe('MinhasConsultasPage — confirmação', () => {
  /**
   * @caso CT-INT-389
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Oferecer confirmação apenas para consultas agendadas
   * @resultadoEsperado A linha AGENDADA tem o botão Confirmar
   */
  test('offers confirmation for an AGENDADA appointment', async () => {
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    expect(within(linha(1)).getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-390
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Não confirmar novamente uma consulta já confirmada
   * @resultadoEsperado A linha CONFIRMADA não tem o botão Confirmar
   */
  test('hides confirmation for a CONFIRMADA appointment', async () => {
    consultasApi.listar.mockResolvedValue([consulta({ status: 'CONFIRMADA' })]);
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    expect(within(linha(1)).queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
  });

  /**
   * @caso CT-INT-391
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Confirmar a presença na consulta escolhida
   * @resultadoEsperado consultasApi.confirmar recebe o id da consulta
   */
  test('confirms the chosen appointment', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Confirmar' }));
    expect(consultasApi.confirmar).toHaveBeenCalledWith(1);
  });

  /**
   * @caso CT-INT-392
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar a ação com data e hora na mensagem
   * @resultadoEsperado Um toast informa a presença confirmada
   */
  test('shows the confirmation toast', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText(/Presença confirmada para 20\/10\/2026 10:00/)).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-393
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RF09.1
   * @objetivo Refletir o novo status sem recarregar a página
   * @resultadoEsperado A lista é consultada novamente após confirmar
   */
  test('reloads the list after confirmation', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(consultasApi.listar).toHaveBeenCalledTimes(2));
  });
});

describe('MinhasConsultasPage — cancelamento', () => {
  /**
   * @caso CT-INT-394
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Pedir confirmação antes de cancelar
   * @resultadoEsperado Um diálogo "Cancelar consulta?" é aberto
   */
  test('opens the cancel dialog', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: 'Cancelar consulta?' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-395
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Cancelar a consulta somente após a confirmação explícita
   * @resultadoEsperado consultasApi.cancelar recebe id e motivo do paciente
   */
  test('cancels after explicit confirmation', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Cancelar' }));
    await usuario.click(screen.getByRole('button', { name: 'Sim, cancelar' }));
    expect(consultasApi.cancelar).toHaveBeenCalledWith(1, 'Cancelado pelo paciente');
  });

  /**
   * @caso CT-INT-396
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Desistir do cancelamento mantendo a consulta
   * @resultadoEsperado "Manter consulta" fecha o diálogo sem chamar a API
   */
  test('keeps the appointment when the dialog is dismissed', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Cancelar' }));
    await usuario.click(screen.getByRole('button', { name: 'Manter consulta' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(consultasApi.cancelar).not.toHaveBeenCalled();
  });

  /**
   * @caso CT-INT-397
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar o cancelamento ao paciente
   * @resultadoEsperado Um toast informa que a consulta foi cancelada
   */
  test('shows the cancellation toast', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Cancelar' }));
    await usuario.click(screen.getByRole('button', { name: 'Sim, cancelar' }));
    expect(await screen.findByText('Sua consulta foi cancelada.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-398
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Explicar a recusa do cancelamento sem fechar o contexto
   * @resultadoEsperado O erro da API aparece em alerta
   */
  test('shows the cancellation error', async () => {
    const usuario = userEvent.setup();
    consultasApi.cancelar.mockRejectedValue(new Error('Cancelamento permitido até 24 horas antes.'));
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Cancelar' }));
    await usuario.click(screen.getByRole('button', { name: 'Sim, cancelar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cancelamento permitido até 24 horas antes.');
  });
});

describe('MinhasConsultasPage — remarcação', () => {
  /**
   * @caso CT-INT-399
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.3, RN27
   * @objetivo Remarcar a consulta pelo diálogo com seletor de horários
   * @resultadoEsperado A nova data é enviada com o id da consulta
   */
  test('remarcates using the dialog', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Remarcar' }));
    expect(screen.getByRole('dialog', { name: 'Remarcar consulta' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nova data'), { target: { value: '2026-10-21' } });
    await usuario.click(await screen.findByRole('button', { name: '09:45' }));
    await usuario.click(screen.getByRole('button', { name: 'Confirmar nova data' }));
    await waitFor(() => expect(consultasApi.remarcar).toHaveBeenCalledWith(1, '2026-10-21 09:45'));
  });

  /**
   * @caso CT-INT-400
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Mostrar a nova data após remarcar
   * @resultadoEsperado Um toast confirma "Consulta remarcada" com o novo horário
   */
  test('shows the reschedule toast', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Remarcar' }));
    fireEvent.change(screen.getByLabelText('Nova data'), { target: { value: '2026-10-21' } });
    await usuario.click(await screen.findByRole('button', { name: '09:45' }));
    await usuario.click(screen.getByRole('button', { name: 'Confirmar nova data' }));
    expect(await screen.findByText('Consulta remarcada')).toBeInTheDocument();
    expect(screen.getByText(/Nova data: 21\/10\/2026 09:45\./)).toBeInTheDocument();
  });
});
