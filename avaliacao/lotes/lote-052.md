# lote-052

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 16 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0858 | CT-INT-467 | renders the block form | passou |  |
| deepseek-0859 | CT-INT-468 | uses date inputs for the period | passou |  |
| deepseek-0860 | CT-INT-469 | suggests a reason placeholder | passou |  |
| deepseek-0861 | CT-INT-470 | lists the registered blocks | passou |  |
| deepseek-0862 | CT-INT-471 | uses a dash for a block without reason | passou |  |
| deepseek-0863 | CT-INT-472 | shows the empty state | passou |  |
| deepseek-0864 | CT-INT-473 | shows skeleton rows while loading | passou |  |
| deepseek-0865 | CT-INT-474 | creates a block with the typed data | passou |  |
| deepseek-0866 | CT-INT-475 | shows the creation toast | passou |  |
| deepseek-0867 | CT-INT-476 | reloads the list after creating | passou |  |
| deepseek-0868 | CT-INT-477 | shows the creation error | passou |  |
| deepseek-0869 | CT-INT-478 | shows progress while creating | passou |  |
| deepseek-0870 | CT-INT-479 | removes the chosen block | passou |  |
| deepseek-0871 | CT-INT-480 | shows the removal toast | passou |  |
| deepseek-0872 | CT-INT-481 | shows the removal error | passou |  |
| deepseek-0873 | CT-INT-482 | renders nothing without a doctor | passou |  |

## Arquivo: frontend/__testes__/integracao/editor-bloqueios.test.jsx

```js
// Integração do editor de bloqueios da agenda médica (RF07, RN13, RNF06).
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
import { EditorBloqueios } from '../../src/components/EditorBloqueios';

const BLOQUEIOS = [
  { id: 7, dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Congresso' },
  { id: 8, dataInicio: '2026-12-24', dataFim: '2026-12-31', motivo: '' },
];

function montar(medicoId = 1) {
  return render(
    <ToastProvider>
      <EditorBloqueios medicoId={medicoId} />
    </ToastProvider>,
  );
}

const linhas = () => document.querySelectorAll('#tabela-bloqueios tbody tr[data-bloqueio-id]');

beforeEach(() => {
  vi.clearAllMocks();
  medicosApi.bloqueios.mockResolvedValue(BLOQUEIOS.map((b) => ({ ...b })));
  medicosApi.criarBloqueio.mockResolvedValue({ id: 9, dataInicio: '2026-11-10', dataFim: '2026-11-12', motivo: 'Férias' });
  medicosApi.removerBloqueio.mockResolvedValue(null);
});

afterEach(cleanup);

describe('EditorBloqueios — estrutura', () => {
  /**
   * @caso CT-INT-467
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.1
   * @objetivo Coletar período e motivo do bloqueio
   * @resultadoEsperado Os campos De, Até e Motivo estão presentes
   */
  test('renders the block form', () => {
    montar();
    expect(screen.getByLabelText('De')).toBeInTheDocument();
    expect(screen.getByLabelText('Até')).toBeInTheDocument();
    expect(screen.getByLabelText('Motivo')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-468
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RF06.1, RNF06
   * @objetivo Usar seletores de data nativos no período do bloqueio
   * @resultadoEsperado De e Até são inputs do tipo date
   */
  test('uses date inputs for the period', () => {
    montar();
    expect(screen.getByLabelText('De')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Até')).toHaveAttribute('type', 'date');
  });

  /**
   * @caso CT-INT-469
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Sugerir exemplos de motivo
   * @resultadoEsperado O campo de motivo tem placeholder de férias e congresso
   */
  test('suggests a reason placeholder', () => {
    montar();
    expect(screen.getByLabelText('Motivo')).toHaveAttribute('placeholder', 'Férias, congresso...');
  });

  /**
   * @caso CT-INT-470
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.1
   * @objetivo Listar os bloqueios já cadastrados
   * @resultadoEsperado As duas linhas aparecem com data e motivo
   */
  test('lists the registered blocks', async () => {
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    expect(linhas()[0]).toHaveTextContent('02/11/2026');
    expect(linhas()[0]).toHaveTextContent('Congresso');
  });

  /**
   * @caso CT-INT-471
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Não deixar a célula de motivo vazia
   * @resultadoEsperado Bloqueio sem motivo mostra "—"
   */
  test('uses a dash for a block without reason', async () => {
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    expect(within(linhas()[1]).getByText('—')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-472
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Explicar que não há bloqueios cadastrados
   * @resultadoEsperado A mensagem "Nenhum bloqueio cadastrado." aparece
   */
  test('shows the empty state', async () => {
    medicosApi.bloqueios.mockResolvedValue([]);
    montar();
    expect(await screen.findByText('Nenhum bloqueio cadastrado.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-473
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Mostrar esqueleto enquanto os bloqueios carregam
   * @resultadoEsperado Duas linhas decorativas são exibidas
   */
  test('shows skeleton rows while loading', () => {
    medicosApi.bloqueios.mockReturnValue(new Promise(() => {}));
    montar();
    expect(document.querySelectorAll('#tabela-bloqueios tbody tr[aria-hidden="true"]')).toHaveLength(2);
  });
});

describe('EditorBloqueios — criação', () => {
  /**
   * @caso CT-INT-474
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.1, RN12
   * @objetivo Enviar o período e o motivo digitados
   * @resultadoEsperado criarBloqueio recebe médico e os três campos
   */
  test('creates a block with the typed data', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-11-10' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-11-12' } });
    await usuario.type(screen.getByLabelText('Motivo'), 'Férias');
    await usuario.click(screen.getByRole('button', { name: 'Bloquear período' }));
    await waitFor(() => expect(medicosApi.criarBloqueio).toHaveBeenCalledWith(1, {
      dataInicio: '2026-11-10',
      dataFim: '2026-11-12',
      motivo: 'Férias',
    }));
  });

  /**
   * @caso CT-INT-475
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar o período bloqueado
   * @resultadoEsperado O toast informa o intervalo em datas brasileiras
   */
  test('shows the creation toast', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-11-10' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-11-12' } });
    await usuario.click(screen.getByRole('button', { name: 'Bloquear período' }));
    expect(await screen.findByText('Agenda bloqueada de 10/11/2026 a 12/11/2026.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-476
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RF06.1
   * @objetivo Atualizar a lista após criar um bloqueio
   * @resultadoEsperado bloqueios é consultado novamente
   */
  test('reloads the list after creating', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-11-10' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-11-12' } });
    await usuario.click(screen.getByRole('button', { name: 'Bloquear período' }));
    await waitFor(() => expect(medicosApi.bloqueios).toHaveBeenCalledTimes(2));
  });

  /**
   * @caso CT-INT-477
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04, RN13
   * @objetivo Explicar a recusa de bloqueio sobre consultas existentes
   * @resultadoEsperado O erro da API aparece em um alerta
   */
  test('shows the creation error', async () => {
    const usuario = userEvent.setup();
    medicosApi.criarBloqueio.mockRejectedValue(new Error('O período possui consultas agendadas.'));
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-11-02' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-11-06' } });
    await usuario.click(screen.getByRole('button', { name: 'Bloquear período' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('O período possui consultas agendadas.');
  });

  /**
   * @caso CT-INT-478
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Indicar progresso durante a criação
   * @resultadoEsperado O botão mostra "Bloqueando..." e fica desabilitado
   */
  test('shows progress while creating', async () => {
    const usuario = userEvent.setup();
    medicosApi.criarBloqueio.mockReturnValue(new Promise(() => {}));
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-11-10' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-11-12' } });
    await usuario.click(screen.getByRole('button', { name: 'Bloquear período' }));
    expect(await screen.findByRole('button', { name: 'Bloqueando...' })).toBeDisabled();
  });
});

describe('EditorBloqueios — remoção', () => {
  /**
   * @caso CT-INT-479
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.2
   * @objetivo Remover o bloqueio escolhido pelo identificador
   * @resultadoEsperado removerBloqueio recebe médico e id do bloqueio
   */
  test('removes the chosen block', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    await usuario.click(within(linhas()[0]).getByRole('button', { name: /Remover/ }));
    expect(medicosApi.removerBloqueio).toHaveBeenCalledWith(1, 7);
  });

  /**
   * @caso CT-INT-480
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar que os horários voltaram a ficar disponíveis
   * @resultadoEsperado Um toast informa a remoção do bloqueio
   */
  test('shows the removal toast', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    await usuario.click(within(linhas()[0]).getByRole('button', { name: /Remover/ }));
    expect(await screen.findByText('Bloqueio removido. Os horários voltaram a ficar disponíveis.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-481
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Explicar a falha ao remover um bloqueio
   * @resultadoEsperado O erro da API aparece em um alerta
   */
  test('shows the removal error', async () => {
    const usuario = userEvent.setup();
    medicosApi.removerBloqueio.mockRejectedValue(new Error('Não foi possível conectar ao servidor.'));
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    await usuario.click(within(linhas()[0]).getByRole('button', { name: /Remover/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor.');
  });

  /**
   * @caso CT-INT-482
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.1
   * @objetivo Não montar o editor sem médico selecionado
   * @resultadoEsperado Sem medicoId não há formulário de bloqueio
   */
  test('renders nothing without a doctor', () => {
    montar(null);
    expect(document.getElementById('form-bloqueio')).toBeNull();
    expect(medicosApi.bloqueios).not.toHaveBeenCalled();
  });
});
```
