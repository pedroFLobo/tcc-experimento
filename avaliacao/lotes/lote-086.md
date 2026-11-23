# lote-086

Modelo: gemini

Avalie com a skill `juiz-casos-teste` **somente os 4 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| gemini-0176 | CT-E2E-001 | deve realizar login de paciente com sucesso e redirecionar para /paciente | passou |  |
| gemini-0177 | CT-E2E-002 | deve exibir mensagem de erro ao errar a senha | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed Locator: locator('#login-mensagem [role="alert"]') Expected: visible T |
| gemini-0178 | CT-E2E-003 | deve alertar sobre bloqueio de conta na 5ª tentativa inválida | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed Locator: locator('#login-mensagem [role="alert"]') Expected: visible T |
| gemini-0179 | CT-E2E-004 | deve permitir que novo paciente realize auto-cadastro e acesse o sistema | falhou | Error: [2mexpect([22m[31mpage[39m[2m).[22mtoHaveURL[2m([22m[32mexpected[39m[2m)[22m failed Expected pattern: [32m/\/paciente/[39m Received string: |

## Arquivo: e2e/login-e-autenticacao.spec.js

```js
import { test, expect } from '@playwright/test';

test.describe('E2E: Autenticação e Acesso', () => {
  /**
   * @caso CT-E2E-001
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF01.1, RNF06
   * @objetivo Fazer login como paciente com credenciais válidas e redirecionar para a área do paciente
   * @resultadoEsperado URL direcionada para /paciente e mensagem de boas-vindas visível
   */
  test('deve realizar login de paciente com sucesso e redirecionar para /paciente', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Entrar · Clínica\+/);

    await page.fill('#login-email', 'ana@email.com');
    await page.fill('#login-senha', 'Senha123');
    await page.click('#login-entrar');

    await expect(page).toHaveURL(/\/paciente/);
    await expect(page.locator('.toast[data-tipo="sucesso"]')).toBeVisible();
  });

  /**
   * @caso CT-E2E-002
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF01.1, RNF06
   * @objetivo Exibir erro em português ao tentar login com senha incorreta
   * @resultadoEsperado Alerta em tela com mensagem de erro amigável
   */
  test('deve exibir mensagem de erro ao errar a senha', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#login-email', 'ana@email.com');
    await page.fill('#login-senha', 'SenhaErrada123');
    await page.click('#login-entrar');

    const alerta = page.locator('#login-mensagem [role="alert"]');
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText('E-mail ou senha inválidos');
  });

  /**
   * @caso CT-E2E-003
   * @nivel e2e
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04, RNF06
   * @objetivo Bloquear a conta na interface após 5 tentativas consecutivas com senha inválida
   * @resultadoEsperado Exibe mensagem alertando sobre conta bloqueada
   */
  test('deve alertar sobre bloqueio de conta na 5ª tentativa inválida', async ({ page }) => {
    await page.goto('/login');

    for (let i = 1; i <= 5; i++) {
      await page.fill('#login-email', 'ana@email.com');
      await page.fill('#login-senha', `Errada${i}`);
      await page.click('#login-entrar');
      await page.waitForTimeout(100);
    }

    const alerta = page.locator('#login-mensagem [role="alert"]');
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText(/Conta bloqueada por excesso de tentativas/i);
  });

  /**
   * @caso CT-E2E-004
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.1, RNF06
   * @objetivo Realizar auto-cadastro de novo paciente e entrar diretamente no sistema
   * @resultadoEsperado Cadastro realizado e redirecionamento para /paciente com toast de sucesso
   */
  test('deve permitir que novo paciente realize auto-cadastro e acesse o sistema', async ({ page }) => {
    await page.goto('/cadastro');
    await expect(page).toHaveTitle(/Criar conta · Clínica\+/);

    await page.fill('#cadastro-nome', 'Bruno Alcantara');
    await page.fill('#cadastro-email', 'bruno.alcantara@email.com');
    await page.fill('#cadastro-senha', 'SenhaForte123');
    await page.fill('#cadastro-cpf', '730.825.290-77');
    await page.fill('#cadastro-nascimento', '1992-08-15');
    await page.fill('#cadastro-telefone', '(11) 97777-6666');

    await page.click('#cadastro-enviar');

    await expect(page).toHaveURL(/\/paciente/);
    await expect(page.locator('.toast[data-tipo="sucesso"]')).toBeVisible();
  });
});
```
