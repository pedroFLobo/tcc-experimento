# lote-062

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 14 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-1019 | CT-INT-339 | redirects an anonymous visitor from the patient area | passou |  |
| deepseek-1020 | CT-INT-340 | redirects an anonymous visitor from the reception area | passou |  |
| deepseek-1021 | CT-INT-341 | redirects an anonymous visitor from the doctor area | passou |  |
| deepseek-1022 | CT-INT-342 | shows a loading indicator while checking the session | passou |  |
| deepseek-1023 | CT-INT-343 | opens the patient consultation history | passou |  |
| deepseek-1024 | CT-INT-344 | keeps the patient out of the reception area | passou |  |
| deepseek-1025 | CT-INT-345 | opens the doctor daily agenda | passou |  |
| deepseek-1026 | CT-INT-346 | keeps the doctor out of the reception area | passou |  |
| deepseek-1027 | CT-INT-347 | opens the reception consultation list | passou |  |
| deepseek-1028 | CT-INT-348 | keeps the reception out of the doctor area | passou |  |
| deepseek-1029 | CT-INT-349 | shows the not found page for unknown routes | passou |  |
| deepseek-1030 | CT-INT-350 | sends the root route to login | passou |  |
| deepseek-1031 | CT-INT-351 | shows the patient menu links | passou |  |
| deepseek-1032 | CT-INT-352 | logs out and returns to login | passou |  |

## Arquivo: frontend/__testes__/integracao/rota-protegida.test.jsx

```js
// Integração de rotas protegidas, menu por perfil e encerramento de sessão (RF01, RNF01, RNF06).
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
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

import {
  authApi,
  especialidadesApi,
  medicosApi,
  pacientesApi,
  consultasApi,
} from '../../src/api';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { App } from '../../src/App';

const PACIENTE = { id: 1, nome: 'Ana Pereira', perfil: 'PACIENTE', pacienteId: 1 };
const MEDICO = { id: 5, nome: 'Dr. Carlos Almeida', perfil: 'MEDICO', medicoId: 1 };
const RECEPCAO = { id: 9, nome: 'Rita Recepção', perfil: 'RECEPCAO' };

function montar(rota) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function autenticar(usuario) {
  localStorage.setItem('clinica.token', 'jwt-valido');
  authApi.me.mockResolvedValue(usuario);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  consultasApi.listar.mockResolvedValue([]);
  medicosApi.listar.mockResolvedValue([]);
  pacientesApi.listar.mockResolvedValue([]);
  especialidadesApi.listar.mockResolvedValue([]);
  medicosApi.grade.mockResolvedValue([]);
  medicosApi.bloqueios.mockResolvedValue([]);
  authApi.me.mockRejectedValue(new Error('Sessão expirada.'));
});

afterEach(cleanup);

describe('RotaProtegida — visitante', () => {
  /**
   * @caso CT-INT-339
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN30
   * @objetivo Bloquear a área do paciente sem sessão
   * @resultadoEsperado A tela de login é exibida
   */
  test('redirects an anonymous visitor from the patient area', async () => {
    montar('/paciente');
    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-340
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN30
   * @objetivo Bloquear a área da recepção sem sessão
   * @resultadoEsperado A tela de login é exibida
   */
  test('redirects an anonymous visitor from the reception area', async () => {
    montar('/recepcao');
    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-341
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN30
   * @objetivo Bloquear a área médica sem sessão
   * @resultadoEsperado A tela de login é exibida
   */
  test('redirects an anonymous visitor from the doctor area', async () => {
    montar('/medico');
    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-342
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Informar que a sessão está sendo verificada
   * @resultadoEsperado Enquanto me() não responde, um indicador "Carregando" aparece
   */
  test('shows a loading indicator while checking the session', () => {
    localStorage.setItem('clinica.token', 'jwt-valido');
    authApi.me.mockReturnValue(new Promise(() => {}));
    montar('/paciente');
    expect(screen.getByLabelText('Carregando')).toBeInTheDocument();
  });
});

describe('RotaProtegida — perfis', () => {
  /**
   * @caso CT-INT-343
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.1, RF01.2
   * @objetivo Abrir a lista de consultas do paciente autenticado
   * @resultadoEsperado A página "Histórico de consultas" é exibida
   */
  test('opens the patient consultation history', async () => {
    autenticar(PACIENTE);
    montar('/paciente');
    expect(await screen.findByRole('heading', { name: 'Histórico de consultas' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-344
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autorizacao
   * @requisito RN30
   * @objetivo Impedir que um paciente abra a área da recepção
   * @resultadoEsperado O paciente é devolvido à sua tela inicial
   */
  test('keeps the patient out of the reception area', async () => {
    autenticar(PACIENTE);
    montar('/recepcao');
    expect(await screen.findByRole('heading', { name: 'Histórico de consultas' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-345
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.2
   * @objetivo Abrir a agenda diária do médico autenticado
   * @resultadoEsperado A página "Atendimentos do dia" é exibida
   */
  test('opens the doctor daily agenda', async () => {
    autenticar(MEDICO);
    montar('/medico');
    expect(await screen.findByRole('heading', { name: 'Atendimentos do dia' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-346
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autorizacao
   * @requisito RN30
   * @objetivo Impedir que um médico abra a área da recepção
   * @resultadoEsperado O médico é devolvido à agenda
   */
  test('keeps the doctor out of the reception area', async () => {
    autenticar(MEDICO);
    montar('/recepcao');
    expect(await screen.findByRole('heading', { name: 'Atendimentos do dia' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-347
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Abrir a listagem de consultas da clínica para a recepção
   * @resultadoEsperado A página "Filtros" é exibida
   */
  test('opens the reception consultation list', async () => {
    autenticar(RECEPCAO);
    montar('/recepcao');
    expect(await screen.findByRole('heading', { name: 'Filtros' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-348
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autorizacao
   * @requisito RN30
   * @objetivo Impedir que a recepção use a agenda restrita do médico
   * @resultadoEsperado A recepção é devolvida à lista de consultas
   */
  test('keeps the reception out of the doctor area', async () => {
    autenticar(RECEPCAO);
    montar('/medico');
    expect(await screen.findByRole('heading', { name: 'Filtros' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-349
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Explicar quando a rota não existe
   * @resultadoEsperado A página 404 é exibida
   */
  test('shows the not found page for unknown routes', async () => {
    montar('/caminho-inexistente');
    expect(await screen.findByText('Esta página não existe ou foi movida.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-350
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF01.1
   * @objetivo Encaminhar a raiz para a entrada do sistema
   * @resultadoEsperado A rota "/" mostra a tela de login
   */
  test('sends the root route to login', async () => {
    montar('/');
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });
});

describe('Layout — menu e sessão', () => {
  /**
   * @caso CT-INT-351
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RN30
   * @objetivo Oferecer ao paciente apenas as opções do seu perfil
   * @resultadoEsperado O menu mostra "Minhas consultas" e "Agendar consulta"
   */
  test('shows the patient menu links', async () => {
    autenticar(PACIENTE);
    montar('/paciente');
    await screen.findByRole('heading', { name: 'Histórico de consultas' });
    expect(screen.getByRole('link', { name: 'Minhas consultas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Agendar consulta' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-352
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN30
   * @objetivo Encerrar a sessão ao sair e impedir o retorno à área protegida
   * @resultadoEsperado O token é removido e a tela de login aparece
   */
  test('logs out and returns to login', async () => {
    const usuario = userEvent.setup();
    autenticar(PACIENTE);
    montar('/paciente');
    await screen.findByRole('heading', { name: 'Histórico de consultas' });
    await usuario.click(screen.getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(localStorage.getItem('clinica.token')).toBeNull());
    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
  });
});
```
