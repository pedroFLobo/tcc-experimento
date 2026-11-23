// Integração do cadastro e da gestão de pacientes pela recepção (RF03, RF10, RN06).
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

import { adminApi, pacientesApi } from '../../src/api';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { PacientesPage } from '../../src/pages/recepcao/PacientesPage';

const PACIENTES = [
  { id: 1, usuarioId: 6, nome: 'Ana Pereira', email: 'ana@email.com', cpf: '52998224725', dataNascimento: '1990-05-14', ativo: true },
  { id: 2, usuarioId: 7, nome: 'João Santos', email: 'joao@email.com', cpf: '11144477735', dataNascimento: '1958-02-03', ativo: true },
  { id: 3, usuarioId: 8, nome: 'Lucas Oliveira', email: 'lucas@email.com', cpf: '98765432100', dataNascimento: '2016-03-08', ativo: false },
];

function montar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <PacientesPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

async function preencherNovoPaciente(usuario, dados = {}) {
  await usuario.type(screen.getByLabelText(/Nome completo/), dados.nome ?? 'Marta Oliveira');
  await usuario.type(screen.getByLabelText(/E-mail/), dados.email ?? 'marta@email.com');
  await usuario.type(screen.getByLabelText(/Senha/), dados.senha ?? 'Senha123');
  await usuario.type(screen.getByLabelText(/^CPF/), dados.cpf ?? '24681357928');
  fireEvent.change(screen.getByLabelText(/Data de nascimento/), { target: { value: dados.dataNascimento ?? '1985-07-20' } });
}

beforeEach(() => {
  vi.clearAllMocks();
  pacientesApi.listar.mockResolvedValue(PACIENTES.map((p) => ({ ...p })));
  pacientesApi.criar.mockResolvedValue({ id: 4, usuarioId: 10, nome: 'Marta Oliveira', ativo: true });
  adminApi.definirAtivo.mockResolvedValue(null);
});

afterEach(cleanup);

describe('PacientesPage — cadastro', () => {
  /**
   * @caso CT-INT-499
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.2
   * @objetivo Oferecer o formulário completo de novo paciente
   * @resultadoEsperado Nome, e-mail, senha, CPF e nascimento estão presentes
   */
  test('renders the new patient form', () => {
    montar();
    expect(screen.getByRole('heading', { name: 'Novo paciente' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome completo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^CPF/)).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-500
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.2
   * @objetivo Cadastrar o paciente com os dados digitados
   * @resultadoEsperado pacientesApi.criar recebe o objeto do formulário
   */
  test('creates a patient with the typed data', async () => {
    const usuario = userEvent.setup();
    montar();
    await preencherNovoPaciente(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar paciente' }));
    await waitFor(() => expect(pacientesApi.criar).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Marta Oliveira',
      email: 'marta@email.com',
      cpf: '24681357928',
      dataNascimento: '1985-07-20',
    })));
  });

  /**
   * @caso CT-INT-501
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar que o paciente já pode agendar
   * @resultadoEsperado O toast informa o cadastro de Marta Oliveira
   */
  test('shows the patient creation toast', async () => {
    const usuario = userEvent.setup();
    montar();
    await preencherNovoPaciente(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar paciente' }));
    expect(await screen.findByText('Marta Oliveira já pode agendar consultas.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-502
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RF02.2
   * @objetivo Atualizar a lista após cadastrar um paciente
   * @resultadoEsperado pacientesApi.listar é consultado novamente
   */
  test('reloads the patient list after creating', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(pacientesApi.listar).toHaveBeenCalledTimes(1));
    await preencherNovoPaciente(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar paciente' }));
    await waitFor(() => expect(pacientesApi.listar).toHaveBeenCalledTimes(2));
  });

  /**
   * @caso CT-INT-503
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Explicar por que o paciente foi recusado
   * @resultadoEsperado O erro da API aparece em um alerta
   */
  test('shows the creation error', async () => {
    const usuario = userEvent.setup();
    pacientesApi.criar.mockRejectedValue(new Error('CPF já cadastrado.'));
    montar();
    await preencherNovoPaciente(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar paciente' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('CPF já cadastrado.');
  });

  /**
   * @caso CT-INT-504
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF02.2
   * @objetivo Limpar o formulário após um cadastro bem-sucedido
   * @resultadoEsperado O campo de nome volta a ficar vazio
   */
  test('clears the form after creating', async () => {
    const usuario = userEvent.setup();
    montar();
    await preencherNovoPaciente(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar paciente' }));
    await waitFor(() => expect(screen.getByLabelText(/Nome completo/)).toHaveValue(''));
  });
});

describe('PacientesPage — listagem', () => {
  /**
   * @caso CT-INT-505
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Informar que a lista está carregando
   * @resultadoEsperado Antes da resposta aparece "Carregando..."
   */
  test('shows the loading caption', () => {
    pacientesApi.listar.mockReturnValue(new Promise(() => {}));
    montar();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-506
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.2
   * @objetivo Listar todos os pacientes com seus dados
   * @resultadoEsperado As três linhas mostram nome, e-mail e CPF
   */
  test('lists the registered patients', async () => {
    montar();
    await waitFor(() => expect(document.querySelectorAll('#tabela-pacientes tbody tr[data-usuario-id]')).toHaveLength(3));
    const primeira = document.querySelector('tr[data-usuario-id="6"]');
    expect(primeira).toHaveTextContent('Ana Pereira');
    expect(primeira).toHaveTextContent('ana@email.com');
    expect(primeira).toHaveTextContent('52998224725');
  });

  /**
   * @caso CT-INT-507
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Exibir a data de nascimento no padrão brasileiro
   * @resultadoEsperado A linha de Ana mostra 14/05/1990
   */
  test('formats the birth date', async () => {
    montar();
    await waitFor(() => expect(document.querySelector('tr[data-usuario-id="6"]')).toBeInTheDocument());
    expect(document.querySelector('tr[data-usuario-id="6"]')).toHaveTextContent('14/05/1990');
  });

  /**
   * @caso CT-INT-508
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF02.2, RNF06
   * @objetivo Buscar pacientes por nome, e-mail ou CPF
   * @resultadoEsperado pacientesApi.listar recebe o termo sem espaços nas pontas
   */
  test('searches patients by term', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(pacientesApi.listar).toHaveBeenCalled());
    await usuario.type(screen.getByLabelText('Buscar'), '  Ana  ');
    await waitFor(() => expect(pacientesApi.listar).toHaveBeenLastCalledWith('Ana'));
  });

  /**
   * @caso CT-INT-509
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Explicar uma busca sem resultados
   * @resultadoEsperado A mensagem "Nenhum paciente encontrado." é exibida
   */
  test('shows the empty search result', async () => {
    pacientesApi.listar.mockResolvedValue([]);
    montar();
    expect(await screen.findByText('Nenhum paciente encontrado.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-510
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF02.2, RNF06
   * @objetivo Informar quantos pacientes estão cadastrados
   * @resultadoEsperado O texto mostra "3 paciente(s)."
   */
  test('shows the patient count', async () => {
    montar();
    expect(await screen.findByText('3 paciente(s).')).toBeInTheDocument();
  });
});

describe('PacientesPage — situação', () => {
  /**
   * @caso CT-INT-511
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Desativar o acesso de um paciente ativo
   * @resultadoEsperado adminApi.definirAtivo recebe usuarioId e false
   */
  test('deactivates an active patient', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(document.querySelector('tr[data-usuario-id="6"]')).toBeInTheDocument());
    await usuario.click(within(document.querySelector('tr[data-usuario-id="6"]')).getByRole('button', { name: 'Desativar' }));
    expect(adminApi.definirAtivo).toHaveBeenCalledWith(6, false);
  });

  /**
   * @caso CT-INT-512
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RN21, RNF06
   * @objetivo Confirmar a mudança de situação do paciente
   * @resultadoEsperado O toast informa que Ana Pereira foi desativada
   */
  test('shows the deactivation toast', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(document.querySelector('tr[data-usuario-id="6"]')).toBeInTheDocument());
    await usuario.click(within(document.querySelector('tr[data-usuario-id="6"]')).getByRole('button', { name: 'Desativar' }));
    expect(await screen.findByText('Ana Pereira foi desativado.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-513
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Reativar o acesso de um paciente inativo
   * @resultadoEsperado adminApi.definirAtivo recebe usuarioId e true
   */
  test('reactivates an inactive patient', async () => {
    const usuario = userEvent.setup();
    montar();
    await waitFor(() => expect(document.querySelector('tr[data-usuario-id="8"]')).toBeInTheDocument());
    await usuario.click(within(document.querySelector('tr[data-usuario-id="8"]')).getByRole('button', { name: 'Ativar' }));
    expect(adminApi.definirAtivo).toHaveBeenCalledWith(8, true);
  });

  /**
   * @caso CT-INT-514
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Explicar a falha ao mudar a situação do paciente
   * @resultadoEsperado O erro da API aparece em um alerta
   */
  test('shows the status change error', async () => {
    const usuario = userEvent.setup();
    adminApi.definirAtivo.mockRejectedValue(new Error('Paciente possui consultas futuras.'));
    montar();
    await waitFor(() => expect(document.querySelector('tr[data-usuario-id="6"]')).toBeInTheDocument());
    await usuario.click(within(document.querySelector('tr[data-usuario-id="6"]')).getByRole('button', { name: 'Desativar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Paciente possui consultas futuras.');
  });
});
