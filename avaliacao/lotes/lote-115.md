# lote-115

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 5 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0320 | CT-INT-103 | entrar salva o token e define o usuário | passou |  |
| glm-0321 | CT-INT-104 | restaura a sessão do token salvo | passou |  |
| glm-0322 | CT-INT-105 | token inválido é descartado ao montar | passou |  |
| glm-0323 | CT-INT-106 | sair limpa a sessão | passou |  |
| glm-0324 | CT-INT-107 | sem token não consulta a sessão | passou |  |

## Arquivo: frontend/__testes__/integracao/AuthContext.test.jsx

```js
// @vitest-environment jsdom
// Testes de integração do AuthContext (RF01.1, RF01.3, RNF02).
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import { authApi } from '../../src/api';

vi.mock('../../src/api', () => ({
  authApi: { login: vi.fn(), me: vi.fn() },
}));

function Sonda() {
  const { usuario, carregando, entrar, sair } = useAuth();
  return (
    <div>
      <span data-testid="estado">{carregando ? 'Carregando' : 'Pronto'}</span>
      <span data-testid="usuario">{usuario ? `Olá, ${usuario.nome}` : 'Desconhecido'}</span>
      <button type="button" onClick={() => entrar('ana@email.com', 'Senha123')}>Entrar</button>
      <button type="button" onClick={sair}>Sair</button>
    </div>
  );
}

const montar = () => render(<AuthProvider><Sonda /></AuthProvider>);

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('AuthContext (RF01, RNF02)', () => {
  /**
   * @caso CT-INT-103
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1
   * @objetivo Guardar o token recebido no login e expor o usuário logado
   * @resultadoEsperado após entrar, o token está no localStorage e a saudação mostra o nome do paciente
   */
  test('entrar salva o token e define o usuário', async () => {
    authApi.login.mockResolvedValue({ token: 'token-jwt', usuario: { nome: 'Ana Pereira', perfil: 'PACIENTE' } });
    montar();
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByTestId('usuario')).toHaveTextContent('Olá, Ana Pereira'));
    expect(localStorage.getItem('clinica.token')).toBe('token-jwt');
    expect(screen.getByTestId('estado')).toHaveTextContent('Pronto');
  });

  /**
   * @caso CT-INT-104
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.3
   * @objetivo Restaurar a sessão ao montar quando existe token salvo
   * @resultadoEsperado authApi.me é chamado e o usuário volta a ficar disponível
   */
  test('restaura a sessão do token salvo', async () => {
    localStorage.setItem('clinica.token', 'token-jwt');
    authApi.me.mockResolvedValue({ nome: 'Ana Pereira', perfil: 'PACIENTE' });
    montar();
    expect(screen.getByTestId('estado')).toHaveTextContent('Carregando');
    await waitFor(() => expect(screen.getByTestId('usuario')).toHaveTextContent('Olá, Ana Pereira'));
    expect(authApi.me).toHaveBeenCalledTimes(1);
  });

  /**
   * @caso CT-INT-105
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.3, RNF02
   * @objetivo Descartar token inválido ao restaurar a sessão
   * @resultadoEsperado me() falhando, o token é removido e o usuário volta a nulo
   */
  test('token inválido é descartado ao montar', async () => {
    localStorage.setItem('clinica.token', 'token-podre');
    authApi.me.mockRejectedValue(new Error('Token inválido ou expirado.'));
    montar();
    await waitFor(() => expect(screen.getByTestId('usuario')).toHaveTextContent('Desconhecido'));
    expect(localStorage.getItem('clinica.token')).toBeNull();
  });

  /**
   * @caso CT-INT-106
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01
   * @objetivo Encerrar a sessão limpando o token e o usuário
   * @resultadoEsperado após sair, o localStorage fica sem token e o usuário é limpo
   */
  test('sair limpa a sessão', async () => {
    authApi.login.mockResolvedValue({ token: 'token-jwt', usuario: { nome: 'Ana Pereira', perfil: 'PACIENTE' } });
    montar();
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByTestId('usuario')).toHaveTextContent('Olá, Ana Pereira'));
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(screen.getByTestId('usuario')).toHaveTextContent('Desconhecido'));
    expect(localStorage.getItem('clinica.token')).toBeNull();
  });

  /**
   * @caso CT-INT-107
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF01.3
   * @objetivo Não chamar a API quando não há token salvo
   * @resultadoEsperado montagem sem token não dispara authApi.me e o estado final é 'Pronto'
   */
  test('sem token não consulta a sessão', async () => {
    montar();
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('Pronto'));
    expect(authApi.me).not.toHaveBeenCalled();
    expect(screen.getByTestId('usuario')).toHaveTextContent('Desconhecido');
  });
});
```
