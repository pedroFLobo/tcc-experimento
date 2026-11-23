// Casos de teste de integração: layout autenticado (identificação, menu por
// perfil, botão sair e título da aba). CT-INT-227 a CT-INT-229.

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import Layout from '../../src/components/Layout.jsx';
import { AuthProvider } from '../../src/contexts/AuthContext.jsx';

const mocks = vi.hoisted(() => ({
  me: vi.fn(),
}));

vi.mock('../../src/api', () => ({
  authApi: {
    login: vi.fn(),
    me: mocks.me,
  },
}));

// Mesmos links do perfil RECEPCAO usados pelo App.jsx.
const LINKS_RECEPCAO = [
  { para: '/recepcao', rotulo: 'Consultas', descricao: 'Todas as consultas da clínica, com filtros e ações.', icone: 'lista', exato: true, id: 'menu-consultas' },
  { para: '/recepcao/agendar', rotulo: 'Agendar', descricao: 'Marque consultas em nome dos pacientes.', icone: 'calendarioMais', id: 'menu-agendar' },
  { para: '/recepcao/pacientes', rotulo: 'Pacientes', descricao: 'Cadastre pacientes e gerencie o acesso deles.', icone: 'usuarios', id: 'menu-pacientes' },
  { para: '/recepcao/medicos', rotulo: 'Médicos', descricao: 'Equipe médica, grades de atendimento e bloqueios.', icone: 'estetoscopio', id: 'menu-medicos' },
  { para: '/recepcao/especialidades', rotulo: 'Especialidades', descricao: 'Especialidades atendidas e preço base da consulta.', icone: 'etiqueta', id: 'menu-especialidades' },
  { para: '/recepcao/relatorio', rotulo: 'Relatório', descricao: 'Indicadores de consultas, faltas e faturamento.', icone: 'grafico', id: 'menu-relatorio' },
];

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/recepcao']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Stub de login</div>} />
          <Route element={<Layout links={LINKS_RECEPCAO} />}>
            <Route path="/recepcao" element={<div>Conteúdo da recepção</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('clinica.token', 'token-de-teste');
  mocks.me.mockResolvedValue({
    id: 9,
    nome: 'Rita Recepção',
    email: 'rita@clinica.com',
    perfil: 'RECEPCAO',
  });
  document.title = 'Título anterior';
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
  document.title = '';
});

describe('Layout — header e menu por perfil', () => {
  /**
   * @caso CT-INT-227
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF01.3, RF10.3
   * @objetivo Verificar que o layout autenticado identifica o usuário logado e mostra apenas os links do perfil RECEPCAO
   * @resultadoEsperado O cabeçalho exibe Rita Recepção e os links Consultas, Agendar, Pacientes, Médicos, Especialidades e Relatório, sem links de paciente, e o conteúdo da rota aparece no Outlet
   */
  test.skip('exibe nome do usuário logado e apenas os links do perfil RECEPCAO', async () => {
    renderLayout();

    // identificação do usuário (chegada assíncrona via /auth/me)
    expect(await screen.findByText('Rita Recepção')).toBeInTheDocument();
    expect(document.getElementById('nome-usuario')).toBeTruthy();

    // links do perfil de recepção
    expect(screen.getByRole('link', { name: 'Consultas' })).toHaveAttribute('href', '/recepcao');
    expect(screen.getByRole('link', { name: 'Agendar' })).toHaveAttribute('href', '/recepcao/agendar');
    expect(screen.getByRole('link', { name: 'Pacientes' })).toHaveAttribute('href', '/recepcao/pacientes');
    expect(screen.getByRole('link', { name: 'Médicos' })).toHaveAttribute('href', '/recepcao/medicos');
    expect(screen.getByRole('link', { name: 'Especialidades' })).toHaveAttribute('href', '/recepcao/especialidades');
    expect(screen.getByRole('link', { name: 'Relatório' })).toHaveAttribute('href', '/recepcao/relatorio');

    // o menu do paciente não aparece para a recepção
    expect(screen.queryByRole('link', { name: 'Paciente' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Minhas consultas' })).toBeNull();

    // conteúdo da rota protegida renderizado no Outlet
    expect(screen.getByText('Conteúdo da recepção')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-228
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF01.1, RNF02
   * @objetivo Verificar que o botão Sair encerra a sessão e apaga o token do navegador
   * @resultadoEsperado Após clicar em #botao-sair a chave clinica.token sai do localStorage e o nome do usuário some do cabeçalho
   */
  test.skip('botão sair apaga o token e desloga o usuário', async () => {
    renderLayout();
    expect(await screen.findByText('Rita Recepção')).toBeInTheDocument();
    expect(localStorage.getItem('clinica.token')).toBe('token-de-teste');

    fireEvent.click(document.getElementById('botao-sair'));

    expect(localStorage.getItem('clinica.token')).toBeNull();
    expect(document.getElementById('nome-usuario').textContent).toBe('');
  });

  /**
   * @caso CT-INT-229
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RNF06
   * @objetivo Verificar que a aba do navegador recebe o título da seção atual
   * @resultadoEsperado document.title fica definido como "Consultas · Clínica+"
   */
  test.skip('define o título da aba como "Consultas · Clínica+"', () => {
    renderLayout();

    expect(document.title).toBe('Consultas · Clínica+');
  });
});
