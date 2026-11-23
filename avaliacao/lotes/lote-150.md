# lote-150

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 3 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0426 | CT-E2E-025 | recepção cadastra novo paciente e ele aparece na lista | passou |  |
| mimo-0427 | CT-E2E-026 | e-mail duplicado é recusado e a lista permanece com quatro pacientes | passou |  |
| mimo-0428 | CT-E2E-027 | recepção desativa paciente e a situação vira Inativo | passou |  |

## Arquivo: e2e/recepcao-pacientes.spec.js

```js
// Casos de teste E2E: cadastro e gestão de pacientes pela recepção.
// Cobrem CT-E2E-025 a CT-E2E-027. Os casos compartilham o banco do arquivo em
// sequência: o caso 025 cadastra a paciente que os demais utilizam.

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

test.describe('Pacientes da recepção', () => {
  /**
   * @caso CT-E2E-025
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.2, RF02.3
   * @objetivo Verificar o cadastro completo de um novo paciente pela recepção
   * @resultadoEsperado Aparece o aviso "Paciente cadastrado" e a paciente Marina Costa surge na tabela com seu e-mail
   */
  test('recepção cadastra novo paciente e ele aparece na lista', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', 'Senha123');
    await page.click('#menu-pacientes');

    await page.fill('#paciente-nome', 'Marina Costa');
    await page.fill('#paciente-email', 'marina@email.com');
    await page.fill('#paciente-senha', 'Senha123');
    await page.fill('#paciente-cpf', '12345678909');
    await page.fill('#paciente-nascimento', '1985-03-10');
    await page.fill('#paciente-telefone', '(31) 98888-7777');
    await page.click('#paciente-enviar');

    await expect(toast(page, 'Paciente cadastrado')).toBeVisible();
    const linha = page.locator('#tabela-pacientes tbody tr').filter({ hasText: 'marina@email.com' });
    await expect(linha).toHaveCount(1);
    await expect(linha).toContainText('Marina Costa');
  });

  /**
   * @caso CT-E2E-026
   * @nivel e2e
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RN01, RF02.2
   * @objetivo Verificar que um e-mail já cadastrado é recusado e não duplica o registro na lista
   * @resultadoEsperado O formulário exibe "E-mail já cadastrado." e a tabela permanece com 4 pacientes
   */
  test('e-mail duplicado é recusado e a lista permanece com quatro pacientes', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', 'Senha123');
    await page.goto('/recepcao/pacientes');

    await page.fill('#paciente-nome', 'Marina Oliveira');
    await page.fill('#paciente-email', 'marina@email.com');
    await page.fill('#paciente-senha', 'Senha123');
    await page.fill('#paciente-cpf', '93541134780');
    await page.fill('#paciente-nascimento', '1990-07-21');
    await page.click('#paciente-enviar');

    await expect(page.locator('#paciente-mensagem')).toContainText('E-mail já cadastrado.');
    await expect(page.locator('#tabela-pacientes tbody tr')).toHaveCount(4);
  });

  /**
   * @caso CT-E2E-027
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.2, RN21
   * @objetivo Verificar a desativação de um paciente pela recepção
   * @resultadoEsperado Aparece o aviso "Marina Costa foi desativado." e a situação da linha muda para Inativo
   */
  test('recepção desativa paciente e a situação vira Inativo', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', 'Senha123');
    await page.goto('/recepcao/pacientes');

    const linha = page.locator('#tabela-pacientes tbody tr').filter({ hasText: 'marina@email.com' });
    await expect(linha).toHaveCount(1);
    await linha.getByRole('button', { name: 'Desativar' }).click();

    await expect(toast(page, 'Marina Costa foi desativado.')).toBeVisible();
    await expect(linha).toContainText('Inativo');
  });
});
```
