# lote-113

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 6 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0306 | CT-E2E-001 | login válido do paciente abre a área dele | passou |  |
| glm-0307 | CT-E2E-002 | login válido do médico abre a agenda | passou |  |
| glm-0308 | CT-E2E-003 | login válido da recepção abre a central | passou |  |
| glm-0309 | CT-E2E-004 | senha errada mostra alerta e permanece no login | passou |  |
| glm-0310 | CT-E2E-005 | logout limpa a sessão e volta ao login | passou |  |
| glm-0311 | CT-E2E-006 | rota protegida sem sessão redireciona ao login | passou |  |

## Arquivo: e2e/autenticacao.spec.js

```js
// Testes E2E de autenticação e proteção de rotas (RF01, RNF06).
// Banco recriado com os dados de exemplo antes deste arquivo; relógio fixo em 2026-10-19 08:00.
import { test, expect } from '@playwright/test';

const SENHA = 'Senha123';

// Entra pelo formulário e espera cair na área do perfil.
async function entrar(page, email, senha = SENHA) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test.describe('Autenticação (RF01)', () => {
  /**
   * @caso CT-E2E-001
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1, RF01.3
   * @objetivo Autenticar uma paciente pelo formulário e abrir a área do paciente com os dados dela
   * @resultadoEsperado navegação para /paciente, h1 'Minhas consultas', 'Ana Pereira' no cartão de usuário e token em localStorage
   */
  test('login válido do paciente abre a área dele', async ({ page }) => {
    await entrar(page, 'ana@email.com');
    await page.waitForURL('**/paciente');
    await expect(page.getByRole('heading', { level: 1, name: 'Minhas consultas' })).toBeVisible();
    await expect(page.locator('#nome-usuario')).toHaveText('Ana Pereira');
    const token = await page.evaluate(() => localStorage.getItem('clinica.token'));
    expect(token).toBeTruthy();
  });

  /**
   * @caso CT-E2E-002
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1
   * @objetivo Autenticar um médico e abrir a agenda dele
   * @resultadoEsperado navegação para /medico, h1 'Agenda' e 'Dr. Carlos Almeida' no cartão de usuário
   */
  test('login válido do médico abre a agenda', async ({ page }) => {
    await entrar(page, 'carlos@clinica.com');
    await page.waitForURL('**/medico');
    await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
    await expect(page.locator('#nome-usuario')).toHaveText('Dr. Carlos Almeida');
  });

  /**
   * @caso CT-E2E-003
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1
   * @objetivo Autenticar a recepção e abrir a central de consultas
   * @resultadoEsperado navegação para /recepcao, h1 'Consultas' e 'Rita Recepção' no cartão de usuário
   */
  test('login válido da recepção abre a central', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com');
    await page.waitForURL('**/recepcao');
    await expect(page.getByRole('heading', { level: 1, name: 'Consultas' })).toBeVisible();
    await expect(page.locator('#nome-usuario')).toHaveText('Rita Recepção');
  });

  /**
   * @caso CT-E2E-004
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF01.1, RNF06
   * @objetivo Recusar senha errada com mensagem legível e sem sair do formulário
   * @resultadoEsperado alerta 'E-mail ou senha inválidos.' exibido em /login e nenhum token gravado
   */
  test('senha errada mostra alerta e permanece no login', async ({ page }) => {
    await entrar(page, 'ana@email.com', 'Errada123');
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos.');
    expect(new URL(page.url()).pathname).toBe('/login');
    const token = await page.evaluate(() => localStorage.getItem('clinica.token'));
    expect(token).toBeNull();
  });

  /**
   * @caso CT-E2E-005
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1
   * @objetivo Encerrar a sessão pelo botão Sair do cabeçalho
   * @resultadoEsperado retorno a /login e a chave 'clinica.token' removida do localStorage
   */
  test('logout limpa a sessão e volta ao login', async ({ page }) => {
    await entrar(page, 'ana@email.com');
    await page.waitForURL('**/paciente');
    await page.click('#botao-sair');
    await page.waitForURL('**/login');
    await expect(page.getByLabel('E-mail')).toBeVisible();
    const token = await page.evaluate(() => localStorage.getItem('clinica.token'));
    expect(token).toBeNull();
  });

  /**
   * @caso CT-E2E-006
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.2
   * @objetivo Impedir acesso direto a área protegida sem sessão
   * @resultadoEsperado /paciente sem login redireciona para /login, onde o formulário é exibido
   */
  test('rota protegida sem sessão redireciona ao login', async ({ page }) => {
    await page.goto('/paciente');
    await page.waitForURL('**/login');
    await expect(page.getByLabel('E-mail')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/login');
  });
});
```
