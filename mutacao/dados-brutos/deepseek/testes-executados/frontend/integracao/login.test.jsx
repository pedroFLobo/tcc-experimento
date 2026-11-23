// Integração da tela de login com AuthContext, ToastContext e roteamento (RF01, RNF01, RNF06).
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
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
import { LoginPage } from '../../src/pages/LoginPage';

const PACIENTE = { id: 3, nome: 'Ana Pereira', perfil: 'PACIENTE' };

function montarLogin(entrada = '/login') {
  return render(
    <MemoryRouter initialEntries={[entrada]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/paciente" element={<div>Tela inicial do paciente</div>} />
            <Route path="/cadastro" element={<div>Tela de cadastro</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  authApi.login.mockResolvedValue({ token: 'jwt-ana', usuario: PACIENTE });
  authApi.me.mockResolvedValue(PACIENTE);
});

afterEach(cleanup);

describe('LoginPage — estrutura', () => {
  /**
   * @caso CT-INT-301
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RF01.1, RNF06
   * @objetivo Oferecer os dois campos de acesso com rótulos associados
   * @resultadoEsperado Os campos E-mail e Senha são encontráveis por getByLabelText
   */
  test('renders email and password fields', () => {
    montarLogin();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-302
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1
   * @objetivo Disparar a autenticação pelo botão principal
   * @resultadoEsperado O botão "Entrar" está disponível no formulário
   */
  test('offers the submit button', () => {
    montarLogin();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-303
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF01.1, RF02.1
   * @objetivo Levar o visitante ao auto-cadastro de paciente
   * @resultadoEsperado O link "Cadastre-se como paciente" abre /cadastro
   */
  test('links to the signup page', async () => {
    const usuario = userEvent.setup();
    montarLogin();
    await usuario.click(screen.getByRole('link', { name: 'Cadastre-se como paciente' }));
    expect(screen.getByText('Tela de cadastro')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-304
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Ajudar quem está avaliando o sistema a entrar sem cadastro
   * @resultadoEsperado A tela lista contas de demonstração e a senha padrão
   */
  test('shows demo accounts', () => {
    montarLogin();
    expect(screen.getByText(/recepcao@clinica\.com/)).toBeInTheDocument();
    expect(screen.getByText('Senha123')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-305
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Identificar a página no título da aba do navegador
   * @resultadoEsperado document.title é "Entrar · Clínica+"
   */
  test('sets the document title', () => {
    montarLogin();
    expect(document.title).toBe('Entrar · Clínica+');
  });
});

describe('LoginPage — envio', () => {
  /**
   * @caso CT-INT-306
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1
   * @objetivo Enviar ao serviço exatamente o que foi digitado
   * @resultadoEsperado authApi.login recebe o e-mail e a senha digitados
   */
  test('sends typed credentials to the API', async () => {
    const usuario = userEvent.setup();
    montarLogin();
    await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com');
    await usuario.type(screen.getByLabelText('Senha'), 'Senha123');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(authApi.login).toHaveBeenCalledWith('ana@email.com', 'Senha123');
  });

  /**
   * @caso CT-INT-307
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1, RNF02
   * @objetivo Guardar o token para manter a sessão após navegar
   * @resultadoEsperado localStorage guarda "clinica.token" com o JWT recebido
   */
  test('stores the token on success', async () => {
    const usuario = userEvent.setup();
    montarLogin();
    await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com');
    await usuario.type(screen.getByLabelText('Senha'), 'Senha123');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(localStorage.getItem('clinica.token')).toBe('jwt-ana'));
  });

  /**
   * @caso CT-INT-308
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1
   * @objetivo Encaminhar cada perfil para a sua tela inicial
   * @resultadoEsperado Paciente autenticado vê a tela inicial do paciente
   */
  test('navigates the patient to the initial page', async () => {
    const usuario = userEvent.setup();
    montarLogin();
    await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com');
    await usuario.type(screen.getByLabelText('Senha'), 'Senha123');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Tela inicial do paciente')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-309
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar o login com o primeiro nome do usuário
   * @resultadoEsperado Um toast de sucesso cumprimenta "Ana"
   */
  test('shows a welcome toast with the first name', async () => {
    const usuario = userEvent.setup();
    montarLogin();
    await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com');
    await usuario.type(screen.getByLabelText('Senha'), 'Senha123');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
    const toast = await screen.findByText(/Que bom ter você de volta, Ana\./);
    expect(toast).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-310
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Explicar a credencial inválida junto ao formulário
   * @resultadoEsperado O erro da API aparece em um alerta inline
   */
  test('shows the API error inline', async () => {
    const usuario = userEvent.setup();
    authApi.login.mockRejectedValue(new Error('E-mail ou senha inválidos.'));
    montarLogin();
    await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com');
    await usuario.type(screen.getByLabelText('Senha'), 'errada');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
  });

  /**
   * @caso CT-INT-311
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN30
   * @objetivo Não criar sessão quando o login falha
   * @resultadoEsperado Nenhum token é gravado após credencial inválida
   */
  test('does not store a token when login fails', async () => {
    const usuario = userEvent.setup();
    authApi.login.mockRejectedValue(new Error('E-mail ou senha inválidos.'));
    montarLogin();
    await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com');
    await usuario.type(screen.getByLabelText('Senha'), 'errada');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
    await screen.findByRole('alert');
    expect(localStorage.getItem('clinica.token')).toBeNull();
  });

  /**
   * @caso CT-INT-312
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF01.1
   * @objetivo Manter o formulário utilizável após uma falha
   * @resultadoEsperado Após erro, os campos e o botão continuam na tela
   */
  test('keeps the form available after a failure', async () => {
    const usuario = userEvent.setup();
    authApi.login.mockRejectedValue(new Error('E-mail ou senha inválidos.'));
    montarLogin();
    await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com');
    await usuario.type(screen.getByLabelText('Senha'), 'errada');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@email.com');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  /**
   * @caso CT-INT-313
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Informar que a autenticação está em andamento
   * @resultadoEsperado O botão troca para "Entrando..." durante a chamada
   */
  test('shows progress text while authenticating', async () => {
    const usuario = userEvent.setup();
    authApi.login.mockReturnValue(new Promise(() => {}));
    montarLogin();
    await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com');
    await usuario.type(screen.getByLabelText('Senha'), 'Senha123');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('button', { name: 'Entrando...' })).toBeDisabled();
  });

  /**
   * @caso CT-INT-314
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Permitir nova tentativa depois de corrigir a senha
   * @resultadoEsperado O erro anterior some ao reenviar
   */
  test('clears the previous error on retry', async () => {
    const usuario = userEvent.setup();
    authApi.login
      .mockRejectedValueOnce(new Error('E-mail ou senha inválidos.'))
      .mockResolvedValueOnce({ token: 'jwt-ana', usuario: PACIENTE });
    montarLogin();
    await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com');
    await usuario.type(screen.getByLabelText('Senha'), 'errada');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
    await screen.findByRole('alert');
    await usuario.clear(screen.getByLabelText('Senha'));
    await usuario.type(screen.getByLabelText('Senha'), 'Senha123');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Tela inicial do paciente')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('LoginPage — sessão existente', () => {
  /**
   * @caso CT-INT-315
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1, RNF02
   * @objetivo Retomar a sessão a partir do token guardado
   * @resultadoEsperado Com token válido, authApi.me é consultado e o usuário entra
   */
  test('restores the session from a stored token', async () => {
    localStorage.setItem('clinica.token', 'jwt-valido');
    montarLogin();
    expect(await screen.findByText('Tela inicial do paciente')).toBeInTheDocument();
    expect(authApi.me).toHaveBeenCalledTimes(1);
  });

  /**
   * @caso CT-INT-316
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN30
   * @objetivo Descartar token recusado pelo servidor
   * @resultadoEsperado Se me() falha, o token é removido e o login é exibido
   */
  test('drops an invalid token and shows the login form', async () => {
    authApi.me.mockRejectedValue(new Error('Sessão expirada.'));
    localStorage.setItem('clinica.token', 'jwt-invalido');
    montarLogin();
    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
    expect(localStorage.getItem('clinica.token')).toBeNull();
  });

  /**
   * @caso CT-INT-317
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Não pedir login novamente a quem já está autenticado
   * @resultadoEsperado A página de login redireciona direto para a área do paciente
   */
  test('redirects an authenticated user away from login', async () => {
    localStorage.setItem('clinica.token', 'jwt-valido');
    montarLogin();
    expect(await screen.findByText('Tela inicial do paciente')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
  });
});

describe('LoginPage — validação de entrada', () => {
  /**
   * @caso CT-INT-318
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Não bloquear o envio por validação nativa do navegador
   * @resultadoEsperado O formulário usa noValidate e chama a API mesmo vazio
   */
  test('submits even with empty fields', async () => {
    const usuario = userEvent.setup();
    authApi.login.mockRejectedValue(new Error('E-mail ou senha inválidos.'));
    montarLogin();
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(authApi.login).toHaveBeenCalledWith('', '');
  });

  /**
   * @caso CT-INT-319
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Tratar as caixas de e-mail e senha com o tipo correto
   * @resultadoEsperado O e-mail é type email e a senha é type password
   */
  test('uses email and password input types', () => {
    montarLogin();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  /**
   * @caso CT-INT-320
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Ajudar o gerenciador de senhas a preencher as credenciais
   * @resultadoEsperado O e-mail usa username e a senha usa current-password
   */
  test('declares autocomplete hints', () => {
    montarLogin();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'current-password');
  });
});
