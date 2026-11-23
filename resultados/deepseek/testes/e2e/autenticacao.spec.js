import { test, expect } from '@playwright/test';

const SENHA = 'Senha123';

async function entrar(page, email, destino) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-senha').fill(SENHA);
  await page.locator('#login-entrar').click();
  await expect(page).toHaveURL(new RegExp(`${destino}$`));
}

test.describe('Autenticação e cadastro', () => {
  /**
   * @caso CT-E2E-001
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RF01.1
   * @objetivo Abrir a tela de login e reconhecer os campos e ações disponíveis
   * @resultadoEsperado E-mail, senha, botão Entrar e link de cadastro ficam visíveis
   */
  test('tela de login exibe campos e link de cadastro', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-senha')).toBeVisible();
    await expect(page.locator('#login-entrar')).toHaveText('Entrar');
    await expect(page.locator('#link-cadastro')).toHaveText('Cadastre-se como paciente');
  });

  /**
   * @caso CT-E2E-002
   * @nivel e2e
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1
   * @objetivo Recusar login com senha incorreta
   * @resultadoEsperado A página permanece no login e mostra o alerta de credenciais inválidas
   */
  test('senha incorreta mostra erro e mantém no login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill('ana@email.com');
    await page.locator('#login-senha').fill('SenhaErrada1');
    await page.locator('#login-entrar').click();
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.');
    await expect(page).toHaveURL(/\/login$/);
  });

  /**
   * @caso CT-E2E-003
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF01.1
   * @objetivo Entrar como paciente e chegar à área do paciente
   * @resultadoEsperado A URL vira /paciente e o nome do usuário aparece no cabeçalho
   */
  test('login de paciente leva para minhas consultas', async ({ page }) => {
    await entrar(page, 'ana@email.com', '/paciente');
    await expect(page.locator('#nome-usuario')).toHaveText('Ana Pereira');
    await expect(page.locator('#menu-consultas')).toBeVisible();
  });

  /**
   * @caso CT-E2E-004
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF01.1, RF10.2
   * @objetivo Entrar como médico e chegar à agenda
   * @resultadoEsperado A URL vira /medico e o título Agenda aparece
   */
  test('login de médico leva para a agenda', async ({ page }) => {
    await entrar(page, 'carlos@clinica.com', '/medico');
    await expect(page.getByRole('heading', { name: 'Atendimentos do dia' })).toBeVisible();
    await expect(page.locator('#nome-usuario')).toHaveText('Dr. Carlos Almeida');
  });

  /**
   * @caso CT-E2E-005
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF01.1, RF10.3
   * @objetivo Entrar como recepção e chegar à listagem de consultas
   * @resultadoEsperado A URL vira /recepcao com os filtros de consultas
   */
  test('login de recepção leva para a listagem de consultas', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await expect(page.getByRole('heading', { name: 'Filtros' })).toBeVisible();
    await expect(page.locator('#filtro-aplicar')).toBeVisible();
  });

  /**
   * @caso CT-E2E-006
   * @nivel e2e
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2, RN30
   * @objetivo Impedir acesso anônimo a uma rota protegida
   * @resultadoEsperado O acesso a /paciente redireciona para /login
   */
  test('rota protegida sem sessão redireciona para o login', async ({ page }) => {
    await page.goto('/paciente');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('#login-entrar')).toBeVisible();
  });

  /**
   * @caso CT-E2E-007
   * @nivel e2e
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2
   * @objetivo Encerrar a sessão pelo botão Sair
   * @resultadoEsperado Volta ao login e a rota protegida deixa de abrir
   */
  test('sair encerra a sessão e protege as rotas', async ({ page }) => {
    await entrar(page, 'ana@email.com', '/paciente');
    await page.locator('#botao-sair').click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/paciente');
    await expect(page).toHaveURL(/\/login$/);
  });

  /**
   * @caso CT-E2E-008
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.1
   * @objetivo Cadastrar um paciente novo pela tela pública
   * @resultadoEsperado A conta é criada, o login é automático e a área do paciente abre
   */
  test('auto-cadastro cria conta e entra no sistema', async ({ page }) => {
    await page.goto('/cadastro');
    await page.locator('#cadastro-nome').fill('Novo Paciente E2E');
    await page.locator('#cadastro-email').fill('e2e.novo@email.com');
    await page.locator('#cadastro-senha').fill('Senha123');
    await page.locator('#cadastro-cpf').fill('123.456.789-09');
    await page.locator('#cadastro-nascimento').fill('1995-03-10');
    await page.locator('#cadastro-enviar').click();
    await expect(page).toHaveURL(/\/paciente$/);
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Cadastro concluído' })).toBeVisible();
    await expect(page.locator('#nome-usuario')).toHaveText('Novo Paciente E2E');
  });

  /**
   * @caso CT-E2E-009
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN03
   * @objetivo Recusar auto-cadastro com CPF inválido
   * @resultadoEsperado Um alerta em português informa que o CPF é inválido
   */
  test('cadastro com CPF inválido é recusado', async ({ page }) => {
    await page.goto('/cadastro');
    await page.locator('#cadastro-nome').fill('Cpf Invalido E2E');
    await page.locator('#cadastro-email').fill('cpf.invalido@email.com');
    await page.locator('#cadastro-senha').fill('Senha123');
    await page.locator('#cadastro-cpf').fill('111.111.111-11');
    await page.locator('#cadastro-nascimento').fill('1990-01-01');
    await page.locator('#cadastro-enviar').click();
    await expect(page.getByRole('alert')).toHaveText('CPF inválido.');
    await expect(page).toHaveURL(/\/cadastro$/);
  });

  /**
   * @caso CT-E2E-010
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN02
   * @objetivo Recusar auto-cadastro com senha curta
   * @resultadoEsperado Um alerta explica o mínimo de 8 caracteres com letras e números
   */
  test('cadastro com senha curta é recusado', async ({ page }) => {
    await page.goto('/cadastro');
    await page.locator('#cadastro-nome').fill('Senha Curta E2E');
    await page.locator('#cadastro-email').fill('senha.curta@email.com');
    await page.locator('#cadastro-senha').fill('abc123');
    await page.locator('#cadastro-cpf').fill('987.654.321-00');
    await page.locator('#cadastro-nascimento').fill('1990-01-01');
    await page.locator('#cadastro-enviar').click();
    await expect(page.getByRole('alert')).toHaveText('Senha deve ter no mínimo 8 caracteres, com letras e números.');
  });

  /**
   * @caso CT-E2E-011
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN06
   * @objetivo Recusar auto-cadastro de menor sem nome do responsável
   * @resultadoEsperado Um alerta pede o nome do responsável
   */
  test('cadastro de menor exige responsável', async ({ page }) => {
    await page.goto('/cadastro');
    await page.locator('#cadastro-nome').fill('Menor Sem Responsavel');
    await page.locator('#cadastro-email').fill('menor.sem.responsavel@email.com');
    await page.locator('#cadastro-senha').fill('Senha123');
    await page.locator('#cadastro-cpf').fill('246.813.579-28');
    await page.locator('#cadastro-nascimento').fill('2015-05-10');
    await page.locator('#cadastro-enviar').click();
    await expect(page.getByRole('alert')).toHaveText('Paciente menor de 18 anos deve informar o nome do responsável.');
  });

  /**
   * @caso CT-E2E-012
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF01.1
   * @objetivo Acessar /login já autenticado
   * @resultadoEsperado O sistema redireciona para a página inicial do perfil
   */
  test('usuário autenticado não vê a tela de login', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.goto('/login');
    await expect(page).toHaveURL(/\/recepcao$/);
  });

  /**
   * @caso CT-E2E-013
   * @nivel e2e
   * @atributo confiabilidade
   * @subatributo disponibilidade
   * @requisito RF01.2
   * @objetivo Recarregar a página mantendo a sessão salva
   * @resultadoEsperado O usuário continua autenticado após o reload
   */
  test('sessão persiste após recarregar a página', async ({ page }) => {
    await entrar(page, 'ana@email.com', '/paciente');
    await page.reload();
    await expect(page).toHaveURL(/\/paciente$/);
    await expect(page.locator('#nome-usuario')).toHaveText('Ana Pereira');
  });

  /**
   * @caso CT-E2E-014
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF02.1
   * @objetivo Usar o link de cadastro da tela de login
   * @resultadoEsperado A tela Criar conta é aberta
   */
  test('link de cadastro abre o formulário de paciente', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#link-cadastro').click();
    await expect(page).toHaveURL(/\/cadastro$/);
    await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible();
    await expect(page.locator('#cadastro-enviar')).toHaveText('Criar conta');
  });
});
