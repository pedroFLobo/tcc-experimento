# lote-166

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 7 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0513 | CT-UNI-164 | useAuth devolve null quando usado sem AuthProvider | passou |  |
| mimo-0514 | CT-UNI-165 | AuthProvider não chama /auth/me sem token no armazenamento | passou |  |
| mimo-0515 | CT-UNI-166 | AuthProvider restaura a sessão chamando /auth/me com token salvo | passou |  |
| mimo-0516 | CT-UNI-167 | AuthProvider descarta a sessão quando /auth/me rejeita | passou |  |
| mimo-0517 | CT-UNI-168 | entrar autentica, salva o token e define o usuário | passou |  |
| mimo-0518 | CT-UNI-169 | sair remove o token e zera o usuário | passou |  |
| mimo-0519 | CT-UNI-170 | ROTA_INICIAL mapeia os três perfis para as rotas corretas | passou |  |

## Arquivo: frontend/__testes__/unitario/auth-context.test.jsx

```js
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { authApi } from '../../src/api';
import { AuthProvider, ROTA_INICIAL, useAuth } from '../../src/contexts/AuthContext';

vi.mock('../../src/api', () => ({
  authApi: { login: vi.fn(), me: vi.fn(), registrar: vi.fn() },
}));

function Sonda() {
  const { usuario, carregando, entrar, sair } = useAuth();
  return (
    <div>
      <span data-testid="usuario">{usuario ? `${usuario.perfil}:${usuario.nome}` : 'nenhum'}</span>
      <span data-testid="carregando">{String(carregando)}</span>
      <button type="button" onClick={() => entrar('ana@email.com', 'Senha123')}>entrar</button>
      <button type="button" onClick={sair}>sair</button>
    </div>
  );
}

describe('contexts/AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  /**
   * @caso CT-UNI-164
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Falhar de forma previsível quando o hook é usado fora do provedor
   * @resultadoEsperado useAuth() devolve null sem AuthProvider na árvore
   */
  test('useAuth devolve null quando usado sem AuthProvider', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current).toBeNull();
  });

  /**
   * @caso CT-UNI-165
   * @nivel unitario
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF01.2
   * @objetivo Não consultar dados do usuário quando não há sessão salva
   * @resultadoEsperado Sem token, /auth/me não é chamado, carregando é false e usuário fica null
   */
  test('AuthProvider não chama /auth/me sem token no armazenamento', () => {
    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>,
    );

    expect(screen.getByTestId('carregando')).toHaveTextContent('false');
    expect(screen.getByTestId('usuario')).toHaveTextContent('nenhum');
    expect(authApi.me).not.toHaveBeenCalled();
  });

  /**
   * @caso CT-UNI-166
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.3
   * @objetivo Restaurar a sessão do usuário a partir do token salvo
   * @resultadoEsperado Com token, /auth/me é chamado uma vez e define o usuário logado
   */
  test('AuthProvider restaura a sessão chamando /auth/me com token salvo', async () => {
    localStorage.setItem('clinica.token', 'tok-1');
    authApi.me.mockResolvedValue({ id: 1, nome: 'Ana Pereira', perfil: 'PACIENTE' });

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>,
    );

    expect(screen.getByTestId('carregando')).toHaveTextContent('true');
    await waitFor(() => expect(screen.getByTestId('usuario')).toHaveTextContent('PACIENTE:Ana Pereira'));
    expect(authApi.me).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('carregando')).toHaveTextContent('false');
  });

  /**
   * @caso CT-UNI-167
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo recuperabilidade
   * @requisito RNF02
   * @objetivo Descartar a sessão quando o token salvo é rejeitado pela API
   * @resultadoEsperado /auth/me rejeitado limpa o token, zera o usuário e encerra o carregamento
   */
  test('AuthProvider descarta a sessão quando /auth/me rejeita', async () => {
    localStorage.setItem('clinica.token', 'tok-invalido');
    authApi.me.mockRejectedValue(new Error('Token inválido ou expirado.'));

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('usuario')).toHaveTextContent('nenhum'));
    expect(localStorage.getItem('clinica.token')).toBeNull();
    expect(screen.getByTestId('carregando')).toHaveTextContent('false');
  });

  /**
   * @caso CT-UNI-168
   * @nivel unitario
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF01.1
   * @objetivo Guardar o token recebido no login e manter o usuário em memória
   * @resultadoEsperado entrar chama o login com as credenciais, salva o token e define o usuário
   */
  test('entrar autentica, salva o token e define o usuário', async () => {
    authApi.login.mockResolvedValue({
      token: 'tok-novo',
      usuario: { id: 1, nome: 'Ana Pereira', perfil: 'PACIENTE' },
    });

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByText('entrar'));

    await waitFor(() => expect(screen.getByTestId('usuario')).toHaveTextContent('PACIENTE:Ana Pereira'));
    expect(authApi.login).toHaveBeenCalledWith('ana@email.com', 'Senha123');
    expect(localStorage.getItem('clinica.token')).toBe('tok-novo');
  });

  /**
   * @caso CT-UNI-169
   * @nivel unitario
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF02
   * @objetivo Encerrar a sessão removendo o token do navegador
   * @resultadoEsperado sair apaga o token e zera o usuário em memória
   */
  test('sair remove o token e zera o usuário', async () => {
    authApi.login.mockResolvedValue({
      token: 'tok-1',
      usuario: { id: 1, nome: 'Ana Pereira', perfil: 'PACIENTE' },
    });

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByText('entrar'));
    await waitFor(() => expect(screen.getByTestId('usuario')).toHaveTextContent('PACIENTE:Ana Pereira'));

    fireEvent.click(screen.getByText('sair'));

    expect(screen.getByTestId('usuario')).toHaveTextContent('nenhum');
    expect(localStorage.getItem('clinica.token')).toBeNull();
  });

  /**
   * @caso CT-UNI-170
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN30
   * @objetivo Direcionar cada perfil para a rota inicial que lhe corresponde
   * @resultadoEsperado ROTA_INICIAL mapeia PACIENTE, MEDICO e RECEPCAO para as rotas da aplicação
   */
  test('ROTA_INICIAL mapeia os três perfis para as rotas corretas', () => {
    expect(ROTA_INICIAL).toEqual({
      PACIENTE: '/paciente',
      MEDICO: '/medico',
      RECEPCAO: '/recepcao',
    });
  });
});
```
