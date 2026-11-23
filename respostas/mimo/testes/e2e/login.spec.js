// Casos de teste E2E: login, sessão e navegação inicial.
// Cobrem CT-E2E-001 a CT-E2E-006.

import { test, expect } from '@playwright/test';

function toast(page, texto) {
  return page.locator('.toast').filter({ hasText: texto }).first();
}

// Abre o login limpo, preenche as credenciais e espera o redirecionamento pós-entrada.
async function entrar(page, email, senha) {
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.fill('#login-email', email);
  await page.fill('#login-senha', senha);
  await page.click('#login-entrar');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

test.describe('Login, sessão e rotas', () => {
  /**
   * @caso CT-E2E-001
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1, RF01.3
   * @objetivo Verificar que a recepção faz login com credenciais válidas e é levada à tela do seu perfil com a sessão ativa
   * @resultadoEsperado O navegador redireciona para /recepcao, o token JWT fica em localStorage e o cabeçalho mostra o nome Rita Recepção
   */
  test('login da recepção leva para /recepcao com token salvo', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'recepcao@clinica.com');
    await page.fill('#login-senha', 'Senha123');
    await page.click('#login-entrar');

    await expect(page).toHaveURL(/\/recepcao/);
    const token = await page.evaluate(() => localStorage.getItem('clinica.token'));
    expect(token).toBeTruthy();
    await expect(page.locator('#nome-usuario')).toHaveText('Rita Recepção');
    await expect(toast(page, 'Login realizado')).toBeVisible();
  });

  /**
   * @caso CT-E2E-002
   * @nivel e2e
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1
   * @objetivo Verificar que uma senha incorreta é recusada sem criar sessão
   * @resultadoEsperado A tela de login exibe o alerta "E-mail ou senha inválidos.", continua em /login e nenhum token é gravado
   */
  test('senha errada mostra alerta e não cria sessão', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'recepcao@clinica.com');
    await page.fill('#login-senha', 'SenhaErrada1');
    await page.click('#login-entrar');

    await expect(page.locator('#login-mensagem')).toContainText('E-mail ou senha inválidos.');
    await expect(page).toHaveURL(/\/login/);
    const token = await page.evaluate(() => localStorage.getItem('clinica.token'));
    expect(token).toBeNull();
  });

  /**
   * @caso CT-E2E-003
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF01.1
   * @objetivo Verificar que o paciente é levado à área do paciente após o login
   * @resultadoEsperado O navegador redireciona para /paciente e o cabeçalho mostra o nome Ana Pereira
   */
  test('login do paciente leva para /paciente', async ({ page }) => {
    await entrar(page, 'ana@email.com', 'Senha123');

    await expect(page).toHaveURL(/\/paciente/);
    await expect(page.locator('#nome-usuario')).toHaveText('Ana Pereira');
  });

  /**
   * @caso CT-E2E-004
   * @nivel e2e
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF01.1, RNF02
   * @objetivo Verificar que o botão Sair encerra a sessão e apaga o token do navegador
   * @resultadoEsperado Ao clicar em #botao-sair o usuário volta para /login e a chave clinica.token deixa de existir
   */
  test('botão sair encerra a sessão e apaga o token', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', 'Senha123');
    await page.click('#botao-sair');

    await page.waitForURL((url) => url.pathname.startsWith('/login'));
    const token = await page.evaluate(() => localStorage.getItem('clinica.token'));
    expect(token).toBeNull();
    await expect(page.locator('#login-entrar')).toBeVisible();
  });

  /**
   * @caso CT-E2E-005
   * @nivel e2e
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2, RNF02
   * @objetivo Verificar que acessar /recepcao sem sessão redireciona para a tela de login
   * @resultadoEsperado A rota protegida não renderiza e o navegador para em /login
   */
  test('acesso a /recepcao sem sessão leva para /login', async ({ page }) => {
    await page.goto('/recepcao');

    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('#login-entrar')).toBeVisible();
  });

  /**
   * @caso CT-E2E-006
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RNF06
   * @objetivo Verificar que uma rota inexistente mostra a página 404 com mensagem em português
   * @resultadoEsperado Aparecem o texto "404", "Esta página não existe ou foi movida." e o link "Voltar ao início"
   */
  test('rota inexistente mostra página 404 em português', async ({ page }) => {
    await page.goto('/pagina-que-nao-existe');

    await expect(page.locator('.nao-encontrado')).toContainText('404');
    await expect(page.locator('.nao-encontrado')).toContainText('Esta página não existe ou foi movida.');
    await expect(page.getByRole('link', { name: 'Voltar ao início' })).toBeVisible();
  });
});
