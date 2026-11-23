# lote-114

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 8 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0312 | CT-E2E-013 | cadastrar especialidade | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed Locator: locator('.toast[data-tipo="sucesso"]') Ex |
| glm-0313 | CT-E2E-014 | cadastrar médico | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed Locator: locator('.toast[data-tipo="sucesso"]') Ex |
| glm-0314 | CT-E2E-015 | cadastrar paciente | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed Locator: locator('.toast[data-tipo="sucesso"]') Ex |
| glm-0315 | CT-E2E-016 | agendar consulta para um paciente | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed Locator: locator('.toast[data-tipo="sucesso"]') Ex |
| glm-0316 | CT-E2E-017 | confirmar presença pela listagem | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed Locator: locator('.toast[data-tipo="sucesso"]') Ex |
| glm-0317 | CT-E2E-018 | cancelar consulta com motivo obrigatório | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed Locator: locator('.toast[data-tipo="sucesso"]') Ex |
| glm-0318 | CT-E2E-019 | filtrar consultas por status | passou |  |
| glm-0319 | CT-E2E-020 | gerar relatório do período | passou |  |

## Arquivo: e2e/recepcao-fluxo.spec.js

```js
// Testes E2E do fluxo da recepção: cadastros, agendamento, ciclo de vida, filtros e relatório (RF02–RF04, RF08–RF11).
// Banco recriado antes deste arquivo; os testes rodam em sequência e compartilham o banco criado aqui.
import { test, expect } from '@playwright/test';

const SENHA = 'Senha123';

// Entra como recepção e navega pelo item de menu informado.
async function entrarComoRecepcao(page, destino = null) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('recepcao@clinica.com');
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('**/recepcao');
  if (destino) await page.click(destino);
}

test.describe('Cadastros da recepção (RF02–RF04)', () => {
  /**
   * @caso CT-E2E-013
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF03.1, RN09
   * @objetivo Cadastrar uma nova especialidade com nome e preço base
   * @resultadoEsperado toast 'Especialidade cadastrada' com 'Oftalmologia disponível por R$ 180,00.' e a linha na tabela
   */
  test('cadastrar especialidade', async ({ page }) => {
    await entrarComoRecepcao(page, '#menu-especialidades');
    await page.fill('#especialidade-nome', 'Oftalmologia');
    await page.fill('#especialidade-preco', '180');
    await page.click('#especialidade-cadastrar');
    await expect(page.locator('.toast[data-tipo="sucesso"]')).toContainText('Oftalmologia disponível por R$ 180,00.');
    await expect(page.locator('#tabela-especialidades')).toContainText('Oftalmologia');
  });

  /**
   * @caso CT-E2E-014
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF04.1
   * @objetivo Cadastrar um médico na especialidade criada no caso 013
   * @resultadoEsperado toast 'Médico cadastrado' e 'Dr. Otávio Prado' listado na equipe com CRM '44556/SP'
   */
  test('cadastrar médico', async ({ page }) => {
    await entrarComoRecepcao(page, '#menu-medicos');
    await page.fill('#medico-nome', 'Dr. Otávio Prado');
    await page.fill('#medico-email', 'otavio@clinica.com');
    await page.fill('#medico-senha', SENHA);
    await page.fill('#medico-crm', '44556/SP');
    await page.selectOption('#medico-especialidade', '5');
    await page.click('#medico-cadastrar');
    await expect(page.locator('.toast[data-tipo="sucesso"]')).toContainText('Médico cadastrado');
    const linha = page.locator('#tabela-medicos tr', { hasText: 'Dr. Otávio Prado' });
    await expect(linha).toContainText('44556/SP');
    await expect(linha).toContainText('Oftalmologia');
  });

  /**
   * @caso CT-E2E-015
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.2, RF02.3, RN03
   * @objetivo Cadastrar um paciente com CPF válido pela tela da recepção
   * @resultadoEsperado toast 'Paciente cadastrado' com 'Marta Ribeiro já pode agendar consultas.' e a linha na tabela
   */
  test('cadastrar paciente', async ({ page }) => {
    await entrarComoRecepcao(page, '#menu-pacientes');
    await page.fill('#paciente-nome', 'Marta Ribeiro');
    await page.fill('#paciente-email', 'marta@email.com');
    await page.fill('#paciente-senha', SENHA);
    await page.fill('#paciente-cpf', '168.995.350-09');
    await page.fill('#paciente-nascimento', '1985-03-30');
    await page.click('#paciente-enviar');
    await expect(page.locator('.toast[data-tipo="sucesso"]')).toContainText('Marta Ribeiro já pode agendar consultas.');
    await expect(page.locator('#tabela-pacientes')).toContainText('Marta Ribeiro');
  });

  /**
   * @caso CT-E2E-016
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.1, RF08.2
   * @objetivo Agendar uma consulta em nome do paciente Ana com médico e horário escolhidos
   * @resultadoEsperado toast 'Consulta agendada' com 'Ana Pereira com Dr. Carlos Almeida em 20/10/2026 08:00 (R$ 150,00).'
   */
  test('agendar consulta para um paciente', async ({ page }) => {
    await entrarComoRecepcao(page, '#menu-agendar');
    await page.selectOption('#agendar-paciente', '1');
    await page.selectOption('#agendar-medico', '1');
    await page.fill('#agendar-data', '2026-10-20');
    await page.click('#agendar-horarios [data-inicio="2026-10-20 08:00"]');
    await page.click('#agendar-confirmar');
    await expect(page.locator('.toast[data-tipo="sucesso"]')).toContainText('Ana Pereira com Dr. Carlos Almeida em 20/10/2026 08:00 (R$ 150,00).');
  });
});

test.describe('Ciclo de vida, filtros e relatório na recepção (RF09–RF11)', () => {
  /**
   * @caso CT-E2E-017
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Confirmar a presença do paciente pela listagem da recepção
   * @resultadoEsperado toast 'Presença de Ana Pereira confirmada.' e status da linha muda para 'Confirmada'
   */
  test('confirmar presença pela listagem', async ({ page }) => {
    await entrarComoRecepcao(page, '#menu-consultas');
    const linha = page.locator('tr[data-consulta-id]', { hasText: 'Ana Pereira' });
    await linha.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.locator('.toast[data-tipo="sucesso"]')).toContainText('Presença de Ana Pereira confirmada.');
    await expect(linha.locator('.status[data-status="CONFIRMADA"]')).toHaveText('Confirmada');
  });

  /**
   * @caso CT-E2E-018
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Cancelar a consulta pela recepção informando o motivo obrigatório
   * @resultadoEsperado diálogo pede o motivo, '#texto-confirmar' envia 'Consulta desistida pelo paciente.' e o toast 'Consulta cancelada.' aparece com status 'Cancelada'
   */
  test('cancelar consulta com motivo obrigatório', async ({ page }) => {
    await entrarComoRecepcao(page, '#menu-consultas');
    const linha = page.locator('tr[data-consulta-id]', { hasText: 'Ana Pereira' });
    await linha.getByRole('button', { name: 'Cancelar' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toContainText('Cancelar consulta');
    await expect(dialogo).toContainText('O motivo é obrigatório.');
    await page.fill('#texto-campo', 'Consulta desistida pelo paciente.');
    await page.click('#texto-confirmar');
    await expect(page.locator('.toast[data-tipo="sucesso"]')).toContainText('Consulta cancelada.');
    await expect(linha.locator('.status[data-status="CANCELADA"]')).toHaveText('Cancelada');
  });

  /**
   * @caso CT-E2E-019
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Filtrar a listagem por status e conferir contagens coerentes
   * @resultadoEsperado status CANCELADA mostra '1 consulta(s) encontrada(s).' com a linha de Ana; status CONFIRMADA mostra '0 consulta(s) encontrada(s).'
   */
  test('filtrar consultas por status', async ({ page }) => {
    await entrarComoRecepcao(page, '#menu-consultas');
    await page.selectOption('#filtro-status', 'CANCELADA');
    await page.click('#filtro-aplicar');
    await expect(page.getByText('1 consulta(s) encontrada(s).')).toBeVisible();
    await expect(page.locator('tr[data-consulta-id]', { hasText: 'Ana Pereira' })).toContainText('Cancelada');
    await page.selectOption('#filtro-status', 'CONFIRMADA');
    await page.click('#filtro-aplicar');
    await expect(page.getByText('0 consulta(s) encontrada(s).')).toBeVisible();
    await expect(page.locator('tr[data-consulta-id]')).toHaveCount(0);
  });

  /**
   * @caso CT-E2E-020
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Gerar o relatório do período com as consultas cadastradas neste arquivo
   * @resultadoEsperado '#relatorio-resultado' aparece com total 1 por status e faturamento 'R$ 0,00' (nenhuma consulta realizada)
   */
  test('gerar relatório do período', async ({ page }) => {
    await entrarComoRecepcao(page, '#menu-relatorio');
    await page.fill('#relatorio-inicio', '2026-10-19');
    await page.fill('#relatorio-fim', '2026-10-31');
    await page.click('#relatorio-gerar');
    await expect(page.locator('#relatorio-resultado')).toContainText('Consultas por status');
    await expect(page.locator('#relatorio-status .indicador.destaque strong')).toHaveText('1');
    await expect(page.locator('#relatorio-faturamento')).toHaveText('R$ 0,00');
  });
});
```
