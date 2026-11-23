// Integração do relatório gerencial: período, totais, faturamento e faltas por médico (RF11, RNF06).
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

import { adminApi } from '../../src/api';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { RelatorioPage } from '../../src/pages/recepcao/RelatorioPage';

const RESUMO = {
  porStatus: { AGENDADA: 2, CONFIRMADA: 1, REALIZADA: 4, FALTA: 1, CANCELADA: 2 },
  faturamentoCentavos: 60000,
  faltasPorMedico: [
    { medicoId: 1, medicoNome: 'Dr. Carlos Almeida', faltas: 1, encerradas: 6, taxaFaltas: 16.67 },
    { medicoId: 2, medicoNome: 'Dra. Beatriz Souza', faltas: 0, encerradas: 2, taxaFaltas: 0 },
  ],
};

function montar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <RelatorioPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

async function gerar(usuario, inicio = '2026-10-01', fim = '2026-10-31') {
  fireEvent.change(screen.getByLabelText('De'), { target: { value: inicio } });
  fireEvent.change(screen.getByLabelText('Até'), { target: { value: fim } });
  await usuario.click(screen.getByRole('button', { name: 'Gerar relatório' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  adminApi.resumo.mockResolvedValue(JSON.parse(JSON.stringify(RESUMO)));
});

afterEach(cleanup);

describe('RelatorioPage — formulário', () => {
  /**
   * @caso CT-INT-533
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF11.1
   * @objetivo Oferecer o período e a ação de gerar o relatório
   * @resultadoEsperado Os campos De e Até e o botão estão presentes
   */
  test('renders the period form', () => {
    montar();
    expect(screen.getByLabelText('De')).toBeInTheDocument();
    expect(screen.getByLabelText('Até')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar relatório' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-534
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Usar seletores de data nativos no período
   * @resultadoEsperado De e Até são inputs do tipo date
   */
  test('uses date inputs', () => {
    montar();
    expect(screen.getByLabelText('De')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Até')).toHaveAttribute('type', 'date');
  });

  /**
   * @caso CT-INT-535
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Orientar o usuário antes de escolher o período
   * @resultadoEsperado A mensagem "Escolha um período para ver os indicadores." aparece
   */
  test('shows the initial guidance', () => {
    montar();
    expect(screen.getByText('Escolha um período para ver os indicadores.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-536
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Consultar o resumo com o período escolhido
   * @resultadoEsperado adminApi.resumo recebe as duas datas
   */
  test('requests the summary for the chosen period', async () => {
    const usuario = userEvent.setup();
    montar();
    await gerar(usuario);
    await waitFor(() => expect(adminApi.resumo).toHaveBeenCalledWith('2026-10-01', '2026-10-31'));
  });

  /**
   * @caso CT-INT-537
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Indicar progresso enquanto o relatório é calculado
   * @resultadoEsperado O botão mostra "Gerando..." e fica desabilitado
   */
  test('shows progress while generating', async () => {
    const usuario = userEvent.setup();
    adminApi.resumo.mockReturnValue(new Promise(() => {}));
    montar();
    await gerar(usuario);
    expect(await screen.findByRole('button', { name: 'Gerando...' })).toBeDisabled();
  });
});

describe('RelatorioPage — indicadores', () => {
  /**
   * @caso CT-INT-538
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Somar todas as consultas do período
   * @resultadoEsperado O destaque Total mostra 10
   */
  test('shows the total of appointments', async () => {
    const usuario = userEvent.setup();
    montar();
    await gerar(usuario);
    const total = await screen.findByText('Total');
    expect(total.closest('.indicador')).toHaveTextContent('10');
  });

  /**
   * @caso CT-INT-539
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF11.1
   * @objetivo Detalhar a quantidade por status
   * @resultadoEsperado Um indicador por status é exibido
   */
  test('shows one indicator per status', async () => {
    const usuario = userEvent.setup();
    montar();
    await gerar(usuario);
    const indicadores = await waitFor(() => {
      const lista = document.querySelectorAll('#relatorio-status .indicador');
      expect(lista).toHaveLength(6);
      return lista;
    });
    const rotulos = [...indicadores].map((i) => i.textContent);
    expect(rotulos.some((t) => t.includes('Realizada'))).toBe(true);
  });

  /**
   * @caso CT-INT-540
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1, RN22
   * @objetivo Exibir o faturamento das consultas realizadas
   * @resultadoEsperado O valor formatado é "R$ 600,00"
   */
  test('shows the revenue', async () => {
    const usuario = userEvent.setup();
    montar();
    await gerar(usuario);
    const faturamento = await screen.findByText(/R\$/, { selector: '#relatorio-faturamento' });
    expect(faturamento.textContent.replace(/\u00a0/g, ' ')).toBe('R$ 600,00');
  });
});

describe('RelatorioPage — faltas por médico', () => {
  /**
   * @caso CT-INT-541
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF11.1
   * @objetivo Listar faltas, consultas encerradas e taxa por médico
   * @resultadoEsperado A linha do Dr. Carlos mostra 1 falta e 16.67%
   */
  test('shows no-shows per doctor', async () => {
    const usuario = userEvent.setup();
    montar();
    await gerar(usuario);
    await waitFor(() => expect(document.querySelectorAll('#relatorio-faltas tbody tr')).toHaveLength(2));
    const linha = document.querySelectorAll('#relatorio-faltas tbody tr')[0];
    expect(linha).toHaveTextContent('Dr. Carlos Almeida');
    expect(linha).toHaveTextContent('16.67%');
  });

  /**
   * @caso CT-INT-542
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Explicar um período sem consultas encerradas
   * @resultadoEsperado A mensagem "Sem consultas no período." aparece
   */
  test('shows the empty no-show state', async () => {
    const usuario = userEvent.setup();
    adminApi.resumo.mockResolvedValue({ porStatus: {}, faturamentoCentavos: 0, faltasPorMedico: [] });
    montar();
    await gerar(usuario);
    expect(await screen.findByText('Sem consultas no período.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-543
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo estetica
   * @requisito RNF06
   * @objetivo Limitar a barra visual a 100% mesmo com taxa inconsistente
   * @resultadoEsperado A barra de uma taxa de 150% fica com largura 100%
   */
  test('caps the no-show bar at 100%', async () => {
    const usuario = userEvent.setup();
    adminApi.resumo.mockResolvedValue({
      porStatus: { AGENDADA: 1 },
      faturamentoCentavos: 0,
      faltasPorMedico: [{ medicoId: 1, medicoNome: 'Dr. Carlos Almeida', faltas: 3, encerradas: 2, taxaFaltas: 150 }],
    });
    montar();
    await gerar(usuario);
    await waitFor(() => expect(document.querySelector('.barra-taxa span')).toBeInTheDocument());
    expect(document.querySelector('.barra-taxa span')).toHaveStyle('width: 100%');
  });
});

describe('RelatorioPage — erros', () => {
  /**
   * @caso CT-INT-544
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Explicar a falha ao gerar o relatório
   * @resultadoEsperado O erro da API aparece em um alerta
   */
  test('shows the report error', async () => {
    const usuario = userEvent.setup();
    adminApi.resumo.mockRejectedValue(new Error('Período inválido.'));
    montar();
    await gerar(usuario, '2026-10-31', '2026-10-01');
    expect(await screen.findByRole('alert')).toHaveTextContent('Período inválido.');
  });

  /**
   * @caso CT-INT-545
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo capacidade-de-recuperacao
   * @requisito RNF04
   * @objetivo Recuperar o relatório após corrigir o período
   * @resultadoEsperado Após um erro, uma nova tentativa exibe os indicadores e limpa o alerta
   */
  test('recovers after an error', async () => {
    const usuario = userEvent.setup();
    adminApi.resumo
      .mockRejectedValueOnce(new Error('Período inválido.'))
      .mockResolvedValueOnce(JSON.parse(JSON.stringify(RESUMO)));
    montar();
    await gerar(usuario, '2026-10-31', '2026-10-01');
    await screen.findByRole('alert');
    await gerar(usuario);
    expect(await screen.findByText('Total')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(within(document.getElementById('relatorio-status')).getByText('10')).toBeInTheDocument();
  });
});
