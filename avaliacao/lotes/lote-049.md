# lote-049

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 14 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0796 | CT-INT-437 | renders the three selection fields | passou |  |
| deepseek-0797 | CT-INT-438 | lists patients with CPF | passou |  |
| deepseek-0798 | CT-INT-439 | lists doctors with specialty | passou |  |
| deepseek-0799 | CT-INT-440 | hides inactive doctors | passou |  |
| deepseek-0800 | CT-INT-441 | explains the rules apply to the reception | passou |  |
| deepseek-0801 | CT-INT-442 | loads free times for the doctor | passou |  |
| deepseek-0802 | CT-INT-443 | lists selectable times | passou |  |
| deepseek-0803 | CT-INT-444 | resets the time when the doctor changes | passou |  |
| deepseek-0804 | CT-INT-445 | resets the time when the date changes | passou |  |
| deepseek-0805 | CT-INT-446 | disables confirmation without patient and time | passou |  |
| deepseek-0806 | CT-INT-447 | sends patient, doctor and time | passou |  |
| deepseek-0807 | CT-INT-448 | shows the reception booking toast | passou |  |
| deepseek-0808 | CT-INT-449 | shows the suspension error | passou |  |
| deepseek-0809 | CT-INT-450 | reloads times and clears the selection after booking | passou |  |

## Arquivo: frontend/__testes__/integracao/agendar-recepcao.test.jsx

```js
// Integração do agendamento feito pela recepção em nome do paciente (RF05, RN16, RN26).
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
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
import { AgendarPage } from '../../src/pages/recepcao/AgendarPage';

function montar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AgendarPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

async function escolherFluxo(usuario, { paciente = '1', medico = '1', data = '2026-10-21' } = {}) {
  await screen.findByRole('option', { name: /Ana Pereira/ });
  await screen.findByRole('option', { name: /Dr\. Carlos Almeida/ });
  await usuario.selectOptions(screen.getByLabelText('Paciente'), paciente);
  await usuario.selectOptions(screen.getByLabelText('Médico'), medico);
  fireEvent.change(screen.getByLabelText('Data'), { target: { value: data } });
}

beforeEach(() => {
  vi.clearAllMocks();
  pacientesApi.listar.mockResolvedValue([
    { id: 1, nome: 'Ana Pereira', cpf: '52998224725' },
    { id: 2, nome: 'João Santos', cpf: '11144477735' },
  ]);
  medicosApi.listar.mockResolvedValue([
    { id: 1, nome: 'Dr. Carlos Almeida', especialidadeNome: 'Clínica Geral', ativo: true },
    { id: 5, nome: 'Dr. Aposentado', especialidadeNome: 'Clínica Geral', ativo: false },
  ]);
  medicosApi.horarios.mockResolvedValue({ horarios: ['2026-10-21 09:00', '2026-10-21 09:30'] });
  consultasApi.agendar.mockResolvedValue({
    id: 30,
    pacienteNome: 'Ana Pereira',
    medicoNome: 'Dr. Carlos Almeida',
    inicio: '2026-10-21 09:00',
    valorCentavos: 15000,
  });
});

afterEach(cleanup);

describe('AgendarPage (recepção) — estrutura', () => {
  /**
   * @caso CT-INT-437
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1
   * @objetivo Oferecer paciente, médico e data para a recepção
   * @resultadoEsperado Os três campos estão presentes no formulário
   */
  test('renders the three selection fields', () => {
    montar();
    expect(screen.getByLabelText('Paciente')).toBeInTheDocument();
    expect(screen.getByLabelText('Médico')).toBeInTheDocument();
    expect(screen.getByLabelText('Data')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-438
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF08.1, RNF06
   * @objetivo Distinguir pacientes homônimos pelo CPF
   * @resultadoEsperado A opção de Ana Pereira mostra o CPF
   */
  test('lists patients with CPF', async () => {
    montar();
    const opcao = await screen.findByRole('option', { name: /Ana Pereira/ });
    expect(opcao.textContent).toContain('52998224725');
  });

  /**
   * @caso CT-INT-439
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF08.1, RNF06
   * @objetivo Mostrar a especialidade junto do médico
   * @resultadoEsperado A opção do Dr. Carlos exibe "Clínica Geral"
   */
  test('lists doctors with specialty', async () => {
    montar();
    const opcao = await screen.findByRole('option', { name: /Dr\. Carlos Almeida/ });
    expect(opcao.textContent).toContain('Clínica Geral');
  });

  /**
   * @caso CT-INT-440
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Não oferecer médicos inativos à recepção
   * @resultadoEsperado O médico inativo não aparece entre as opções
   */
  test('hides inactive doctors', async () => {
    montar();
    await screen.findByRole('option', { name: /Dr\. Carlos Almeida/ });
    expect(screen.queryByRole('option', { name: /Dr\. Aposentado/ })).not.toBeInTheDocument();
  });

  /**
   * @caso CT-INT-441
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Explicar o escopo das regras também na recepção
   * @resultadoEsperado A descrição cita antecedência, limites e suspensão
   */
  test('explains the rules apply to the reception', () => {
    montar();
    expect(screen.getByText(/As regras de antecedência, limites e suspensão por faltas também valem/)).toBeInTheDocument();
  });
});

describe('AgendarPage (recepção) — horários', () => {
  /**
   * @caso CT-INT-442
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1
   * @objetivo Consultar horários livres do médico escolhido
   * @resultadoEsperado medicosApi.horarios recebe médico e data
   */
  test('loads free times for the doctor', async () => {
    const usuario = userEvent.setup();
    montar();
    await escolherFluxo(usuario);
    await waitFor(() => expect(medicosApi.horarios).toHaveBeenCalledWith('1', '2026-10-21'));
  });

  /**
   * @caso CT-INT-443
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Apresentar os horários como botões de escolha
   * @resultadoEsperado Dois horários aparecem com aria-pressed
   */
  test('lists selectable times', async () => {
    const usuario = userEvent.setup();
    montar();
    await escolherFluxo(usuario);
    const botao = await screen.findByRole('button', { name: '09:30' });
    expect(botao).toHaveAttribute('aria-pressed', 'false');
  });

  /**
   * @caso CT-INT-444
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF07.1
   * @objetivo Reiniciar a escolha ao trocar o médico
   * @resultadoEsperado Trocar o médico limpa o horário selecionado
   */
  test('resets the time when the doctor changes', async () => {
    const usuario = userEvent.setup();
    medicosApi.listar.mockResolvedValue([
      { id: 1, nome: 'Dr. Carlos Almeida', especialidadeNome: 'Clínica Geral', ativo: true },
      { id: 2, nome: 'Dra. Beatriz Souza', especialidadeNome: 'Cardiologia', ativo: true },
    ]);
    montar();
    await escolherFluxo(usuario);
    await usuario.click(await screen.findByRole('button', { name: '09:30' }));
    expect(screen.getByRole('button', { name: '09:30' })).toHaveAttribute('aria-pressed', 'true');
    await usuario.selectOptions(screen.getByLabelText('Médico'), '2');
    await waitFor(() => expect(screen.getByRole('button', { name: '09:30' })).toHaveAttribute('aria-pressed', 'false'));
  });

  /**
   * @caso CT-INT-445
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF07.1
   * @objetivo Reiniciar a escolha ao trocar a data
   * @resultadoEsperado Trocar a data limpa o horário selecionado
   */
  test('resets the time when the date changes', async () => {
    const usuario = userEvent.setup();
    montar();
    await escolherFluxo(usuario);
    await usuario.click(await screen.findByRole('button', { name: '09:30' }));
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-10-22' } });
    await waitFor(() => expect(screen.getByRole('button', { name: '09:30' })).toHaveAttribute('aria-pressed', 'false'));
  });
});

describe('AgendarPage (recepção) — confirmação', () => {
  /**
   * @caso CT-INT-446
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Impedir o envio sem paciente ou horário
   * @resultadoEsperado O botão Agendar consulta começa desabilitado
   */
  test('disables confirmation without patient and time', () => {
    montar();
    expect(screen.getByRole('button', { name: /Agendar consulta/ })).toBeDisabled();
  });

  /**
   * @caso CT-INT-447
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.1, RN20
   * @objetivo Enviar o paciente escolhido junto do agendamento
   * @resultadoEsperado consultasApi.agendar recebe pacienteId numérico, medicoId e inicio
   */
  test('sends patient, doctor and time', async () => {
    const usuario = userEvent.setup();
    montar();
    await escolherFluxo(usuario);
    await usuario.click(await screen.findByRole('button', { name: '09:00' }));
    await usuario.click(screen.getByRole('button', { name: /Agendar consulta/ }));
    await waitFor(() => expect(consultasApi.agendar).toHaveBeenCalledWith({
      pacienteId: 1,
      medicoId: 1,
      inicio: '2026-10-21 09:00',
    }));
  });

  /**
   * @caso CT-INT-448
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF08.1, RF08.2
   * @objetivo Confirmar o agendamento com paciente, médico, data e valor
   * @resultadoEsperado O toast mostra os quatro dados
   */
  test('shows the reception booking toast', async () => {
    const usuario = userEvent.setup();
    montar();
    await escolherFluxo(usuario);
    await usuario.click(await screen.findByRole('button', { name: '09:00' }));
    await usuario.click(screen.getByRole('button', { name: /Agendar consulta/ }));
    const aviso = await screen.findByText(/Ana Pereira com Dr\. Carlos Almeida em 21\/10\/2026 09:00/);
    expect(aviso.textContent.replace(/\u00a0/g, ' ')).toContain('R$ 150,00');
  });

  /**
   * @caso CT-INT-449
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04, RN20
   * @objetivo Explicar a suspensão do paciente na recepção
   * @resultadoEsperado O erro de suspensão aparece em alerta
   */
  test('shows the suspension error', async () => {
    const usuario = userEvent.setup();
    consultasApi.agendar.mockRejectedValue(new Error('Paciente suspenso por faltas até 2026-11-18.'));
    montar();
    await escolherFluxo(usuario);
    await usuario.click(await screen.findByRole('button', { name: '09:00' }));
    await usuario.click(screen.getByRole('button', { name: /Agendar consulta/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Paciente suspenso por faltas até 2026-11-18.');
  });

  /**
   * @caso CT-INT-450
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.1
   * @objetivo Atualizar horários e seleção após agendar
   * @resultadoEsperado Os horários são recarregados e o botão volta a ficar desabilitado
   */
  test('reloads times and clears the selection after booking', async () => {
    const usuario = userEvent.setup();
    montar();
    await escolherFluxo(usuario);
    await waitFor(() => expect(medicosApi.horarios).toHaveBeenCalledTimes(1));
    await usuario.click(await screen.findByRole('button', { name: '09:00' }));
    await usuario.click(screen.getByRole('button', { name: /Agendar consulta/ }));
    await waitFor(() => expect(medicosApi.horarios).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: /Agendar consulta/ })).toBeDisabled());
  });
});
```
