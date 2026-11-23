import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { consultasApi, medicosApi, pacientesApi } from '../../src/api';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { ConsultasPage } from '../../src/pages/recepcao/ConsultasPage';

vi.mock('../../src/api', () => ({
  consultasApi: { listar: vi.fn(), confirmar: vi.fn(), cancelar: vi.fn(), falta: vi.fn(), remarcar: vi.fn() },
  medicosApi: { listar: vi.fn(), horarios: vi.fn() },
  pacientesApi: { listar: vi.fn(), criar: vi.fn() },
}));

const CONSULTAS = [
  {
    id: 1,
    inicio: '2026-10-20 14:00',
    pacienteNome: 'Ana Pereira',
    medicoNome: 'Dr. Carlos Almeida',
    especialidadeNome: 'Clínica Geral',
    valorCentavos: 15000,
    status: 'AGENDADA',
  },
  {
    id: 2,
    inicio: '2026-10-27 09:00',
    pacienteNome: 'João Santos',
    medicoNome: 'Dra. Beatriz Souza',
    especialidadeNome: 'Cardiologia',
    valorCentavos: 27000,
    status: 'AGENDADA',
  },
];

function montar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ConsultasPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

async function montarComLista() {
  const utils = montar();
  await screen.findByText('2 consulta(s) encontrada(s).');
  return utils;
}

function aplicarFiltros() {
  fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
}

describe('pages/recepcao/ConsultasPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    medicosApi.listar.mockResolvedValue([{ id: 1, nome: 'Dr. Carlos Almeida' }]);
    pacientesApi.listar.mockResolvedValue([
      { id: 1, nome: 'Ana Pereira', usuarioId: 10, ativo: true },
      { id: 2, nome: 'João Santos', usuarioId: 11, ativo: true },
    ]);
    consultasApi.listar.mockResolvedValue(CONSULTAS);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  /**
   * @caso CT-INT-218
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Listar todas as consultas da clínica com paciente, médico e contagem
   * @resultadoEsperado A tabela tem as colunas Paciente e Médico e a contagem de resultados
   */
  test('ConsultasPage lista todas as consultas com paciente e médico', async () => {
    const { container } = await montarComLista();

    const cabecalho = within(container.querySelector('thead'));
    expect(cabecalho.getByText('Paciente')).toBeInTheDocument();
    expect(cabecalho.getByText('Médico')).toBeInTheDocument();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  /**
   * @caso CT-INT-219
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Refazer a listagem com os filtros aplicados pela recepção
   * @resultadoEsperado Filtrar chama a API de novo com dataInicio e status escolhidos
   */
  test('ConsultasPage refaz a listagem com os filtros aplicados', async () => {
    await montarComLista();

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'AGENDADA' } });
    aplicarFiltros();

    await waitFor(() => expect(consultasApi.listar).toHaveBeenCalledTimes(2));
    expect(consultasApi.listar).toHaveBeenLastCalledWith({
      dataInicio: '2026-10-01',
      dataFim: '',
      status: 'AGENDADA',
      medicoId: '',
      pacienteId: '',
    });
  });

  /**
   * @caso CT-INT-220
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF06
   * @objetivo Oferecer limpar os filtros somente quando há filtro aplicado
   * @resultadoEsperado O botão Limpar aparece após filtrar e, ao ser clicado, zera os parâmetros
   */
  test('ConsultasPage só mostra Limpar com filtro ativo e zera os parâmetros', async () => {
    await montarComLista();

    expect(screen.queryByRole('button', { name: 'Limpar' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'AGENDADA' } });
    aplicarFiltros();
    await waitFor(() => expect(consultasApi.listar).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    await waitFor(() => expect(consultasApi.listar).toHaveBeenCalledTimes(3));
    expect(consultasApi.listar).toHaveBeenLastCalledWith({
      dataInicio: '',
      dataFim: '',
      status: '',
      medicoId: '',
      pacienteId: '',
    });
  });

  /**
   * @caso CT-INT-221
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.5, RN29
   * @objetivo Registrar a falta do paciente pela recepção a partir da linha da consulta
   * @resultadoEsperado O botão Falta chama a API com o id e exibe o aviso com o nome do paciente
   */
  test('ConsultasPage registra falta do paciente pela linha da consulta', async () => {
    consultasApi.falta.mockResolvedValue({ id: 1, status: 'FALTA' });
    const { container } = await montarComLista();

    fireEvent.click(container.querySelector('tr[data-consulta-id="1"] [data-acao="falta"]'));

    await waitFor(() => expect(consultasApi.falta).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Falta registrada para Ana Pereira.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-222
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Exigir motivo ao cancelar pela recepção e enviá-lo à API
   * @resultadoEsperado O diálogo pede o motivo e cancelar é chamado com id e texto digitado
   */
  test('ConsultasPage cancela com motivo informado pela recepção', async () => {
    consultasApi.cancelar.mockResolvedValue({ id: 2, status: 'CANCELADA' });
    const { container } = await montarComLista();

    fireEvent.click(container.querySelector('tr[data-consulta-id="2"] [data-acao="cancelar"]'));
    await screen.findByRole('dialog', { name: 'Cancelar consulta' });
    fireEvent.change(screen.getByLabelText('Motivo do cancelamento'), { target: { value: 'Paciente desistiu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar consulta' }));

    await waitFor(() => expect(consultasApi.cancelar).toHaveBeenCalledWith(2, 'Paciente desistiu'));
    expect(await screen.findByText('Consulta cancelada.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-223
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Mostrar a falha da listagem como alerta em português na página
   * @resultadoEsperado Erro da API vira alerta com o id da mensagem da página
   */
  test('ConsultasPage exibe o erro da listagem como alerta', async () => {
    consultasApi.listar.mockRejectedValue(new Error('Status inválido.'));

    montar();

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveAttribute('id', 'consultas-mensagem');
    expect(aviso).toHaveTextContent('Status inválido.');
  });
});
