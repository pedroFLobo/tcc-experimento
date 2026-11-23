# lote-056

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 16 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0920 | CT-INT-483 | shows the daily agenda heading | passou |  |
| deepseek-0921 | CT-INT-484 | queries the selected day | passou |  |
| deepseek-0922 | CT-INT-485 | offers every status filter | passou |  |
| deepseek-0923 | CT-INT-486 | reloads when the date changes | passou |  |
| deepseek-0924 | CT-INT-487 | reloads when the status changes | passou |  |
| deepseek-0925 | CT-INT-488 | explains the no-show tolerance | passou |  |
| deepseek-0926 | CT-INT-489 | renders the day appointments | passou |  |
| deepseek-0927 | CT-INT-490 | summarizes the status counters | passou |  |
| deepseek-0928 | CT-INT-491 | shows the empty agenda message | passou |  |
| deepseek-0929 | CT-INT-492 | hides actions for closed appointments | passou |  |
| deepseek-0930 | CT-INT-493 | opens the attendance dialog | passou |  |
| deepseek-0931 | CT-INT-494 | registers the attendance with notes | passou |  |
| deepseek-0932 | CT-INT-495 | shows the attendance toast | passou |  |
| deepseek-0933 | CT-INT-496 | shows the attendance error | passou |  |
| deepseek-0934 | CT-INT-497 | registers a no-show | passou |  |
| deepseek-0935 | CT-INT-498 | cancels with a mandatory reason | passou |  |

## Arquivo: frontend/__testes__/integracao/medico-agenda.test.jsx

```js
// Integração da agenda diária do médico: filtros, contadores e registro de atendimento/falta/cancelamento (RF08, RN20–RN25).
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../src/api', () => ({
  authApi: { login: vi.fn(), registrar: vi.fn(), me: vi.fn() },
  especialidadesApi: { listar: vi.fn(), criar: vi.fn() },
  medicosApi: { listar: vi.fn(), criar: vi.fn(), horarios: vi.fn(), grade: vi.fn(), salvarGrade: vi.fn(), bloqueios: vi.fn(), criarBloqueio: vi.fn(), removerBloqueio: vi.fn() },
  pacientesApi: { listar: vi.fn(), criar: vi.fn() },
  consultasApi: { listar: vi.fn(), agendar: vi.fn(), confirmar: vi.fn(), cancelar: vi.fn(), remarcar: vi.fn(), realizar: vi.fn(), falta: vi.fn() },
  adminApi: { definirAtivo: vi.fn(), resumo: vi.fn() },
}));

import { consultasApi } from '../../src/api';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { AgendaPage } from '../../src/pages/medico/AgendaPage';

const consulta = (extra = {}) => ({
  id: 1,
  inicio: '2026-10-19 10:00',
  pacienteNome: 'Ana Pereira',
  medicoNome: 'Dr. Carlos Almeida',
  especialidadeNome: 'Clínica Geral',
  valorCentavos: 15000,
  status: 'AGENDADA',
  observacoes: null,
  motivoCancelamento: null,
  ...extra,
});

function montar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AgendaPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

const linha = (id) => document.querySelector(`tr[data-consulta-id="${id}"]`);

beforeEach(() => {
  vi.clearAllMocks();
  consultasApi.listar.mockResolvedValue([consulta()]);
  consultasApi.realizar.mockResolvedValue({ ...consulta(), status: 'REALIZADA' });
  consultasApi.falta.mockResolvedValue({ ...consulta(), status: 'FALTA' });
  consultasApi.cancelar.mockResolvedValue(null);
});

afterEach(cleanup);

describe('AgendaPage — filtros', () => {
  /**
   * @caso CT-INT-483
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF10.2, RNF06
   * @objetivo Identificar a tela de atendimentos do dia
   * @resultadoEsperado O título "Atendimentos do dia" é exibido
   */
  test('shows the daily agenda heading', () => {
    montar();
    expect(screen.getByRole('heading', { name: 'Atendimentos do dia' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-484
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.2
   * @objetivo Consultar apenas as consultas do dia selecionado
   * @resultadoEsperado listar recebe a mesma data no início e no fim
   */
  test('queries the selected day', async () => {
    montar();
    await waitFor(() => expect(consultasApi.listar).toHaveBeenCalled());
    const filtros = consultasApi.listar.mock.calls[0][0];
    expect(filtros.dataInicio).toBe(filtros.dataFim);
    expect(filtros.status).toBe('');
  });

  /**
   * @caso CT-INT-485
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.2
   * @objetivo Permitir filtrar por qualquer status
   * @resultadoEsperado O filtro tem Todos e os cinco status
   */
  test('offers every status filter', () => {
    montar();
    const select = screen.getByLabelText('Status');
    expect(within(select).getAllByRole('option')).toHaveLength(6);
  });

  /**
   * @caso CT-INT-486
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.2
   * @objetivo Recarregar a agenda ao escolher outra data
   * @resultadoEsperado listar é chamado novamente com a nova data
   */
  test('reloads when the date changes', async () => {
    montar();
    await waitFor(() => expect(consultasApi.listar).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-10-20' } });
    await waitFor(() => expect(consultasApi.listar).toHaveBeenLastCalledWith(expect.objectContaining({
      dataInicio: '2026-10-20',
      dataFim: '2026-10-20',
    })));
  });

  /**
   * @caso CT-INT-487
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.2
   * @objetivo Recarregar a agenda ao trocar o status
   * @resultadoEsperado listar é chamado com o status escolhido
   */
  test('reloads when the status changes', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(consultasApi.listar).toHaveBeenCalledTimes(1));
    await usuario.selectOptions(screen.getByLabelText('Status'), 'FALTA');
    await waitFor(() => expect(consultasApi.listar).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'FALTA' })));
  });

  /**
   * @caso CT-INT-488
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RN29, RNF06
   * @objetivo Explicar a tolerância de 15 minutos para registrar falta
   * @resultadoEsperado A descrição cita o registro a partir do horário e a tolerância
   */
  test('explains the no-show tolerance', () => {
    montar();
    expect(screen.getByText(/a falta após 15 minutos de tolerância/)).toBeInTheDocument();
  });
});

describe('AgendaPage — tabela e contadores', () => {
  /**
   * @caso CT-INT-489
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.2
   * @objetivo Mostrar paciente, status e observações do dia
   * @resultadoEsperado A linha exibe Ana Pereira e o badge Agendada
   */
  test('renders the day appointments', async () => {
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    expect(linha(1)).toHaveTextContent('Ana Pereira');
    expect(within(linha(1)).getByText('Agendada')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-490
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Resumir quantas consultas há em cada status
   * @resultadoEsperado Os contadores mostram 2 agendadas e 1 falta
   */
  test('summarizes the status counters', async () => {
    consultasApi.listar.mockResolvedValue([
      consulta({ id: 1 }),
      consulta({ id: 2 }),
      consulta({ id: 3, status: 'FALTA' }),
    ]);
    montar();
    await waitFor(() => expect(linha(3)).toBeInTheDocument());
    const contadores = [...document.querySelectorAll('p.descricao span')];
    expect(contadores.find((s) => s.textContent.includes('Agendada')).textContent).toContain('2');
    expect(contadores.find((s) => s.textContent.includes('Falta')).textContent).toContain('1');
  });

  /**
   * @caso CT-INT-491
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Explicar quando o dia não tem consultas
   * @resultadoEsperado A mensagem de filtros vazios é exibida
   */
  test('shows the empty agenda message', async () => {
    consultasApi.listar.mockResolvedValue([]);
    montar();
    expect(await screen.findByText('Nenhuma consulta para os filtros escolhidos.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-492
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF09
   * @objetivo Não oferecer ações para consultas encerradas
   * @resultadoEsperado A linha CANCELADA não tem botões de ação
   */
  test('hides actions for closed appointments', async () => {
    consultasApi.listar.mockResolvedValue([consulta({ status: 'CANCELADA' })]);
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    expect(within(linha(1)).queryByRole('button', { name: 'Atendido' })).not.toBeInTheDocument();
  });
});

describe('AgendaPage — atendimento', () => {
  /**
   * @caso CT-INT-493
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF09.4, RN28
   * @objetivo Abrir o registro de atendimento com observações opcionais
   * @resultadoEsperado O diálogo "Registrar atendimento" é exibido
   */
  test('opens the attendance dialog', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Atendido' }));
    expect(screen.getByRole('dialog', { name: 'Registrar atendimento' })).toBeInTheDocument();
    expect(screen.getByLabelText('Observações (opcional)')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-494
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.4, RN28
   * @objetivo Registrar o atendimento com as observações digitadas
   * @resultadoEsperado consultasApi.realizar recebe id e observações
   */
  test('registers the attendance with notes', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Atendido' }));
    await usuario.type(screen.getByLabelText('Observações (opcional)'), 'Paciente estável.');
    await usuario.click(screen.getByRole('button', { name: 'Registrar atendimento' }));
    await waitFor(() => expect(consultasApi.realizar).toHaveBeenCalledWith(1, 'Paciente estável.'));
  });

  /**
   * @caso CT-INT-495
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar o atendimento registrado pelo nome do paciente
   * @resultadoEsperado O toast informa o atendimento de Ana Pereira
   */
  test('shows the attendance toast', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Atendido' }));
    await usuario.click(screen.getByRole('button', { name: 'Registrar atendimento' }));
    expect(await screen.findByText('Atendimento de Ana Pereira registrado.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-496
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04, RN28
   * @objetivo Explicar a recusa do atendimento fora da janela
   * @resultadoEsperado O erro da API aparece em um alerta
   */
  test('shows the attendance error', async () => {
    const usuario = userEvent.setup();
    consultasApi.realizar.mockRejectedValue(new Error('Atendimento só pode ser registrado a partir do horário da consulta.'));
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Atendido' }));
    await usuario.click(screen.getByRole('button', { name: 'Registrar atendimento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Atendimento só pode ser registrado a partir do horário da consulta.');
  });
});

describe('AgendaPage — falta e cancelamento', () => {
  /**
   * @caso CT-INT-497
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.5, RN29
   * @objetivo Registrar falta diretamente pela linha da consulta
   * @resultadoEsperado consultasApi.falta recebe o id e o toast confirma
   */
  test('registers a no-show', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Falta' }));
    expect(consultasApi.falta).toHaveBeenCalledWith(1);
    expect(await screen.findByText('Falta registrada para Ana Pereira.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-498
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Cancelar a consulta do médico exigindo motivo
   * @resultadoEsperado consultasApi.cancelar recebe id e motivo digitado
   */
  test('cancels with a mandatory reason', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Cancelar' }));
    await usuario.type(screen.getByLabelText('Motivo do cancelamento'), 'Emergência cirúrgica');
    await usuario.click(screen.getByRole('button', { name: 'Cancelar consulta' }));
    await waitFor(() => expect(consultasApi.cancelar).toHaveBeenCalledWith(1, 'Emergência cirúrgica'));
  });
});
```
