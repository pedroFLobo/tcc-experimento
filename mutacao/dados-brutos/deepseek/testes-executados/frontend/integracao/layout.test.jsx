// Integração do layout autenticado: menu responsivo, faixa de contexto, título e identificação do usuário (RNF06).
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

import { authApi, consultasApi, medicosApi } from '../../src/api';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { App } from '../../src/App';

const MEDICO = { id: 5, nome: 'Dr. Carlos Almeida', perfil: 'MEDICO', medicoId: 1 };

function montar(rota = '/medico') {
  localStorage.setItem('clinica.token', 'jwt-valido');
  authApi.me.mockResolvedValue(MEDICO);
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

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  consultasApi.listar.mockResolvedValue([]);
  medicosApi.grade.mockResolvedValue([]);
  medicosApi.bloqueios.mockResolvedValue([]);
});

afterEach(cleanup);

/**
 * @caso CT-INT-546
 * @nivel integracao
 * @atributo usabilidade
 * @subatributo acessibilidade
 * @requisito RNF06
 * @objetivo Anunciar o estado inicial do menu móvel
 * @resultadoEsperado O botão "Abrir menu" declara aria-expanded false
 */
test('starts with the menu collapsed', async () => {
  montar();
  const botao = await screen.findByRole('button', { name: 'Abrir menu' });
  expect(botao).toHaveAttribute('aria-expanded', 'false');
});

/**
 * @caso CT-INT-547
 * @nivel integracao
 * @atributo usabilidade
 * @subatributo operabilidade
 * @requisito RNF06
 * @objetivo Alternar o menu pelo botão
 * @resultadoEsperado O botão passa a "Fechar menu" com aria-expanded true
 */
test('toggles the menu', async () => {
  const usuario = userEvent.setup();
  montar();
  await usuario.click(await screen.findByRole('button', { name: 'Abrir menu' }));
  const fechar = screen.getByRole('button', { name: 'Fechar menu' });
  expect(fechar).toHaveAttribute('aria-expanded', 'true');
});

/**
 * @caso CT-INT-548
 * @nivel integracao
 * @atributo usabilidade
 * @subatributo inteligibilidade
 * @requisito RNF06
 * @objetivo Identificar a seção atual no título da aba
 * @resultadoEsperado document.title é "Agenda · Clínica+"
 */
test('sets the title for the current section', async () => {
  montar('/medico');
  await waitFor(() => expect(document.title).toBe('Agenda · Clínica+'));
});

/**
 * @caso CT-INT-549
 * @nivel integracao
 * @atributo usabilidade
 * @subatributo inteligibilidade
 * @requisito RNF06
 * @objetivo Exibir o nome da seção como título da página
 * @resultadoEsperado O h1 da faixa é "Agenda"
 */
test('shows the section heading', async () => {
  montar('/medico');
  expect(await screen.findByRole('heading', { level: 1, name: 'Agenda' })).toBeInTheDocument();
});

/**
 * @caso CT-INT-550
 * @nivel integracao
 * @atributo usabilidade
 * @subatributo inteligibilidade
 * @requisito RNF06
 * @objetivo Situar o usuário no conjunto de três seções do médico
 * @resultadoEsperado A faixa mostra "01 / 03"
 */
test('shows the section position', async () => {
  montar('/medico');
  await screen.findByRole('heading', { level: 1, name: 'Agenda' });
  expect(screen.getByText('01 / 03')).toBeInTheDocument();
});

/**
 * @caso CT-INT-551
 * @nivel integracao
 * @atributo usabilidade
 * @subatributo operabilidade
 * @requisito RF05.1
 * @objetivo Navegar do menu para a grade médica
 * @resultadoEsperado O título e a faixa mudam para "Minha grade" e "02 / 03"
 */
test('navigates to the weekly grade', async () => {
  const usuario = userEvent.setup();
  montar('/medico');
  await screen.findByRole('heading', { level: 1, name: 'Agenda' });
  await usuario.click(screen.getByRole('link', { name: 'Minha grade' }));
  await waitFor(() => expect(document.title).toBe('Minha grade · Clínica+'));
  expect(screen.getByText('02 / 03')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1, name: 'Minha grade' })).toBeInTheDocument();
});

/**
 * @caso CT-INT-552
 * @nivel integracao
 * @atributo usabilidade
 * @subatributo operabilidade
 * @requisito RNF06
 * @objetivo Fechar o menu móvel ao navegar
 * @resultadoEsperado Após trocar de seção, o botão volta a "Abrir menu"
 */
test('closes the menu after navigating', async () => {
  const usuario = userEvent.setup();
  montar('/medico');
  await screen.findByRole('heading', { level: 1, name: 'Agenda' });
  await usuario.click(screen.getByRole('button', { name: 'Abrir menu' }));
  await usuario.click(screen.getByRole('link', { name: 'Bloqueios' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false'));
});

/**
 * @caso CT-INT-553
 * @nivel integracao
 * @atributo usabilidade
 * @subatributo inteligibilidade
 * @requisito RNF06
 * @objetivo Identificar quem está autenticado
 * @resultadoEsperado O nome completo do médico aparece no cabeçalho
 */
test('shows the authenticated user name', async () => {
  montar('/medico');
  await screen.findByRole('heading', { level: 1, name: 'Agenda' });
  expect(document.getElementById('nome-usuario')).toHaveTextContent('Dr. Carlos Almeida');
});

/**
 * @caso CT-INT-554
 * @nivel integracao
 * @atributo usabilidade
 * @subatributo inteligibilidade
 * @requisito RNF06
 * @objetivo Exibir o perfil do usuário logado
 * @resultadoEsperado O cabeçalho e a faixa mostram "Médico"
 */
test('shows the profile label', async () => {
  montar('/medico');
  await screen.findByRole('heading', { level: 1, name: 'Agenda' });
  expect(screen.getAllByText('Médico').length).toBeGreaterThan(0);
});

/**
 * @caso CT-INT-555
 * @nivel integracao
 * @atributo usabilidade
 * @subatributo estetica
 * @requisito RNF06
 * @objetivo Gerar iniciais sem o título profissional
 * @resultadoEsperado O avatar mostra "CA" para Dr. Carlos Almeida
 */
test('shows the user initials', async () => {
  montar('/medico');
  await screen.findByRole('heading', { level: 1, name: 'Agenda' });
  expect(document.querySelector('.avatar')).toHaveTextContent('CA');
});
