// Integração do editor de grade semanal do médico (RF06, RN10–RN12, RNF06).
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/api', () => ({
  authApi: { login: vi.fn(), registrar: vi.fn(), me: vi.fn() },
  especialidadesApi: { listar: vi.fn(), criar: vi.fn() },
  medicosApi: { listar: vi.fn(), criar: vi.fn(), horarios: vi.fn(), grade: vi.fn(), salvarGrade: vi.fn(), bloqueios: vi.fn(), criarBloqueio: vi.fn(), removerBloqueio: vi.fn() },
  pacientesApi: { listar: vi.fn(), criar: vi.fn() },
  consultasApi: { listar: vi.fn(), agendar: vi.fn(), confirmar: vi.fn(), cancelar: vi.fn(), remarcar: vi.fn(), realizar: vi.fn(), falta: vi.fn() },
  adminApi: { definirAtivo: vi.fn(), resumo: vi.fn() },
}));

import { medicosApi } from '../../src/api';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { EditorGrade } from '../../src/components/EditorGrade';

const BLOCOS = [
  { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
  { diaSemana: 2, horaInicio: '14:00', horaFim: '18:00' },
];

function montar(props = {}) {
  return render(
    <ToastProvider>
      <EditorGrade medicoId={props.medicoId ?? 1} />
    </ToastProvider>,
  );
}

const linhas = () => document.querySelectorAll('#tabela-grade tbody tr');

beforeEach(() => {
  vi.clearAllMocks();
  medicosApi.grade.mockResolvedValue(BLOCOS.map((b) => ({ ...b })));
  medicosApi.salvarGrade.mockResolvedValue(BLOCOS.map((b) => ({ ...b })));
});

afterEach(cleanup);

describe('EditorGrade — carregamento', () => {
  /**
   * @caso CT-INT-451
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Nomear as colunas da grade semanal
   * @resultadoEsperado A tabela tem Dia, Início, Fim e a coluna de ações
   */
  test('renders the grade headers', () => {
    montar();
    const cabecalhos = [...document.querySelectorAll('#tabela-grade thead th')].map((th) => th.textContent);
    expect(cabecalhos).toEqual(['Dia', 'Início', 'Fim', 'Ações']);
  });

  /**
   * @caso CT-INT-452
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.1
   * @objetivo Exibir os blocos de atendimento cadastrados
   * @resultadoEsperado As duas faixas horárias aparecem na tabela
   */
  test('lists the configured blocks', async () => {
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    expect(screen.getByDisplayValue('08:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('14:00')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-453
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Explicar uma grade sem horários
   * @resultadoEsperado A mensagem "Nenhum horário de atendimento cadastrado." aparece
   */
  test('shows the empty grade state', async () => {
    medicosApi.grade.mockResolvedValue([]);
    montar();
    expect(await screen.findByText('Nenhum horário de atendimento cadastrado.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-454
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Explicar falha ao carregar a grade
   * @resultadoEsperado O erro da API aparece em um alerta
   */
  test('shows the load error', async () => {
    medicosApi.grade.mockRejectedValue(new Error('Não foi possível conectar ao servidor.'));
    montar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor.');
  });

  /**
   * @caso CT-INT-455
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.1
   * @objetivo Não montar o editor sem médico selecionado
   * @resultadoEsperado Com medicoId vazio nenhuma tabela é renderizada
   */
  test('renders nothing without a doctor', () => {
    render(
      <ToastProvider>
        <EditorGrade medicoId={null} />
      </ToastProvider>,
    );
    expect(document.getElementById('tabela-grade')).toBeNull();
    expect(medicosApi.grade).not.toHaveBeenCalled();
  });

  /**
   * @caso CT-INT-456
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.1
   * @objetivo Recarregar a grade quando o médico selecionado muda
   * @resultadoEsperado A API é consultada para cada médico escolhido
   */
  test('reloads when the doctor changes', async () => {
    const { rerender } = render(
      <ToastProvider>
        <EditorGrade medicoId={1} />
      </ToastProvider>,
    );
    await waitFor(() => expect(medicosApi.grade).toHaveBeenCalledWith(1));
    rerender(
      <ToastProvider>
        <EditorGrade medicoId={2} />
      </ToastProvider>,
    );
    await waitFor(() => expect(medicosApi.grade).toHaveBeenCalledWith(2));
  });
});

describe('EditorGrade — edição', () => {
  /**
   * @caso CT-INT-457
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF05.1
   * @objetivo Adicionar uma faixa de atendimento com valores padrão
   * @resultadoEsperado Uma terceira linha é criada com 08:00 e 12:00
   */
  test('adds a block', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    await usuario.click(screen.getByRole('button', { name: /Adicionar bloco/ }));
    expect(linhas()).toHaveLength(3);
  });

  /**
   * @caso CT-INT-458
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF05.1
   * @objetivo Remover uma faixa da grade
   * @resultadoEsperado A tabela volta a ter uma linha
   */
  test('removes a block', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    await usuario.click(within(linhas()[0]).getByRole('button', { name: 'Remover bloco' }));
    expect(linhas()).toHaveLength(1);
  });

  /**
   * @caso CT-INT-459
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Permitir editar o dia da semana por um seletor rotulado
   * @resultadoEsperado O seletor de dia tem exatamente sete opções
   */
  test('offers the seven weekdays', async () => {
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    const select = within(linhas()[0]).getByLabelText('Dia da semana');
    expect(within(select).getAllByRole('option')).toHaveLength(7);
  });

  /**
   * @caso CT-INT-460
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RN10, RNF06
   * @objetivo Restringir o horário a múltiplos de 15 minutos
   * @resultadoEsperado Os campos de horário usam step de 900 segundos
   */
  test('uses 15-minute steps for the time inputs', async () => {
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    const inicio = within(linhas()[0]).getByLabelText('Início');
    expect(inicio).toHaveAttribute('type', 'time');
    expect(inicio).toHaveAttribute('step', '900');
  });

  /**
   * @caso CT-INT-461
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF05.2
   * @objetivo Só persistir a grade quando o médico salvar
   * @resultadoEsperado Editar um horário não chama a API antes do salvar
   */
  test('does not save while editing', async () => {
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    fireEvent.change(within(linhas()[0]).getByLabelText('Fim'), { target: { value: '11:00' } });
    expect(medicosApi.salvarGrade).not.toHaveBeenCalled();
  });

  /**
   * @caso CT-INT-462
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF05.1
   * @objetivo Permitir alterar o dia de um bloco
   * @resultadoEsperado O novo dia aparece e é enviado no salvar
   */
  test('persists an edited weekday', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    await usuario.selectOptions(within(linhas()[0]).getByLabelText('Dia da semana'), '3');
    await usuario.click(screen.getByRole('button', { name: 'Salvar grade' }));
    await waitFor(() => expect(medicosApi.salvarGrade).toHaveBeenCalledWith(1, expect.arrayContaining([
      expect.objectContaining({ diaSemana: 3 }),
    ])));
  });
});

describe('EditorGrade — salvamento', () => {
  /**
   * @caso CT-INT-463
   * @nivel integracao
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF05.1, RNF08
   * @objetivo Enviar o dia da semana como número, como espera a API
   * @resultadoEsperado salvarGrade recebe blocos com diaSemana numérico
   */
  test('sends numeric weekdays', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    await usuario.click(screen.getByRole('button', { name: 'Salvar grade' }));
    await waitFor(() => expect(medicosApi.salvarGrade).toHaveBeenCalledWith(1, [
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 2, horaInicio: '14:00', horaFim: '18:00' },
    ]));
  });

  /**
   * @caso CT-INT-464
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar quantos blocos foram salvos
   * @resultadoEsperado Um toast informa "Grade salva com 2 bloco(s)"
   */
  test('shows the save confirmation', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    await usuario.click(screen.getByRole('button', { name: 'Salvar grade' }));
    expect(await screen.findByText('Grade salva com 2 bloco(s) de atendimento.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-465
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Explicar a recusa de uma grade inválida
   * @resultadoEsperado O erro da API aparece em um alerta
   */
  test('shows the save error', async () => {
    const usuario = userEvent.setup();
    medicosApi.salvarGrade.mockRejectedValue(new Error('Blocos da mesma semana não podem se sobrepor.'));
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    await usuario.click(screen.getByRole('button', { name: 'Salvar grade' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Blocos da mesma semana não podem se sobrepor.');
  });

  /**
   * @caso CT-INT-466
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.2
   * @objetivo Permitir limpar toda a grade do médico
   * @resultadoEsperado Remover todos os blocos e salvar envia um array vazio
   */
  test('saves an empty grade', async () => {
    const usuario = userEvent.setup();
    medicosApi.salvarGrade.mockResolvedValue([]);
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    await usuario.click(within(linhas()[0]).getByRole('button', { name: 'Remover bloco' }));
    await usuario.click(within(linhas()[0]).getByRole('button', { name: 'Remover bloco' }));
    await usuario.click(screen.getByRole('button', { name: 'Salvar grade' }));
    await waitFor(() => expect(medicosApi.salvarGrade).toHaveBeenCalledWith(1, []));
    expect(await screen.findByText('Grade salva com 0 bloco(s) de atendimento.')).toBeInTheDocument();
  });
});
