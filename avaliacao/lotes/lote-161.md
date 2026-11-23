# lote-161

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 4 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0483 | CT-INT-176 | RotaProtegida redireciona para /login sem sessão | passou |  |
| mimo-0484 | CT-INT-177 | RotaProtegida leva o usuário de outro perfil para a rota inicial dele | passou |  |
| mimo-0485 | CT-INT-178 | RotaProtegida renderiza a rota filha para o perfil correto | passou |  |
| mimo-0486 | CT-INT-179 | RotaProtegida mostra carregamento enquanto restaura a sessão | passou |  |

## Arquivo: frontend/__testes__/integracao/rota-protegida.test.jsx

```js
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { authApi } from '../../src/api';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { RotaProtegida } from '../../src/components/RotaProtegida';

vi.mock('../../src/api', () => ({
  authApi: { login: vi.fn(), me: vi.fn(), registrar: vi.fn() },
}));

function montar() {
  return render(
    <MemoryRouter initialEntries={['/paciente']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>tela de login</div>} />
          <Route path="/medico" element={<div>agenda do medico</div>} />
          <Route element={<RotaProtegida perfil="PACIENTE" />}>
            <Route path="/paciente" element={<div>conteudo do paciente</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('components/RotaProtegida', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  /**
   * @caso CT-INT-176
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF01.2
   * @objetivo Barrar o acesso à rota protegida quando não há sessão
   * @resultadoEsperado Sem usuário, a rota filha não renderiza e o navegador vai para /login
   */
  test('RotaProtegida redireciona para /login sem sessão', () => {
    montar();

    expect(screen.getByText('tela de login')).toBeInTheDocument();
    expect(screen.queryByText('conteudo do paciente')).not.toBeInTheDocument();
  });

  /**
   * @caso CT-INT-177
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30
   * @objetivo Impedir que usuário de outro perfil entre na rota deste perfil
   * @resultadoEsperado Usuário MEDICO em rota PACIENTE é levado para /medico
   */
  test('RotaProtegida leva o usuário de outro perfil para a rota inicial dele', async () => {
    localStorage.setItem('clinica.token', 'tok-1');
    authApi.me.mockResolvedValue({ id: 1, nome: 'Dr. Carlos Almeida', perfil: 'MEDICO' });

    montar();

    await waitFor(() => expect(screen.getByText('agenda do medico')).toBeInTheDocument());
    expect(screen.queryByText('conteudo do paciente')).not.toBeInTheDocument();
  });

  /**
   * @caso CT-INT-178
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN30
   * @objetivo Liberar a rota quando o perfil do usuário corresponde ao pedido
   * @resultadoEsperado Usuário PACIENTE em rota PACIENTE renderiza o conteúdo protegido
   */
  test('RotaProtegida renderiza a rota filha para o perfil correto', async () => {
    localStorage.setItem('clinica.token', 'tok-1');
    authApi.me.mockResolvedValue({ id: 2, nome: 'Ana Pereira', perfil: 'PACIENTE' });

    montar();

    await waitFor(() => expect(screen.getByText('conteudo do paciente')).toBeInTheDocument());
  });

  /**
   * @caso CT-INT-179
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Indicar carregamento enquanto a sessão é restaurada, sem redirecionar antes da hora
   * @resultadoEsperado Com /auth/me pendente, aparece o indicador de carregamento e não o login
   */
  test('RotaProtegida mostra carregamento enquanto restaura a sessão', () => {
    localStorage.setItem('clinica.token', 'tok-1');
    authApi.me.mockReturnValue(new Promise(() => {}));

    montar();

    expect(screen.getByLabelText('Carregando')).toBeInTheDocument();
    expect(screen.queryByText('tela de login')).not.toBeInTheDocument();
    expect(screen.queryByText('conteudo do paciente')).not.toBeInTheDocument();
  });
});
```
