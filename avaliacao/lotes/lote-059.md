# lote-059

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 18 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0972 | CT-INT-401 | renders the five filter fields | passou |  |
| deepseek-0973 | CT-INT-402 | fills the doctor filter options | passou |  |
| deepseek-0974 | CT-INT-403 | fills the patient filter options | passou |  |
| deepseek-0975 | CT-INT-404 | applies the chosen filters | passou |  |
| deepseek-0976 | CT-INT-405 | shows the result count | passou |  |
| deepseek-0977 | CT-INT-406 | shows the clear button after filtering | passou |  |
| deepseek-0978 | CT-INT-407 | clears the filters | passou |  |
| deepseek-0979 | CT-INT-408 | lists every status in the filter | passou |  |
| deepseek-0980 | CT-INT-409 | shows patient, doctor, value and status | passou |  |
| deepseek-0981 | CT-INT-410 | shows the empty state | passou |  |
| deepseek-0982 | CT-INT-411 | shows a listing error | passou |  |
| deepseek-0983 | CT-INT-412 | confirms an appointment | passou |  |
| deepseek-0984 | CT-INT-413 | shows the reception confirmation toast | passou |  |
| deepseek-0985 | CT-INT-414 | registers a no-show | passou |  |
| deepseek-0986 | CT-INT-415 | shows the no-show toast | passou |  |
| deepseek-0987 | CT-INT-416 | cancels with a mandatory reason | passou |  |
| deepseek-0988 | CT-INT-417 | opens the reschedule dialog | passou |  |
| deepseek-0989 | CT-INT-418 | hides confirmation for an already confirmed appointment | passou |  |

## Arquivo: frontend/__testes__/integracao/recepcao-consultas.test.jsx

```js
// Integração da operação de consultas pela recepção: filtros, confirmação, falta e cancelamento (RF05, RF11, RN17–RN25).
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

import { consultasApi, medicosApi, pacientesApi } from '../../src/api';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { ConsultasPage } from '../../src/pages/recepcao/ConsultasPage';

const consulta = (extra = {}) => ({
  id: 1,
  inicio: '2026-10-20 10:00',
  pacienteNome: 'Ana Pereira',
  medicoNome: 'Dr. Carlos Almeida',
  especialidadeNome: 'Clínica Geral',
  valorCentavos: 15000,
  status: 'AGENDADA',
  ...extra,
});

function montar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ConsultasPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

const linha = (id) => document.querySelector(`tr[data-consulta-id="${id}"]`);

beforeEach(() => {
  vi.clearAllMocks();
  medicosApi.listar.mockResolvedValue([{ id: 1, nome: 'Dr. Carlos Almeida' }, { id: 2, nome: 'Dra. Beatriz Souza' }]);
  pacientesApi.listar.mockResolvedValue([{ id: 1, nome: 'Ana Pereira' }, { id: 2, nome: 'João Santos' }]);
  consultasApi.listar.mockResolvedValue([consulta()]);
  consultasApi.confirmar.mockResolvedValue({ ...consulta(), status: 'CONFIRMADA' });
  consultasApi.falta.mockResolvedValue({ ...consulta(), status: 'FALTA' });
  consultasApi.cancelar.mockResolvedValue(null);
});

afterEach(cleanup);

describe('ConsultasPage — filtros', () => {
  /**
   * @caso CT-INT-401
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Permitir filtrar por período, status, médico e paciente
   * @resultadoEsperado Os cinco campos de filtro estão presentes
   */
  test('renders the five filter fields', () => {
    montar();
    expect(screen.getByLabelText('De')).toBeInTheDocument();
    expect(screen.getByLabelText('Até')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Médico')).toBeInTheDocument();
    expect(screen.getByLabelText('Paciente')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-402
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Popular o filtro de médico com a equipe cadastrada
   * @resultadoEsperado As opções Carlos e Beatriz aparecem no select
   */
  test('fills the doctor filter options', async () => {
    montar();
    expect(await screen.findByRole('option', { name: 'Dr. Carlos Almeida' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Dra. Beatriz Souza' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-403
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Popular o filtro de paciente com os pacientes cadastrados
   * @resultadoEsperado As opções Ana Pereira e João Santos aparecem
   */
  test('fills the patient filter options', async () => {
    montar();
    expect(await screen.findByRole('option', { name: 'Ana Pereira' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'João Santos' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-404
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Aplicar os filtros apenas ao confirmar o formulário
   * @resultadoEsperado listar recebe o período escolhido
   */
  test('applies the chosen filters', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(consultasApi.listar).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-10-31' } });
    await usuario.click(screen.getByRole('button', { name: 'Filtrar' }));
    await waitFor(() => expect(consultasApi.listar).toHaveBeenLastCalledWith(expect.objectContaining({
      dataInicio: '2026-10-01',
      dataFim: '2026-10-31',
    })));
  });

  /**
   * @caso CT-INT-405
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF10.3, RNF06
   * @objetivo Informar quantas consultas o filtro encontrou
   * @resultadoEsperado O texto mostra "1 consulta(s) encontrada(s)."
   */
  test('shows the result count', async () => {
    montar();
    expect(await screen.findByText('1 consulta(s) encontrada(s).')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-406
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF10.3
   * @objetivo Oferecer limpeza dos filtros somente quando há filtro aplicado
   * @resultadoEsperado O botão Limpar aparece após filtrar
   */
  test('shows the clear button after filtering', async () => {
    const usuario = userEvent.setup();
    montar();
    expect(screen.queryByRole('button', { name: 'Limpar' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'AGENDADA' } });
    await usuario.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(screen.getByRole('button', { name: 'Limpar' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-407
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Voltar à listagem completa ao limpar os filtros
   * @resultadoEsperado Limpar reconsulta a API com filtros vazios
   */
  test('clears the filters', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(screen.getByRole('button', { name: 'Filtrar' }));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'FALTA' } });
    await usuario.click(screen.getByRole('button', { name: 'Filtrar' }));
    await usuario.click(screen.getByRole('button', { name: 'Limpar' }));
    await waitFor(() => expect(consultasApi.listar).toHaveBeenLastCalledWith(expect.objectContaining({ status: '' })));
  });

  /**
   * @caso CT-INT-408
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Permitir filtrar pelos cinco status da consulta
   * @resultadoEsperado O select tem Todos e os cinco status
   */
  test('lists every status in the filter', () => {
    montar();
    const select = screen.getByLabelText('Status');
    expect(within(select).getAllByRole('option')).toHaveLength(6);
  });
});

describe('ConsultasPage — tabela', () => {
  /**
   * @caso CT-INT-409
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Mostrar os dados completos da consulta na recepção
   * @resultadoEsperado A linha exibe paciente, médico, valor e status
   */
  test('shows patient, doctor, value and status', async () => {
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    expect(linha(1)).toHaveTextContent('Ana Pereira');
    expect(linha(1)).toHaveTextContent('Dr. Carlos Almeida');
    expect(linha(1)).toHaveTextContent('150,00');
    expect(within(linha(1)).getByText('Agendada')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-410
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Explicar a listagem vazia
   * @resultadoEsperado A mensagem padrão de vazio é exibida
   */
  test('shows the empty state', async () => {
    consultasApi.listar.mockResolvedValue([]);
    montar();
    expect(await screen.findByText('Nenhuma consulta encontrada.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-411
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Explicar falha de listagem sem esconder a página
   * @resultadoEsperado O erro da API aparece em um alerta
   */
  test('shows a listing error', async () => {
    consultasApi.listar.mockRejectedValue(new Error('Não foi possível conectar ao servidor.'));
    montar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor.');
  });
});

describe('ConsultasPage — ações', () => {
  /**
   * @caso CT-INT-412
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Confirmar presença de uma consulta agendada
   * @resultadoEsperado consultasApi.confirmar recebe o id da linha
   */
  test('confirms an appointment', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Confirmar' }));
    expect(consultasApi.confirmar).toHaveBeenCalledWith(1);
  });

  /**
   * @caso CT-INT-413
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar a ação com o nome do paciente
   * @resultadoEsperado O toast informa a presença de Ana Pereira confirmada
   */
  test('shows the reception confirmation toast', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Presença de Ana Pereira confirmada.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-414
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.5, RN29
   * @objetivo Registrar falta a pedido do médico ou da recepção
   * @resultadoEsperado consultasApi.falta recebe o id da consulta
   */
  test('registers a no-show', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Falta' }));
    expect(consultasApi.falta).toHaveBeenCalledWith(1);
  });

  /**
   * @caso CT-INT-415
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar o registro de falta com o nome do paciente
   * @resultadoEsperado O toast informa a falta de Ana Pereira
   */
  test('shows the no-show toast', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Falta' }));
    expect(await screen.findByText('Falta registrada para Ana Pereira.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-416
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Exigir motivo ao cancelar uma consulta na recepção
   * @resultadoEsperado O diálogo de cancelamento pede o motivo e o envia
   */
  test('cancels with a mandatory reason', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Cancelar' }));
    await usuario.type(screen.getByLabelText('Motivo do cancelamento'), 'Médico precisou sair');
    await usuario.click(screen.getByRole('button', { name: 'Cancelar consulta' }));
    await waitFor(() => expect(consultasApi.cancelar).toHaveBeenCalledWith(1, 'Médico precisou sair'));
  });

  /**
   * @caso CT-INT-417
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.3, RN27
   * @objetivo Remarcar em nome do paciente pela recepção
   * @resultadoEsperado O diálogo de remarcação é aberto para a consulta escolhida
   */
  test('opens the reschedule dialog', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    await usuario.click(within(linha(1)).getByRole('button', { name: 'Remarcar' }));
    expect(screen.getByRole('dialog', { name: 'Remarcar consulta' })).toBeInTheDocument();
    expect(screen.getByText(/horário atual: 20\/10\/2026 10:00/)).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-418
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Não oferecer confirmação para consulta já confirmada
   * @resultadoEsperado A linha CONFIRMADA não exibe o botão Confirmar
   */
  test('hides confirmation for an already confirmed appointment', async () => {
    consultasApi.listar.mockResolvedValue([consulta({ status: 'CONFIRMADA' })]);
    montar();
    await waitFor(() => expect(linha(1)).toBeInTheDocument());
    expect(within(linha(1)).queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
    expect(within(linha(1)).getByRole('button', { name: 'Falta' })).toBeInTheDocument();
  });
});
```
