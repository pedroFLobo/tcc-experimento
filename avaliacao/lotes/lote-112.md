# lote-112

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 6 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0300 | CT-E2E-007 | agendamento completo com toast de sucesso | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed Locator: locator('.toast[data-tipo="sucesso"]') Ex |
| glm-0301 | CT-E2E-008 | nova consulta aparece em Minhas consultas | passou |  |
| glm-0302 | CT-E2E-009 | confirmar presença pela listagem | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed Locator: locator('.toast[data-tipo="sucesso"]') Ex |
| glm-0303 | CT-E2E-010 | desistir do cancelamento mantém a consulta | passou |  |
| glm-0304 | CT-E2E-011 | remarcar para outro horário do mesmo médico | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed Locator: locator('.toast[data-tipo="sucesso"]') Ex |
| glm-0305 | CT-E2E-012 | cancelar consulta com diálogo de confirmação | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed Locator: locator('.toast[data-tipo="sucesso"]') Ex |

## Arquivo: e2e/agendamento-paciente.spec.js

```js
// Testes E2E do agendamento e ciclo de vida pelo paciente (RF07–RF10, RN16, RN22, RN25–RN27).
// Banco recriado antes deste arquivo; os testes rodam em sequência e compartilham o banco criado aqui:
// o caso 007 agenda a consulta que os casos seguintes inspecionam, confirmam, remarcam e cancelam.
import { test, expect } from '@playwright/test';

const SENHA = 'Senha123';

// Entra como Ana e abre a página de agendamento.
async function abrirAgendamento(page) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('ana@email.com');
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('**/paciente');
  await page.click('#menu-agendar');
}

// Entra como Ana e abre a listagem de consultas.
async function abrirConsultas(page) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('ana@email.com');
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('**/paciente');
  await page.click('#menu-consultas');
  return page.locator('tr[data-consulta-id]', { hasText: 'Dr. Carlos Almeida' });
}

test.describe('Agendamento pelo paciente (RF08)', () => {
  /**
   * @caso CT-E2E-007
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1, RF08.1, RF08.2, RN16
   * @objetivo Percorrer o fluxo completo especialidade, médico, data, horário e confirmação
   * @resultadoEsperado toast 'Consulta agendada' com 'Dr. Carlos Almeida em 20/10/2026 08:00 (R$ 150,00).'
   */
  test('agendamento completo com toast de sucesso', async ({ page }) => {
    await abrirAgendamento(page);
    await page.selectOption('#agendar-especialidade', '1');
    await page.selectOption('#agendar-medico', '1');
    await page.fill('#agendar-data', '2026-10-20');
    await page.click('#agendar-horarios [data-inicio="2026-10-20 08:00"]');
    await expect(page.locator('#agendar-resumo')).toContainText('Dr. Carlos Almeida');
    await page.click('#agendar-confirmar');
    await expect(page.locator('.toast[data-tipo="sucesso"]')).toContainText('Dr. Carlos Almeida em 20/10/2026 08:00 (R$ 150,00).');
  });

  /**
   * @caso CT-E2E-008
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.1, RN22
   * @objetivo Conferir a consulta agendada no caso 007 na listagem do paciente
   * @resultadoEsperado linha com '20/10/2026 08:00', 'R$ 150,00', status 'Agendada' e contagem '1 consulta(s) ativa(s) de 1 no total.'
   */
  test('nova consulta aparece em Minhas consultas', async ({ page }) => {
    const linha = await abrirConsultas(page);
    await expect(linha).toContainText('20/10/2026 08:00');
    await expect(linha).toContainText('R$ 150,00');
    await expect(linha.locator('.status[data-status="AGENDADA"]')).toHaveText('Agendada');
    await expect(page.getByText('1 consulta(s) ativa(s) de 1 no total.')).toBeVisible();
  });

  /**
   * @caso CT-E2E-009
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Confirmar presença dentro da janela de 48 horas
   * @resultadoEsperado toast 'Presença confirmada para 20/10/2026 08:00.' e status da linha muda para 'Confirmada'
   */
  test('confirmar presença pela listagem', async ({ page }) => {
    const linha = await abrirConsultas(page);
    await linha.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.locator('.toast[data-tipo="sucesso"]')).toContainText('Presença confirmada para 20/10/2026 08:00.');
    await expect(linha.locator('.status[data-status="CONFIRMADA"]')).toHaveText('Confirmada');
  });

  /**
   * @caso CT-E2E-010
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF09.2, RNF06
   * @objetivo Permitir desistir do cancelamento no diálogo de confirmação
   * @resultadoEsperado 'Manter consulta' fecha o diálogo, a consulta permanece 'Confirmada' e nenhum toast de cancelamento aparece
   */
  test('desistir do cancelamento mantém a consulta', async ({ page }) => {
    const linha = await abrirConsultas(page);
    await linha.getByRole('button', { name: 'Cancelar' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toContainText('Cancelar consulta?');
    await dialogo.getByRole('button', { name: 'Manter consulta' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(linha.locator('.status[data-status="CONFIRMADA"]')).toHaveText('Confirmada');
    await expect(page.locator('.toast')).toHaveCount(0);
  });

  /**
   * @caso CT-E2E-011
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.3, RN27
   * @objetivo Remarcar a consulta para outro horário livre do mesmo médico
   * @resultadoEsperado toast 'Nova data: 20/10/2026 11:30.' e a linha passa a exibir o novo horário
   */
  test('remarcar para outro horário do mesmo médico', async ({ page }) => {
    const linha = await abrirConsultas(page);
    await linha.getByRole('button', { name: 'Remarcar' }).click();
    const dialogo = page.getByRole('dialog');
    await dialogo.locator('input[type="date"]').fill('2026-10-20');
    await dialogo.locator('[data-inicio="2026-10-20 11:30"]').click();
    await dialogo.getByRole('button', { name: 'Confirmar nova data' }).click();
    await expect(page.locator('.toast[data-tipo="sucesso"]')).toContainText('Nova data: 20/10/2026 11:30.');
    await expect(linha).toContainText('20/10/2026 11:30');
  });

  /**
   * @caso CT-E2E-012
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Agendar uma segunda consulta em outra especialidade e cancelá-la com mais de 24 horas de antecedência
   * @resultadoEsperado agendamento de Cardiologia com 'R$ 300,00' e, após 'Sim, cancelar', toast 'Sua consulta foi cancelada.' e status 'Cancelada'
   */
  test('cancelar consulta com diálogo de confirmação', async ({ page }) => {
    await abrirAgendamento(page);
    await page.selectOption('#agendar-especialidade', '2');
    await page.selectOption('#agendar-medico', '2');
    await page.fill('#agendar-data', '2026-10-21');
    await page.click('#agendar-horarios [data-inicio="2026-10-21 09:00"]');
    await page.click('#agendar-confirmar');
    await expect(page.locator('.toast[data-tipo="sucesso"]')).toContainText('Dra. Beatriz Souza em 21/10/2026 09:00 (R$ 300,00).');
    await page.click('#menu-consultas');
    const linha = page.locator('tr[data-consulta-id]', { hasText: 'Dra. Beatriz Souza' });
    await linha.getByRole('button', { name: 'Cancelar' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toContainText('Cancelar consulta?');
    await dialogo.getByRole('button', { name: 'Sim, cancelar' }).click();
    await expect(page.locator('.toast[data-tipo="sucesso"]')).toContainText('Sua consulta foi cancelada.');
    await expect(linha.locator('.status[data-status="CANCELADA"]')).toHaveText('Cancelada');
  });
});
```
