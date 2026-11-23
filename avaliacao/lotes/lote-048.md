# lote-048

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 18 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0778 | CT-INT-419 | shows the four steps | passou |  |
| deepseek-0779 | CT-INT-420 | lists specialties with prices | passou |  |
| deepseek-0780 | CT-INT-421 | disables the doctor select before a specialty | passou |  |
| deepseek-0781 | CT-INT-422 | loads doctors of the chosen specialty | passou |  |
| deepseek-0782 | CT-INT-423 | filters out inactive doctors | passou |  |
| deepseek-0783 | CT-INT-424 | shows the appointment duration | passou |  |
| deepseek-0784 | CT-INT-425 | disables the date input before a doctor | passou |  |
| deepseek-0785 | CT-INT-426 | loads free times after doctor and date | passou |  |
| deepseek-0786 | CT-INT-427 | shows the appointment summary | passou |  |
| deepseek-0787 | CT-INT-428 | shows the chosen date and time in the summary | passou |  |
| deepseek-0788 | CT-INT-429 | disables confirmation without a time | passou |  |
| deepseek-0789 | CT-INT-430 | clears the selection when the date changes | passou |  |
| deepseek-0790 | CT-INT-431 | resets doctor when the specialty changes | passou |  |
| deepseek-0791 | CT-INT-432 | sends the appointment to the API | passou |  |
| deepseek-0792 | CT-INT-433 | shows the success toast with the price | passou |  |
| deepseek-0793 | CT-INT-434 | labels a free return visit | passou |  |
| deepseek-0794 | CT-INT-435 | shows the booking error inline | passou |  |
| deepseek-0795 | CT-INT-436 | reloads free times after booking | passou |  |

## Arquivo: frontend/__testes__/integracao/agendar-paciente.test.jsx

```js
// Integração do agendamento pelo paciente: passos, horários livres, resumo e confirmação (RF05, RN16, RN22–RN24).
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

import { consultasApi, especialidadesApi, medicosApi } from '../../src/api';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { AgendarPage } from '../../src/pages/paciente/AgendarPage';

const ESPECIALIDADES = [
  { id: 1, nome: 'Clínica Geral', precoCentavos: 15000 },
  { id: 2, nome: 'Cardiologia', precoCentavos: 30000 },
];

const MEDICOS = [
  { id: 1, nome: 'Dr. Carlos Almeida', duracaoConsultaMin: 30, ativo: true },
  { id: 5, nome: 'Dr. Aposentado', duracaoConsultaMin: 30, ativo: false },
  { id: 2, nome: 'Dra. Beatriz Souza', duracaoConsultaMin: 45, ativo: true },
];

function montar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AgendarPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

async function escolherFluxo(usuario, { especialidade = '1', medico = '1', data = '2026-10-21' } = {}) {
  await screen.findByRole('option', { name: /Clínica Geral/ });
  await usuario.selectOptions(screen.getByLabelText('Especialidade'), especialidade);
  await screen.findByRole('option', { name: /Dr\. Carlos Almeida/ });
  await usuario.selectOptions(screen.getByLabelText('Médico'), medico);
  fireEvent.change(screen.getByLabelText('Data'), { target: { value: data } });
}

beforeEach(() => {
  vi.clearAllMocks();
  especialidadesApi.listar.mockResolvedValue(ESPECIALIDADES);
  medicosApi.listar.mockImplementation(async (especialidadeId) => (
    especialidadeId ? MEDICOS.filter((m) => m.ativo) : []
  ));
  medicosApi.horarios.mockResolvedValue({ horarios: ['2026-10-21 09:00', '2026-10-21 09:30'] });
  consultasApi.agendar.mockResolvedValue({
    id: 30,
    medicoNome: 'Dr. Carlos Almeida',
    inicio: '2026-10-21 09:00',
    valorCentavos: 15000,
  });
});

afterEach(cleanup);

describe('AgendarPage — passos', () => {
  /**
   * @caso CT-INT-419
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Orientar o paciente com os quatro passos do agendamento
   * @resultadoEsperado A lista "Etapas do agendamento" tem quatro itens
   */
  test('shows the four steps', () => {
    montar();
    const passos = screen.getByRole('list', { name: 'Etapas do agendamento' });
    expect(passos.querySelectorAll('li')).toHaveLength(4);
  });

  /**
   * @caso CT-INT-420
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF03.2
   * @objetivo Listar especialidades com o preço base
   * @resultadoEsperado A opção de Clínica Geral mostra "R$ 150,00"
   */
  test('lists specialties with prices', async () => {
    montar();
    const opcao = await screen.findByRole('option', { name: /Clínica Geral/ });
    expect(opcao.textContent.replace(/\u00a0/g, ' ')).toContain('R$ 150,00');
  });

  /**
   * @caso CT-INT-421
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Impedir a escolha do médico antes da especialidade
   * @resultadoEsperado O select de médico começa desabilitado
   */
  test('disables the doctor select before a specialty', () => {
    montar();
    expect(screen.getByLabelText('Médico')).toBeDisabled();
  });

  /**
   * @caso CT-INT-422
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF04.1
   * @objetivo Carregar apenas médicos da especialidade escolhida
   * @resultadoEsperado medicosApi.listar recebe o id da especialidade
   */
  test('loads doctors of the chosen specialty', async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByRole('option', { name: /Clínica Geral/ });
    await usuario.selectOptions(screen.getByLabelText('Especialidade'), '2');
    await waitFor(() => expect(medicosApi.listar).toHaveBeenCalledWith('2'));
  });

  /**
   * @caso CT-INT-423
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Não oferecer médicos inativos no agendamento
   * @resultadoEsperado A opção do médico inativo não aparece
   */
  test('filters out inactive doctors', async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByRole('option', { name: /Clínica Geral/ });
    await usuario.selectOptions(screen.getByLabelText('Especialidade'), '1');
    expect(await screen.findByRole('option', { name: /Dr\. Carlos Almeida/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Dr\. Aposentado/ })).not.toBeInTheDocument();
  });

  /**
   * @caso CT-INT-424
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Informar a duração da consulta ao escolher o médico
   * @resultadoEsperado A opção mostra "(45 min)" para a cardiologista
   */
  test('shows the appointment duration', async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByRole('option', { name: /Clínica Geral/ });
    await usuario.selectOptions(screen.getByLabelText('Especialidade'), '2');
    expect((await screen.findByRole('option', { name: /Dra\. Beatriz Souza/ })).textContent).toContain('45 min');
  });

  /**
   * @caso CT-INT-425
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Impedir a escolha de data antes do médico
   * @resultadoEsperado O campo de data começa desabilitado
   */
  test('disables the date input before a doctor', () => {
    montar();
    expect(screen.getByLabelText('Data')).toBeDisabled();
  });
});

describe('AgendarPage — horários e resumo', () => {
  /**
   * @caso CT-INT-426
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1
   * @objetivo Consultar horários livres apenas com médico e data definidos
   * @resultadoEsperado medicosApi.horarios recebe médico e data escolhidos
   */
  test('loads free times after doctor and date', async () => {
    const usuario = userEvent.setup();
    montar();
    await escolherFluxo(usuario);
    await waitFor(() => expect(medicosApi.horarios).toHaveBeenCalledWith('1', '2026-10-21'));
  });

  /**
   * @caso CT-INT-427
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar a escolha com um resumo do agendamento
   * @resultadoEsperado O resumo mostra médico, especialidade e duração
   */
  test('shows the appointment summary', async () => {
    const usuario = userEvent.setup();
    montar();
    await escolherFluxo(usuario);
    await usuario.click(await screen.findByRole('button', { name: '09:30' }));
    const resumo = document.getElementById('agendar-resumo');
    expect(resumo).toHaveTextContent('Dr. Carlos Almeida');
    expect(resumo).toHaveTextContent('Clínica Geral');
    expect(resumo).toHaveTextContent('30 minutos');
  });

  /**
   * @caso CT-INT-428
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Mostrar data e hora escolhidas no resumo
   * @resultadoEsperado O resumo exibe "21/10/2026 09:30"
   */
  test('shows the chosen date and time in the summary', async () => {
    const usuario = userEvent.setup();
    montar();
    await escolherFluxo(usuario);
    await usuario.click(await screen.findByRole('button', { name: '09:30' }));
    expect(document.getElementById('agendar-resumo')).toHaveTextContent('21/10/2026 09:30');
  });

  /**
   * @caso CT-INT-429
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Impedir a confirmação sem um horário escolhido
   * @resultadoEsperado O botão Confirmar agendamento começa desabilitado
   */
  test('disables confirmation without a time', () => {
    montar();
    expect(screen.getByRole('button', { name: /Confirmar agendamento/ })).toBeDisabled();
  });

  /**
   * @caso CT-INT-430
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF07.1
   * @objetivo Limpar a escolha ao mudar a data
   * @resultadoEsperado O resumo desaparece quando a data muda
   */
  test('clears the selection when the date changes', async () => {
    const usuario = userEvent.setup();
    montar();
    await escolherFluxo(usuario);
    await usuario.click(await screen.findByRole('button', { name: '09:30' }));
    expect(document.getElementById('agendar-resumo')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-10-22' } });
    expect(document.getElementById('agendar-resumo')).not.toBeInTheDocument();
  });

  /**
   * @caso CT-INT-431
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF07.1
   * @objetivo Reiniciar médico e horário ao trocar a especialidade
   * @resultadoEsperado O select de médico volta ao estado inicial e a data é desabilitada
   */
  test('resets doctor when the specialty changes', async () => {
    const usuario = userEvent.setup();
    montar();
    await escolherFluxo(usuario);
    await usuario.click(await screen.findByRole('button', { name: '09:30' }));
    await usuario.selectOptions(screen.getByLabelText('Especialidade'), '2');
    await waitFor(() => expect(screen.getByLabelText('Médico')).toHaveValue(''));
    expect(screen.getByLabelText('Data')).toBeDisabled();
  });
});

describe('AgendarPage — confirmação', () => {
  /**
   * @caso CT-INT-432
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.1, RN16
   * @objetivo Enviar o agendamento com médico e horário escolhidos
   * @resultadoEsperado consultasApi.agendar recebe medicoId numérico e inicio completo
   */
  test('sends the appointment to the API', async () => {
    const usuario = userEvent.setup();
    montar();
    await escolherFluxo(usuario);
    await usuario.click(await screen.findByRole('button', { name: '09:00' }));
    await usuario.click(screen.getByRole('button', { name: /Confirmar agendamento/ }));
    await waitFor(() => expect(consultasApi.agendar).toHaveBeenCalledWith({ medicoId: 1, inicio: '2026-10-21 09:00' }));
  });

  /**
   * @caso CT-INT-433
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar o agendamento com médico, data e valor
   * @resultadoEsperado O toast informa médico, data e R$ 150,00
   */
  test('shows the success toast with the price', async () => {
    const usuario = userEvent.setup();
    montar();
    await escolherFluxo(usuario);
    await usuario.click(await screen.findByRole('button', { name: '09:00' }));
    await usuario.click(screen.getByRole('button', { name: /Confirmar agendamento/ }));
    const aviso = await screen.findByText(/Dr\. Carlos Almeida em 21\/10\/2026 09:00/);
    expect(aviso.textContent.replace(/\u00a0/g, ' ')).toContain('R$ 150,00');
  });

  /**
   * @caso CT-INT-434
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RN24, RNF06
   * @objetivo Explicar o retorno gratuito em vez de mostrar zero
   * @resultadoEsperado O toast informa "retorno gratuito"
   */
  test('labels a free return visit', async () => {
    const usuario = userEvent.setup();
    consultasApi.agendar.mockResolvedValue({
      id: 31,
      medicoNome: 'Dr. Carlos Almeida',
      inicio: '2026-10-21 09:00',
      valorCentavos: 0,
    });
    montar();
    await escolherFluxo(usuario);
    await usuario.click(await screen.findByRole('button', { name: '09:00' }));
    await usuario.click(screen.getByRole('button', { name: /Confirmar agendamento/ }));
    expect(await screen.findByText(/retorno gratuito/)).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-435
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Explicar a recusa do agendamento junto ao formulário
   * @resultadoEsperado O erro da API aparece em um alerta
   */
  test('shows the booking error inline', async () => {
    const usuario = userEvent.setup();
    consultasApi.agendar.mockRejectedValue(new Error('Paciente suspenso por faltas até 2026-11-18.'));
    montar();
    await escolherFluxo(usuario);
    await usuario.click(await screen.findByRole('button', { name: '09:00' }));
    await usuario.click(screen.getByRole('button', { name: /Confirmar agendamento/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Paciente suspenso por faltas até 2026-11-18.');
  });

  /**
   * @caso CT-INT-436
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.1
   * @objetivo Atualizar os horários livres após agendar
   * @resultadoEsperado A consulta de horários é refeita depois do sucesso
   */
  test('reloads free times after booking', async () => {
    const usuario = userEvent.setup();
    montar();
    await escolherFluxo(usuario);
    await waitFor(() => expect(medicosApi.horarios).toHaveBeenCalledTimes(1));
    await usuario.click(await screen.findByRole('button', { name: '09:00' }));
    await usuario.click(screen.getByRole('button', { name: /Confirmar agendamento/ }));
    await waitFor(() => expect(medicosApi.horarios).toHaveBeenCalledTimes(2));
  });
});
```
