# lote-085

Modelo: gemini

Avalie com a skill `juiz-casos-teste` **somente os 4 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| gemini-0172 | CT-E2E-013 | deve acessar a tela de consultas da recepção e exibir filtros | passou |  |
| gemini-0173 | CT-E2E-014 | deve cadastrar nova especialidade com nome e preço base | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed Locator: locator('#especialidade-mensagem [role="s |
| gemini-0174 | CT-E2E-015 | deve cadastrar novo médico na equipe | falhou | Error: page.selectOption: options[0].label: expected string, got object 66 \| await page.fill('#medico-senha', 'SenhaForte123'); 67 \| await page.fill('#medico- |
| gemini-0175 | CT-E2E-016 | deve gerar relatório com indicadores para um período selecionado | passou |  |

## Arquivo: e2e/fluxo-recepcao.spec.js

```js
import { test, expect } from '@playwright/test';

test.describe('E2E: Fluxo da Recepção', () => {
  test.beforeEach(async ({ page }) => {
    // Login inicial como Rita Recepção
    await page.goto('/login');
    await page.fill('#login-email', 'recepcao@clinica.com');
    await page.fill('#login-senha', 'Senha123');
    await page.click('#login-entrar');
    await expect(page).toHaveURL(/\/recepcao/);
  });

  /**
   * @caso CT-E2E-013
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Visualizar a listagem geral de consultas e filtros na área de recepção
   * @resultadoEsperado Filtros e tabela de consultas visíveis
   */
  test('deve acessar a tela de consultas da recepção e exibir filtros', async ({ page }) => {
    await expect(page.locator('#filtro-inicio')).toBeVisible();
    await expect(page.locator('#filtro-status')).toBeVisible();
    await expect(page.locator('#filtro-medico')).toBeVisible();
  });

  /**
   * @caso CT-E2E-014
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.1, RN09
   * @objetivo Cadastrar nova especialidade médica na clínica
   * @resultadoEsperado Especialidade cadastrada e adicionada à tabela de especialidades
   */
  test('deve cadastrar nova especialidade com nome e preço base', async ({ page }) => {
    await page.click('#menu-especialidades');
    await expect(page).toHaveURL(/\/recepcao\/especialidades/);

    await page.fill('#especialidade-nome', 'Pneumologia');
    await page.fill('#especialidade-preco', '270');
    await page.click('#especialidade-cadastrar');

    await expect(page.locator('#especialidade-mensagem [role="status"]')).toContainText(/Pneumologia disponível/i);

    const tabela = page.locator('#tabela-especialidades');
    await expect(tabela).toContainText('Pneumologia');
  });

  /**
   * @caso CT-E2E-015
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04.1, RN07, RN08
   * @objetivo Cadastrar novo médico associado a uma especialidade
   * @resultadoEsperado Médico salvo com sucesso e exibido na lista da equipe médica
   */
  test('deve cadastrar novo médico na equipe', async ({ page }) => {
    await page.click('#menu-medicos');
    await expect(page).toHaveURL(/\/recepcao\/medicos/);

    await page.fill('#medico-nome', 'Dr. Gustavo Mendes');
    await page.fill('#medico-email', 'gustavo.mendes@clinica.com');
    await page.fill('#medico-senha', 'SenhaForte123');
    await page.fill('#medico-crm', '445566/SP');
    await page.selectOption('#medico-especialidade', { label: /Clínica Geral/i });

    await page.click('#medico-cadastrar');

    await expect(page.locator('#medico-mensagem [role="status"]')).toContainText(/foi adicionado à equipe/i);

    const tabela = page.locator('#tabela-medicos');
    await expect(tabela).toContainText('Dr. Gustavo Mendes');
    await expect(tabela).toContainText('445566/SP');
  });

  /**
   * @caso CT-E2E-016
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF11.1
   * @objetivo Emitir relatório administrativo de consultas por status e faturamento
   * @resultadoEsperado Resultados do relatório são renderizados com totais
   */
  test('deve gerar relatório com indicadores para um período selecionado', async ({ page }) => {
    await page.click('#menu-relatorio');
    await expect(page).toHaveURL(/\/recepcao\/relatorio/);

    await page.fill('#relatorio-inicio', '2026-10-01');
    await page.fill('#relatorio-fim', '2026-10-31');
    await page.click('#relatorio-gerar');

    const resultado = page.locator('#relatorio-resultado');
    await expect(resultado).toBeVisible();
    await expect(resultado).toContainText('Consultas por status');
  });
});
```
