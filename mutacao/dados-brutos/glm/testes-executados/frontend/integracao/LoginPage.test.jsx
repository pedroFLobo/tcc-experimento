// @vitest-environment jsdom
// Testes de integração da página de login (RF01.1, usabilidade).
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from '../../src/pages/LoginPage';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { authApi } from '../../src/api';

vi.mock('../../src/api', () => ({
  authApi: { login: vi.fn(), me: vi.fn() },
}));

function montar(entrada = '/login') {
  return render(
    <MemoryRouter initialEntries={[entrada]}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<div>Página de cadastro</div>} />
            <Route path="/paciente" element={<div>Início do paciente</div>} />
            <Route path="/medico" element={<div>Início do médico</div>} />
            <Route path="/recepcao" element={<div>Início da recepção</div>} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('LoginPage (RF01.1)', () => {
  /**
   * @caso CT-INT-108
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1
   * @objetivo Autenticar pelo formulário e levar o paciente à sua área inicial
   * @resultadoEsperado toast de sucesso aparece e a navegação cai em 'Início do paciente'
   */
  test('login válido entra com toast e redireciona', async () => {
    authApi.login.mockResolvedValue({ token: 'token-jwt', usuario: { nome: 'Ana Pereira', perfil: 'PACIENTE' } });
    montar();
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@email.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'Senha123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByText('Início do paciente')).toBeInTheDocument());
    expect(screen.getByText('Login realizado')).toBeInTheDocument();
    expect(document.querySelector('.toast[data-tipo="sucesso"]')).not.toBeNull();
    expect(localStorage.getItem('clinica.token')).toBe('token-jwt');
  });

  /**
   * @caso CT-INT-109
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF01.1, RNF06
   * @objetivo Mostrar o erro de credenciais junto ao formulário, sem sair da página
   * @resultadoEsperado mensagem inline com role="alert" exibe 'E-mail ou senha inválidos.'
   */
  test('credenciais erradas mostram alerta inline', async () => {
    authApi.login.mockRejectedValue(Object.assign(new Error('E-mail ou senha inválidos.'), { status: 401 }));
    montar();
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@email.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'Errada123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('E-mail ou senha inválidos.');
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@email.com');
  });

  /**
   * @caso CT-INT-110
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Apresentar campos rotulados e acessíveis por teclado/leitor de tela
   * @resultadoEsperado 'E-mail' e 'Senha' são acessíveis por getByLabelText
   */
  test('campos possuem rótulos associados', () => {
    montar();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-111
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1
   * @objetivo Levar direto à área inicial quem já está logado
   * @resultadoEsperado com sessão restaurada, /login redireciona para 'Início do paciente' sem mostrar o formulário
   */
  test('usuário logado não vê o formulário', async () => {
    localStorage.setItem('clinica.token', 'token-jwt');
    authApi.me.mockResolvedValue({ nome: 'Ana Pereira', perfil: 'PACIENTE' });
    montar();
    await waitFor(() => expect(screen.getByText('Início do paciente')).toBeInTheDocument());
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
  });
});
