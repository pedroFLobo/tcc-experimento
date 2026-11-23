import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { consultasApi, especialidadesApi, medicosApi } from '../../src/api';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { AgendarPage } from '../../src/pages/paciente/AgendarPage';

vi.mock('../../src/api', () => ({
  especialidadesApi: { listar: vi.fn(), criar: vi.fn() },
  medicosApi: { listar: vi.fn(), horarios: vi.fn(), criar: vi.fn() },
  consultasApi: { listar: vi.fn(), agendar: vi.fn() },
}));

const ESPECIALIDADES = [
  { id: 1, nome: 'Clínica Geral', precoCentavos: 15000 },
  { id: 2, nome: 'Cardiologia', precoCentavos: 30000 },
];

const MEDICOS = [
  { id: 1, nome: 'Dr. Carlos Almeida', especialidadeId: 1, duracaoConsultaMin: 30, ativo: true },
  { id: 9, nome: 'Dr. Inativo', especialidadeId: 1, duracaoConsultaMin: 30, ativo: false },
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

function escolher(rotulo, valor) {
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
}

async function montarComConsulta(data = '2026-10-26') {
  const utils = montar();
  await screen.findByRole('option', { name: /Clínica Geral/ });
  escolher('Especialidade', '1');
  await waitFor(() => expect(screen.getByRole('option', { name: /Dr\. Carlos Almeida/ })).toBeInTheDocument());
  escolher('Médico', '1');
  escolher('Data', data);
  await screen.findByRole('button', { name: '08:00' });
  return utils;
}

describe('pages/paciente/AgendarPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    especialidadesApi.listar.mockResolvedValue(ESPECIALIDADES);
    medicosApi.listar.mockResolvedValue(MEDICOS);
    medicosApi.horarios.mockResolvedValue({ horarios: ['2026-10-26 08:00', '2026-10-26 08:30'] });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  /**
   * @caso CT-INT-200
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF03.2
   * @objetivo Oferecer as especialidades com o preço base formatado para escolha
   * @resultadoEsperado O select de especialidade lista as opções com nome e preço em reais
   */
  test.skip('AgendarPage lista as especialidades com o preço formatado', async () => {
    montar();

    const opcao = await screen.findByRole('option', { name: /Clínica Geral/ });
    expect(opcao.textContent).toContain('R$ 150,00');
    expect(screen.getByRole('option', { name: /Cardiologia/ }).textContent).toContain('R$ 300,00');
  });

  /**
   * @caso CT-INT-201
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF06
   * @objetivo Não deixar escolher médico antes da especialidade
   * @resultadoEsperado Select de médico fica desabilitado e sem consultar a API até a escolha
   */
  test('AgendarPage mantém o médico desabilitado até escolher a especialidade', async () => {
    montar();
    await screen.findByRole('option', { name: /Clínica Geral/ });

    expect(screen.getByLabelText('Médico')).toBeDisabled();
    expect(medicosApi.listar).not.toHaveBeenCalled();
    expect(screen.getByRole('option', { name: 'Escolha a especialidade' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-202
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF04.1
   * @objetivo Mostrar apenas os médicos ativos da especialidade escolhida
   * @resultadoEsperado Após escolher a especialidade, a lista tem o médico ativo e não o inativo
   */
  test('AgendarPage lista somente médicos ativos da especialidade escolhida', async () => {
    montar();
    await screen.findByRole('option', { name: /Clínica Geral/ });

    escolher('Especialidade', '1');

    await waitFor(() => expect(medicosApi.listar).toHaveBeenCalledWith('1'));
    await screen.findByRole('option', { name: /Dr\. Carlos Almeida/ });
    const textos = [...screen.getByLabelText('Médico').querySelectorAll('option')].map((opcao) => opcao.textContent);
    expect(textos.join(' ')).toContain('Dr. Carlos Almeida (30 min)');
    expect(textos.join(' ')).not.toContain('Dr. Inativo');
  });

  /**
   * @caso CT-INT-203
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF06
   * @objetivo Liberar a escolha de data somente depois que o médico está definido
   * @resultadoEsperado Campo de data fica desabilitado sem médico e habilitado após a escolha
   */
  test('AgendarPage habilita a data apenas após escolher o médico', async () => {
    montar();
    await screen.findByRole('option', { name: /Clínica Geral/ });
    escolher('Especialidade', '1');
    await screen.findByRole('option', { name: /Dr\. Carlos Almeida/ });

    expect(screen.getByLabelText('Data')).toBeDisabled();

    escolher('Médico', '1');

    expect(screen.getByLabelText('Data')).toBeEnabled();
  });

  /**
   * @caso CT-INT-204
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1, RN14
   * @objetivo Buscar os horários livres do médico na data escolhida
   * @resultadoEsperado A API de horários é chamada com médico e data e os botões aparecem
   */
  test('AgendarPage busca e exibe os horários do médico na data', async () => {
    montar();
    await screen.findByRole('option', { name: /Clínica Geral/ });
    escolher('Especialidade', '1');
    await waitFor(() => expect(medicosApi.listar).toHaveBeenCalledWith('1'));
    escolher('Médico', '1');
    escolher('Data', '2026-10-26');

    expect(await screen.findByRole('button', { name: '08:00' })).toBeInTheDocument();
    expect(medicosApi.horarios).toHaveBeenCalledWith('1', '2026-10-26');
  });

  /**
   * @caso CT-INT-205
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Mostrar o resumo do que será agendado antes da confirmação
   * @resultadoEsperado Ao escolher o horário, o resumo exibe médico, especialidade, data e duração
   */
  test('AgendarPage mostra o resumo do agendamento ao escolher o horário', async () => {
    await montarComConsulta();

    fireEvent.click(screen.getByRole('button', { name: '08:00' }));

    const resumo = document.getElementById('agendar-resumo');
    expect(resumo).toHaveTextContent('Dr. Carlos Almeida');
    expect(resumo).toHaveTextContent('Clínica Geral');
    expect(resumo).toHaveTextContent('26/10/2026 08:00');
    expect(resumo).toHaveTextContent('30 minutos');
  });

  /**
   * @caso CT-INT-206
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF06
   * @objetivo Bloquear a confirmação enquanto não há horário escolhido
   * @resultadoEsperado Botão de confirmar fica desabilitado sem horário e habilitado depois da escolha
   */
  test('AgendarPage desabilita a confirmação sem horário escolhido', async () => {
    await montarComConsulta();

    expect(document.getElementById('agendar-confirmar')).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '08:00' }));

    expect(document.getElementById('agendar-confirmar')).toBeEnabled();
  });

  /**
   * @caso CT-INT-207
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.1, RF08.2
   * @objetivo Enviar o agendamento com o horário escolhido e confirmar o valor calculado
   * @resultadoEsperado O POST recebe médico e início, o toast confirma e o resumo é limpo
   */
  test('AgendarPage envia a solicitação e confirma o valor da consulta', async () => {
    consultasApi.agendar.mockResolvedValue({
      id: 5,
      medicoNome: 'Dr. Carlos Almeida',
      inicio: '2026-10-26 08:00',
      valorCentavos: 15000,
    });
    await montarComConsulta();

    fireEvent.click(screen.getByRole('button', { name: '08:00' }));
    fireEvent.click(document.getElementById('agendar-confirmar'));

    await waitFor(() => expect(consultasApi.agendar).toHaveBeenCalledWith({ medicoId: 1, inicio: '2026-10-26 08:00' }));
    expect(await screen.findByText('Consulta agendada')).toBeInTheDocument();
    expect(await screen.findByText(/Dr\. Carlos Almeida em 26\/10\/2026 08:00 \(R\$\s150,00\)\./)).toBeInTheDocument();
    await waitFor(() => expect(document.getElementById('agendar-resumo')).toBeNull());
  });

  /**
   * @caso CT-INT-208
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Mostrar a regra de negócio violada sem perder o horário escolhido
   * @resultadoEsperado Erro do servidor vira alerta no formulário e o resumo permanece na tela
   */
  test('AgendarPage exibe o erro do servidor mantendo o horário escolhido', async () => {
    consultasApi.agendar.mockRejectedValue(
      new Error('O paciente já possui uma consulta agendada nesta especialidade.'),
    );
    await montarComConsulta();

    fireEvent.click(screen.getByRole('button', { name: '08:00' }));
    fireEvent.click(document.getElementById('agendar-confirmar'));

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveAttribute('id', 'agendar-mensagem');
    expect(aviso).toHaveTextContent('O paciente já possui uma consulta agendada nesta especialidade.');
    expect(document.getElementById('agendar-resumo')).not.toBeNull();
    expect(consultasApi.agendar).toHaveBeenCalledTimes(1);
  });

  /**
   * @caso CT-INT-209
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF06
   * @objetivo Evitar agendar com médico de outra especialidade após trocar a escolha
   * @resultadoEsperado Trocar a especialidade zera o médico, o horário e o resumo
   */
  test('AgendarPage limpa médico e horário ao trocar a especialidade', async () => {
    await montarComConsulta();
    fireEvent.click(screen.getByRole('button', { name: '08:00' }));
    expect(document.getElementById('agendar-resumo')).not.toBeNull();

    escolher('Especialidade', '2');

    expect(screen.getByLabelText('Médico')).toHaveValue('');
    expect(document.getElementById('agendar-resumo')).toBeNull();
    await waitFor(() => expect(medicosApi.listar).toHaveBeenCalledWith('2'));
  });
});
