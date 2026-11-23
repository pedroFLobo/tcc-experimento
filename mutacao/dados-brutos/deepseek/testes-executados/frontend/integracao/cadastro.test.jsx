// Integração do auto-cadastro de paciente: formulário, registro, login automático e erros (RF01, RN01–RN03, RN06).
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../src/api', () => ({
  authApi: { login: vi.fn(), registrar: vi.fn(), me: vi.fn() },
  especialidadesApi: { listar: vi.fn(), criar: vi.fn() },
  medicosApi: { listar: vi.fn(), criar: vi.fn(), horarios: vi.fn(), grade: vi.fn(), salvarGrade: vi.fn(), bloqueios: vi.fn(), criarBloqueio: vi.fn(), removerBloqueio: vi.fn() },
  pacientesApi: { listar: vi.fn(), criar: vi.fn() },
  consultasApi: { listar: vi.fn(), agendar: vi.fn(), confirmar: vi.fn(), cancelar: vi.fn(), remarcar: vi.fn(), realizar: vi.fn(), falta: vi.fn() },
  adminApi: { definirAtivo: vi.fn(), resumo: vi.fn() },
}));

import { authApi } from '../../src/api';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { CadastroPage } from '../../src/pages/CadastroPage';

const PACIENTE = { id: 9, nome: 'Ana Pereira', perfil: 'PACIENTE' };

function montarCadastro() {
  return render(
    <MemoryRouter initialEntries={['/cadastro']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/cadastro" element={<CadastroPage />} />
            <Route path="/paciente" element={<div>Tela inicial do paciente</div>} />
            <Route path="/login" element={<div>Tela de login</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function preencher(usuario, dados = {}) {
  await usuario.type(screen.getByLabelText(/Nome completo/), dados.nome ?? 'Ana Pereira');
  await usuario.type(screen.getByLabelText(/E-mail/), dados.email ?? 'ana@email.com');
  await usuario.type(screen.getByLabelText(/Senha/), dados.senha ?? 'Senha123');
  await usuario.type(screen.getByLabelText(/^CPF/), dados.cpf ?? '52998224725');
  fireEvent.change(screen.getByLabelText(/Data de nascimento/), { target: { value: dados.dataNascimento ?? '1990-05-14' } });
  if (dados.telefone) await usuario.type(screen.getByLabelText(/Telefone/), dados.telefone);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  authApi.registrar.mockResolvedValue({ id: 9, nome: 'Ana Pereira' });
  authApi.login.mockResolvedValue({ token: 'jwt-ana', usuario: PACIENTE });
});

afterEach(cleanup);

describe('CadastroPage — formulário', () => {
  /**
   * @caso CT-INT-321
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.1, RF02.3
   * @objetivo Coletar todos os dados necessários para o cadastro
   * @resultadoEsperado Nome, e-mail, senha, CPF, nascimento, telefone e responsável estão presentes
   */
  test('renders every patient field', () => {
    montarCadastro();
    expect(screen.getByLabelText(/Nome completo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/E-mail/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^CPF/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data de nascimento/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Telefone/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do responsável/)).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-322
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Distinguir campos obrigatórios dos opcionais
   * @resultadoEsperado Cinco campos exibem o asterisco de obrigatório
   */
  test('marks the five required fields', () => {
    const { container } = montarCadastro();
    expect(container.querySelectorAll('label span[aria-hidden="true"]')).toHaveLength(5);
  });

  /**
   * @caso CT-INT-323
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RN02, RNF06
   * @objetivo Explicar a regra de senha antes do envio
   * @resultadoEsperado O campo de senha mostra a ajuda com o mínimo de caracteres
   */
  test('explains the password rule', () => {
    montarCadastro();
    expect(screen.getByText('Mínimo de 8 caracteres, com letras e números.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-324
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RN03, RNF06
   * @objetivo Facilitar a digitação do CPF em dispositivos móveis
   * @resultadoEsperado O campo de CPF declara inputMode numérico
   */
  test('uses numeric keyboard hint for CPF', () => {
    montarCadastro();
    expect(screen.getByLabelText(/^CPF/)).toHaveAttribute('inputmode', 'numeric');
  });

  /**
   * @caso CT-INT-325
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Usar seletores de data nativos para a data de nascimento
   * @resultadoEsperado O campo de nascimento é type date
   */
  test('uses a date input for birth date', () => {
    montarCadastro();
    expect(screen.getByLabelText(/Data de nascimento/)).toHaveAttribute('type', 'date');
  });

  /**
   * @caso CT-INT-326
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF01.1
   * @objetivo Oferecer o caminho de volta para quem já tem conta
   * @resultadoEsperado O link "Entrar" leva para a tela de login
   */
  test('links back to login', async () => {
    const usuario = userEvent.setup();
    montarCadastro();
    await usuario.click(screen.getByRole('link', { name: 'Entrar' }));
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-327
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Identificar a página de cadastro no título da aba
   * @resultadoEsperado document.title é "Criar conta · Clínica+"
   */
  test('sets the signup document title', () => {
    montarCadastro();
    expect(document.title).toBe('Criar conta · Clínica+');
  });

  /**
   * @caso CT-INT-328
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Explicar o papel do responsável para pacientes menores
   * @resultadoEsperado O campo de responsável traz a ajuda de menor de 18 anos
   */
  test('explains the guardian requirement', () => {
    montarCadastro();
    expect(screen.getByText('Obrigatório para menores de 18 anos.')).toBeInTheDocument();
  });
});

describe('CadastroPage — envio', () => {
  /**
   * @caso CT-INT-329
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.1, RN03
   * @objetivo Enviar ao registro os dados digitados no formulário
   * @resultadoEsperado authApi.registrar recebe nome, e-mail, senha, CPF e nascimento
   */
  test('sends the typed patient data', async () => {
    const usuario = userEvent.setup();
    montarCadastro();
    await preencher(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(authApi.registrar).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Ana Pereira',
      email: 'ana@email.com',
      senha: 'Senha123',
      cpf: '52998224725',
      dataNascimento: '1990-05-14',
    }));
  });

  /**
   * @caso CT-INT-330
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.1, RF01.1
   * @objetivo Entrar automaticamente logo após o cadastro
   * @resultadoEsperado authApi.login é chamado com o e-mail e a senha cadastrados
   */
  test('logs in automatically after registration', async () => {
    const usuario = userEvent.setup();
    montarCadastro();
    await preencher(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    await waitFor(() => expect(authApi.login).toHaveBeenCalledWith('ana@email.com', 'Senha123'));
  });

  /**
   * @caso CT-INT-331
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.1
   * @objetivo Levar o novo paciente direto para a área de consultas
   * @resultadoEsperado A tela inicial do paciente é exibida
   */
  test('navigates to the patient area after signup', async () => {
    const usuario = userEvent.setup();
    montarCadastro();
    await preencher(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Tela inicial do paciente')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-332
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN30
   * @objetivo Manter a sessão do paciente recém-cadastrado
   * @resultadoEsperado O token é gravado no localStorage
   */
  test('stores the new session token', async () => {
    const usuario = userEvent.setup();
    montarCadastro();
    await preencher(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    await waitFor(() => expect(localStorage.getItem('clinica.token')).toBe('jwt-ana'));
  });

  /**
   * @caso CT-INT-333
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar o cadastro com um aviso claro
   * @resultadoEsperado Um toast "Cadastro concluído" aparece
   */
  test('shows the signup success toast', async () => {
    const usuario = userEvent.setup();
    montarCadastro();
    await preencher(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Cadastro concluído')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-334
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Explicar por que o cadastro foi recusado
   * @resultadoEsperado A mensagem da API aparece em um alerta inline
   */
  test('shows the registration error inline', async () => {
    const usuario = userEvent.setup();
    authApi.registrar.mockRejectedValue(new Error('E-mail já cadastrado.'));
    montarCadastro();
    await preencher(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail já cadastrado.');
  });

  /**
   * @caso CT-INT-335
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF02.1
   * @objetivo Não tentar autenticar quando o cadastro falhou
   * @resultadoEsperado authApi.login não é chamado após rejeição do registro
   */
  test('does not log in when registration fails', async () => {
    const usuario = userEvent.setup();
    authApi.registrar.mockRejectedValue(new Error('CPF inválido.'));
    montarCadastro();
    await preencher(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    await screen.findByRole('alert');
    expect(authApi.login).not.toHaveBeenCalled();
  });

  /**
   * @caso CT-INT-336
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo capacidade-de-recuperacao
   * @requisito RNF04
   * @objetivo Preservar os dados digitados para corrigir apenas o campo inválido
   * @resultadoEsperado Após erro, o e-mail digitado continua no campo
   */
  test('keeps typed data after a failure', async () => {
    const usuario = userEvent.setup();
    authApi.registrar.mockRejectedValue(new Error('CPF inválido.'));
    montarCadastro();
    await preencher(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText(/E-mail/)).toHaveValue('ana@email.com');
  });

  /**
   * @caso CT-INT-337
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF02.1, RNF04
   * @objetivo Informar quando o cadastro deu certo mas o login automático falhou
   * @resultadoEsperado O erro do login é exibido em alerta
   */
  test('shows an error when automatic login fails', async () => {
    const usuario = userEvent.setup();
    authApi.login.mockRejectedValue(new Error('Não foi possível conectar ao servidor.'));
    montarCadastro();
    await preencher(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor.');
  });

  /**
   * @caso CT-INT-338
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Indicar progresso durante o cadastro
   * @resultadoEsperado O botão exibe "Cadastrando..." e fica desabilitado
   */
  test('shows progress while registering', async () => {
    const usuario = userEvent.setup();
    authApi.registrar.mockReturnValue(new Promise(() => {}));
    montarCadastro();
    await preencher(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByRole('button', { name: 'Cadastrando...' })).toBeDisabled();
  });
});
