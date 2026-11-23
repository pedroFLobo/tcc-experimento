// @vitest-environment jsdom
// Testes de integração da RotaProtegida (RF01.2, RN30, usabilidade).
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RotaProtegida } from '../../src/components/RotaProtegida';
import { useAuth } from '../../src/contexts/AuthContext';

vi.mock('../../src/contexts/AuthContext', async () => {
  const atual = await vi.importActual('../../src/contexts/AuthContext');
  return { ...atual, useAuth: vi.fn() };
});

function montar(perfilRota = 'PACIENTE') {
  return render(
    <MemoryRouter initialEntries={['/area']}>
      <Routes>
        <Route element={<RotaProtegida perfil={perfilRota} />}>
          <Route path="/area" element={<div>Conteúdo protegido</div>} />
        </Route>
        <Route path="/login" element={<div>Página de login</div>} />
        <Route path="/paciente" element={<div>Início do paciente</div>} />
        <Route path="/medico" element={<div>Início do médico</div>} />
        <Route path="/recepcao" element={<div>Início da recepção</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
});

describe('RotaProtegida (RF01.2, RN30)', () => {
  /**
   * @caso CT-INT-099
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF01.2
   * @objetivo Mostrar indicador de carregamento enquanto a sessão é verificada
   * @resultadoEsperado aparece o aviso 'Carregando' e o conteúdo protegido não é revelado
   */
  test('mostra carregamento antes de decidir a rota', () => {
    useAuth.mockReturnValue({ usuario: null, carregando: true });
    montar();
    expect(screen.getByLabelText('Carregando')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
    expect(screen.queryByText('Página de login')).not.toBeInTheDocument();
  });

  /**
   * @caso CT-INT-100
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2, RN30
   * @objetivo Redirecionar visitante sem sessão para o login
   * @resultadoEsperado usuário deslogado cai em 'Página de login' sem ver o conteúdo
   */
  test('sem usuário redireciona para o login', () => {
    useAuth.mockReturnValue({ usuario: null, carregando: false });
    montar();
    expect(screen.getByText('Página de login')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
  });

  /**
   * @caso CT-INT-101
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Barrar perfil incorreto e mandá-lo para a sua área inicial
   * @resultadoEsperado médico em rota de paciente cai em 'Início do médico'
   */
  test('perfil errado é mandado para a própria área', () => {
    useAuth.mockReturnValue({ usuario: { perfil: 'MEDICO' }, carregando: false });
    montar('PACIENTE');
    expect(screen.getByText('Início do médico')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
  });

  /**
   * @caso CT-INT-102
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.2, RN30
   * @objetivo Liberar o conteúdo para o perfil correto
   * @resultadoEsperado paciente logado vê o conteúdo protegido
   */
  test('perfil correto vê o conteúdo', () => {
    useAuth.mockReturnValue({ usuario: { perfil: 'PACIENTE' }, carregando: false });
    montar('PACIENTE');
    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
  });
});
