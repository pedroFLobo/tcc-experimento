# lote-190

Modelo: nemotron

Avalie com a skill `juiz-casos-teste` **somente os 3 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| nemotron-0269 | (sem @caso) | renderiza todos os campos do cadastro de paciente (RNF06) | erro-de-carga | Cannot find module 'C:\Users\pedro\AppData\Local\Temp\clinica-experimento\nemotron\frontend\src\api\client' imported from C:\Users\pedro\AppData\Local\Temp\clin |
| nemotron-0270 | (sem @caso) | chama registrar e entrar ao submeter dados válidos | erro-de-carga | Cannot find module 'C:\Users\pedro\AppData\Local\Temp\clinica-experimento\nemotron\frontend\src\api\client' imported from C:\Users\pedro\AppData\Local\Temp\clin |
| nemotron-0271 | (sem @caso) | exibe erro quando o registro falha | erro-de-carga | Cannot find module 'C:\Users\pedro\AppData\Local\Temp\clinica-experimento\nemotron\frontend\src\api\client' imported from C:\Users\pedro\AppData\Local\Temp\clin |

## Arquivo: frontend/__testes__/integracao/CadastroPage.integracao.test.jsx

```js
// Testes de integração — frontend: CadastroPage (RF02, RNF06 usabilidade)
// Atributos: Usabilidade, Adequação funcional
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CadastroPage } from '../../src/pages/CadastroPage';

vi.mock('../../src/api', () => ({
  authApi: {
    registrar: vi.fn(),
    login: vi.fn(),
    me: vi.fn(),
  },
}));

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
}));

const { authApi } = require('../../src/api');
const { useAuth } = require('../../src/contexts/AuthContext');

const DADOS_VALIDOS = {
  nome: 'Maria Silva',
  email: 'maria@email.com',
  senha: 'Senha123',
  cpf: '733.769.628-50',
  dataNascimento: '1985-03-10',
  telefone: '(11) 99999-0000',
};

function renderCadastro({ entrar = vi.fn().mockResolvedValue({ nome: 'Maria', perfil: 'PACIENTE' }) } = {}) {
  useAuth.mockReturnValue({ entrar, usuario: null, carregando: false, sair: vi.fn() });
  return render(<CadastroPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
  authApi.registrar.mockResolvedValue({});
});

describe('CadastroPage', () => {
  test('renderiza todos os campos do cadastro de paciente (RNF06)', () => {
    renderCadastro();
    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cpf/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data de nascimento/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument();
  });

  test('chama registrar e entrar ao submeter dados válidos', async () => {
    const entrar = vi.fn().mockResolvedValue({ nome: 'Maria Silva', perfil: 'PACIENTE' });
    renderCadastro({ entrar });
    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Maria Silva' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'maria@email.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'Senha123' } });
    fireEvent.change(screen.getByLabelText(/cpf/i), { target: { value: '733.769.628-50' } });
    fireEvent.change(screen.getByLabelText(/data de nascimento/i), { target: { value: '1985-03-10' } });
    fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '(11) 99999-0000' } });
    fireEvent.submit(screen.getByRole('button', { name: /criar conta/i }).closest('form'));
    await waitFor(() => expect(authApi.registrar).toHaveBeenCalled());
    await waitFor(() => expect(entrar).toHaveBeenCalledWith('maria@email.com', 'Senha123'));
  });

  test('exibe erro quando o registro falha', async () => {
    const erroFn = vi.fn();
    const { useMensagem } = require('../../src/hooks/useMensagem');
    useMensagem.mockReturnValue({ mensagem: null, erro: erroFn, limpar: vi.fn() });
    authApi.registrar.mockRejectedValue(new Error('E-mail já cadastrado.'));
    renderCadastro();
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@email.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'Senha123' } });
    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/cpf/i), { target: { value: '111.222.333-44' } });
    fireEvent.change(screen.getByLabelText(/data de nascimento/i), { target: { value: '1990-01-01' } });
    fireEvent.submit(screen.getByRole('button', { name: /criar conta/i }).closest('form'));
    await waitFor(() => expect(erroFn).toHaveBeenCalledWith('E-mail já cadastrado.'));
  });
});
```
