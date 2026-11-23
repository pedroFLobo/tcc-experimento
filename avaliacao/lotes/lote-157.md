# lote-157

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 6 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0460 | CT-INT-194 | LoginPage exibe os campos de e-mail e senha com rótulos associados | passou |  |
| mimo-0461 | CT-INT-195 | LoginPage navega para a tela de cadastro pelo link indicado | passou |  |
| mimo-0462 | CT-INT-196 | LoginPage exibe erro em português para senha incorreta | passou |  |
| mimo-0463 | CT-INT-197 | LoginPage autentica e leva o paciente para a área dele | passou |  |
| mimo-0464 | CT-INT-198 | LoginPage desabilita o botão enquanto o login está em andamento | passou |  |
| mimo-0465 | CT-INT-199 | LoginPage redireciona o usuário já autenticado sem exibir o formulário | passou |  |

## Arquivo: frontend/__testes__/integracao/login-page.test.jsx

```js
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { authApi } from '../../src/api';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { LoginPage } from '../../src/pages/LoginPage';

vi.mock('../../src/api', () => ({
  authApi: { login: vi.fn(), me: vi.fn(), registrar: vi.fn() },
  especialidadesApi: { listar: vi.fn(), criar: vi.fn() },
  medicosApi: { listar: vi.fn(), horarios: vi.fn(), criar: vi.fn() },
  pacientesApi: { listar: vi.fn(), criar: vi.fn() },
  consultasApi: { listar: vi.fn(), agendar: vi.fn() },
  adminApi: { definirAtivo: vi.fn(), resumo: vi.fn() },
}));

function montar() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<div>tela de cadastro</div>} />
            <Route path="/paciente" element={<div>area do paciente</div>} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

function preencher(email, senha) {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } });
}

describe('pages/LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  /**
   * @caso CT-INT-194
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Apresentar o formulário com rótulos associados e botão de envio identificável
   * @resultadoEsperado Os campos de e-mail e senha são encontrados por rótulo e o botão Entrar está presente
   */
  test('LoginPage exibe os campos de e-mail e senha com rótulos associados', () => {
    montar();

    expect(screen.getByLabelText('E-mail')).toHaveAttribute('id', 'login-email');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('id', 'login-senha');
    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveAttribute('id', 'login-entrar');
    expect(document.getElementById('form-login')).not.toBeNull();
  });

  /**
   * @caso CT-INT-195
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF02.1
   * @objetivo Oferecer o caminho de auto-cadastro para quem ainda não tem conta
   * @resultadoEsperado O link "Cadastre-se como paciente" leva para a tela de cadastro
   */
  test('LoginPage navega para a tela de cadastro pelo link indicado', () => {
    montar();

    fireEvent.click(screen.getByText('Cadastre-se como paciente'));

    expect(screen.getByText('tela de cadastro')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-196
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Mostrar a recusa de credenciais em português sem sair da tela de login
   * @resultadoEsperado Senha errada exibe alerta com a mensagem da API e mantém /login
   */
  test('LoginPage exibe erro em português para senha incorreta', async () => {
    authApi.login.mockRejectedValue(new Error('E-mail ou senha inválidos.'));
    montar();

    preencher('recepcao@clinica.com', 'senha-errada');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveAttribute('id', 'login-mensagem');
    expect(aviso).toHaveTextContent('E-mail ou senha inválidos.');
    expect(authApi.login).toHaveBeenCalledWith('recepcao@clinica.com', 'senha-errada');
    expect(screen.queryByText('area do paciente')).not.toBeInTheDocument();
  });

  /**
   * @caso CT-INT-197
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1, RF01.3
   * @objetivo Entrar com credenciais válidas e seguir para a área do perfil
   * @resultadoEsperado Login PACIENTE salva o token, mostra o toast de boas-vindas e vai para /paciente
   */
  test('LoginPage autentica e leva o paciente para a área dele', async () => {
    authApi.login.mockResolvedValue({
      token: 'tok-1',
      usuario: { id: 1, nome: 'Ana Pereira', perfil: 'PACIENTE' },
    });
    montar();

    preencher('ana@email.com', 'Senha123');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(screen.getByText('area do paciente')).toBeInTheDocument());
    expect(localStorage.getItem('clinica.token')).toBe('tok-1');
    expect(await screen.findByText('Que bom ter você de volta, Ana.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-198
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF06
   * @objetivo Impedir envio repetido enquanto o login está em andamento
   * @resultadoEsperado Durante a requisição o botão fica desabilitado e mostra "Entrando..."
   */
  test('LoginPage desabilita o botão enquanto o login está em andamento', async () => {
    let resolver;
    authApi.login.mockReturnValue(new Promise((resolverExterno) => { resolver = resolverExterno; }));
    montar();

    preencher('ana@email.com', 'Senha123');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByRole('button', { name: 'Entrando...' })).toBeDisabled();

    resolver({ token: 'tok-2', usuario: { id: 1, nome: 'Ana Pereira', perfil: 'PACIENTE' } });
    await waitFor(() => expect(screen.getByText('area do paciente')).toBeInTheDocument());
  });

  /**
   * @caso CT-INT-199
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF01.2
   * @objetivo Não exibir o formulário de login para quem já tem sessão válida
   * @resultadoEsperado Com sessão restaurada, a página redireciona sem mostrar os campos
   */
  test('LoginPage redireciona o usuário já autenticado sem exibir o formulário', async () => {
    localStorage.setItem('clinica.token', 'tok-1');
    authApi.me.mockResolvedValue({ id: 1, nome: 'Ana Pereira', perfil: 'PACIENTE' });

    montar();

    await waitFor(() => expect(screen.getByText('area do paciente')).toBeInTheDocument());
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
  });
});
```
