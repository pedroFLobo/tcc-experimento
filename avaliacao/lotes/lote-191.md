# lote-191

Modelo: nemotron

Avalie com a skill `juiz-casos-teste` **somente os 4 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| nemotron-0272 | (sem @caso) | renderiza campos de e-mail e senha e botão entrar (RNF06) | erro-de-carga | Cannot find module '../../src/contexts/AuthContext' Require stack: - C:\Users\pedro\AppData\Local\Temp\clinica-experimento\nemotron\frontend\__testes__\integrac |
| nemotron-0273 | (sem @caso) | chama entrar com email e senha ao submeter o formulário | erro-de-carga | Cannot find module '../../src/contexts/AuthContext' Require stack: - C:\Users\pedro\AppData\Local\Temp\clinica-experimento\nemotron\frontend\__testes__\integrac |
| nemotron-0274 | (sem @caso) | exibe erro quando o login falha | erro-de-carga | Cannot find module '../../src/contexts/AuthContext' Require stack: - C:\Users\pedro\AppData\Local\Temp\clinica-experimento\nemotron\frontend\__testes__\integrac |
| nemotron-0275 | (sem @caso) | quando já há usuário logado, não mostra o formulário de login | erro-de-carga | Cannot find module '../../src/contexts/AuthContext' Require stack: - C:\Users\pedro\AppData\Local\Temp\clinica-experimento\nemotron\frontend\__testes__\integrac |

## Arquivo: frontend/__testes__/integracao/LoginPage.integracao.test.jsx

```js
// Testes de integração — frontend: LoginPage (RF01, RNF06 usabilidade)
// Atributos: Usabilidade, Segurança
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginPage } from '../../src/pages/LoginPage';

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  ROTA_INICIAL: { PACIENTE: '/paciente', MEDICO: '/medico', RECEPCAO: '/recepcao' },
}));

vi.mock('../../src/contexts/ToastContext', () => ({
  useToast: vi.fn(() => ({
    sucesso: vi.fn(),
    erro: vi.fn(),
  })),
}));

vi.mock('../../src/hooks/useMensagem', () => ({
  useMensagem: vi.fn(() => ({
    mensagem: null,
    erro: vi.fn(),
    limpar: vi.fn(),
  })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  Navigate: ({ to }) => <div data-navigate-to={to} />,
}));

const { useAuth } = require('../../src/contexts/AuthContext');

function renderLogin({ usuario = null, entrar = vi.fn(), carregando = false } = {}) {
  useAuth.mockReturnValue({ usuario, entrar, carregando, sair: vi.fn() });
  return render(<LoginPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginPage', () => {
  test('renderiza campos de e-mail e senha e botão entrar (RNF06)', () => {
    renderLogin();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    expect(screen.getByText(/não tem conta/i)).toBeInTheDocument();
  });

  test('chama entrar com email e senha ao submeter o formulário', async () => {
    const entrar = vi.fn().mockResolvedValue({ nome: 'Ana Pereira', perfil: 'PACIENTE' });
    renderLogin({ entrar });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@email.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'Senha123' } });
    fireEvent.submit(screen.getByRole('button', { name: /entrar/i }).closest('form'));
    expect(entrar).toHaveBeenCalledWith('ana@email.com', 'Senha123');
  });

  test('exibe erro quando o login falha', async () => {
    const erroFn = vi.fn();
    const { useMensagem } = require('../../src/hooks/useMensagem');
    useMensagem.mockReturnValue({ mensagem: null, erro: erroFn, limpar: vi.fn() });
    const entrar = vi.fn().mockRejectedValue(new Error('E-mail ou senha inválidos.'));
    renderLogin({ entrar });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@email.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'Senha123' } });
    fireEvent.submit(screen.getByRole('button', { name: /entrar/i }).closest('form'));
    await vi.waitFor(() => expect(erroFn).toHaveBeenCalledWith('E-mail ou senha inválidos.'));
  });

  test('quando já há usuário logado, não mostra o formulário de login', () => {
    renderLogin({
      usuario: { nome: 'Ana', perfil: 'PACIENTE' },
      entrar: vi.fn(),
    });
    expect(screen.queryByRole('button', { name: /entrar/i })).not.toBeInTheDocument();
    expect(screen.getByTestId?.('navigate-to')).toBeDefined();
    const nav = document.querySelector('[data-navigate-to]');
    expect(nav).not.toBeNull();
  });
});
```
