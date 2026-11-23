# lote-117

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 8 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0329 | CT-INT-122 | lista ordenada do mais recente com contagem de ativas | passou |  |
| glm-0330 | CT-INT-129 | sem consultas mostra texto vazio | passou |  |
| glm-0331 | CT-INT-128 | atalho para nova consulta aponta para o agendamento | passou |  |
| glm-0332 | CT-INT-123 | confirma presença com toast e recarga | passou |  |
| glm-0333 | CT-INT-124 | cancela somente após confirmação no modal | passou |  |
| glm-0334 | CT-INT-125 | desistir do cancelamento não chama a API | passou |  |
| glm-0335 | CT-INT-126 | falha na confirmação mostra alerta inline | passou |  |
| glm-0336 | CT-INT-127 | remarca consulta pelo diálogo completo | falhou | Error: Unable to find role="button" and name "08:00" Ignored nodes: comments, script, style [36m<body>[39m [36m<div>[39m [36m<div[39m [33mclass[39m=[32 |

## Arquivo: frontend/__testes__/integracao/MinhasConsultasPage.test.jsx

```js
// @vitest-environment jsdom
// Testes de integração da página MinhasConsultasPage (RF09, RF10.1, usabilidade).
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { MinhasConsultasPage } from '../../src/pages/paciente/MinhasConsultasPage';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { consultasApi, medicosApi } from '../../src/api';

vi.mock('../../src/api', () => ({
  consultasApi: { listar: vi.fn(), confirmar: vi.fn(), cancelar: vi.fn(), remarcar: vi.fn() },
  medicosApi: { horarios: vi.fn() },
}));

const agendada = {
  id: 1, inicio: '2026-10-25 08:00', medicoNome: 'Dr. Carlos Almeida', especialidadeNome: 'Clínica Geral',
  status: 'AGENDADA', valorCentavos: 15000,
};
const confirmada = {
  id: 2, inicio: '2026-10-21 10:30', medicoNome: 'Dra. Beatriz Souza', especialidadeNome: 'Cardiologia',
  status: 'CONFIRMADA', valorCentavos: 27000,
};
const cancelada = {
  id: 3, inicio: '2026-10-10 08:00', medicoNome: 'Dr. Eduardo Lima', especialidadeNome: 'Dermatologia',
  status: 'CANCELADA', valorCentavos: 0,
};

function montar() {
  return render(
    <MemoryRouter initialEntries={['/paciente/consultas']}>
      <ToastProvider>
        <MinhasConsultasPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  consultasApi.listar.mockResolvedValue([agendada, confirmada, cancelada]);
});

afterEach(() => cleanup());

describe('MinhasConsultasPage — listagem (RF10.1)', () => {
  /**
   * @caso CT-INT-122
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.1
   * @objetivo Carregar o histórico ordenado do mais recente e resumir as consultas ativas
   * @resultadoEsperado tabela mostra '2 consulta(s) ativa(s) de 3 no total.' com a mais recente primeiro
   */
  test('lista ordenada do mais recente com contagem de ativas', async () => {
    montar();
    await screen.findByText('Histórico de consultas');
    await waitFor(() => expect(screen.getByText('2 consulta(s) ativa(s) de 3 no total.')).toBeInTheDocument());
    const linhas = screen.getAllByText(/20\d{2}|20\/10\/2026/);
    const tabela = document.getElementById('tabela-consultas');
    const ids = [...tabela.querySelectorAll('tr[data-consulta-id]')].map((tr) => tr.dataset.consultaId);
    expect(ids).toEqual(['1', '2', '3']);
    expect(linhas.length).toBeGreaterThan(0);
  });

  /**
   * @caso CT-INT-129
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF10.1, RNF06
   * @objetivo Orientar quem ainda não tem consultas
   * @resultadoEsperado lista vazia exibe o convite para agendar a primeira consulta
   */
  test('sem consultas mostra texto vazio', async () => {
    consultasApi.listar.mockResolvedValue([]);
    montar();
    expect(await screen.findByText('Você ainda não tem consultas. Que tal agendar a primeira?')).toBeInTheDocument();
    expect(screen.getByText('0 consulta(s) ativa(s) de 0 no total.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-128
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF10.1
   * @objetivo Oferecer atalho para o agendamento de nova consulta
   * @resultadoEsperado o link 'Nova consulta' aponta para /paciente/agendar
   */
  test('atalho para nova consulta aponta para o agendamento', async () => {
    montar();
    const link = await screen.findByRole('link', { name: /Nova consulta/ });
    expect(link).toHaveAttribute('href', '/paciente/agendar');
  });
});

describe('MinhasConsultasPage — confirmação e cancelamento (RF09, RN25, RN26)', () => {
  /**
   * @caso CT-INT-123
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Confirmar presença pela listagem com recarga automática
   * @resultadoEsperado confirmar é chamado na consulta certa, toast de sucesso aparece e a lista é recarregada
   */
  test('confirma presença com toast e recarga', async () => {
    consultasApi.confirmar.mockResolvedValue({ ...agendada, status: 'CONFIRMADA' });
    montar();
    const linha = (await screen.findByText('Dr. Carlos Almeida')).closest('tr');
    await userEvent.click(within(linha).getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(consultasApi.confirmar).toHaveBeenCalledWith(1));
    expect(screen.getByText('Presença confirmada para 25/10/2026 08:00.')).toBeInTheDocument();
    await waitFor(() => expect(consultasApi.listar).toHaveBeenCalledTimes(2));
  });

  /**
   * @caso CT-INT-124
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF09.2, RN26
   * @objetivo Exigir confirmação antes de cancelar e enviar o motivo do paciente
   * @resultadoEsperado modal de confirmação e, após 'Sim, cancelar', cancelar(id, 'Cancelado pelo paciente') com toast
   */
  test('cancela somente após confirmação no modal', async () => {
    consultasApi.cancelar.mockResolvedValue({ ...confirmada, status: 'CANCELADA' });
    montar();
    const linha = (await screen.findByText('Dra. Beatriz Souza')).closest('tr');
    await userEvent.click(within(linha).getByRole('button', { name: 'Cancelar' }));
    const modal = await screen.findByRole('dialog');
    expect(modal).toHaveTextContent('Cancelar consulta?');
    await userEvent.click(within(modal).getByRole('button', { name: 'Sim, cancelar' }));
    await waitFor(() => expect(consultasApi.cancelar).toHaveBeenCalledWith(2, 'Cancelado pelo paciente'));
    expect(screen.getByText('Sua consulta foi cancelada.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-125
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF09.2, RN26
   * @objetivo Permitir desistir do cancelamento no modal
   * @resultadoEsperado 'Manter consulta' fecha o modal sem chamar a API
   */
  test('desistir do cancelamento não chama a API', async () => {
    montar();
    const linha = (await screen.findByText('Dra. Beatriz Souza')).closest('tr');
    await userEvent.click(within(linha).getByRole('button', { name: 'Cancelar' }));
    const modal = await screen.findByRole('dialog');
    await userEvent.click(within(modal).getByRole('button', { name: 'Manter consulta' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(consultasApi.cancelar).not.toHaveBeenCalled();
  });

  /**
   * @caso CT-INT-126
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF09.1, RNF04
   * @objetivo Mostrar o erro da API junto à lista quando a confirmação falha
   * @resultadoEsperado mensagem inline com role="alert" reproduz a mensagem do servidor
   */
  test('falha na confirmação mostra alerta inline', async () => {
    consultasApi.confirmar.mockRejectedValue(new Error('A confirmação só é permitida nas 48 horas anteriores à consulta.'));
    montar();
    const linha = (await screen.findByText('Dr. Carlos Almeida')).closest('tr');
    await userEvent.click(within(linha).getByRole('button', { name: 'Confirmar' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('A confirmação só é permitida nas 48 horas anteriores à consulta.');
  });

  /**
   * @caso CT-INT-127
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.3, RN27
   * @objetivo Remarcar pelo diálogo escolhendo data e horário livre
   * @resultadoEsperado remarcar(id, '2026-10-27 08:00') é chamado e o toast 'Consulta remarcada' aparece
   */
  test('remarca consulta pelo diálogo completo', async () => {
    medicosApi.horarios.mockResolvedValue({ horarios: ['2026-10-27 08:00', '2026-10-27 08:30'] });
    consultasApi.remarcar.mockResolvedValue({ ...agendada, inicio: '2026-10-27 08:00' });
    montar();
    const linha = (await screen.findByText('Dr. Carlos Almeida')).closest('tr');
    await userEvent.click(within(linha).getByRole('button', { name: 'Remarcar' }));
    const modal = await screen.findByRole('dialog');
    expect(modal).toHaveTextContent('Remarcar consulta');
    fireEvent.change(within(modal).getByLabelText('Nova data'), { target: { value: '2026-10-27' } });
    const slot = await screen.findByRole('button', { name: '08:00' });
    await userEvent.click(slot);
    await userEvent.click(within(modal).getByRole('button', { name: 'Confirmar nova data' }));
    await waitFor(() => expect(consultasApi.remarcar).toHaveBeenCalledWith(1, '2026-10-27 08:00'));
    expect(screen.getByText('Consulta remarcada')).toBeInTheDocument();
  });
});
```
