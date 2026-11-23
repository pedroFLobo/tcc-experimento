# lote-043

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 14 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0713 | CT-E2E-059 | agenda vazia mostra mensagem orientativa | passou |  |
| deepseek-0714 | CT-E2E-060 | médico vê a consulta marcada pelo paciente | passou |  |
| deepseek-0715 | CT-E2E-061 | médico não vê a agenda de outro médico | passou |  |
| deepseek-0716 | CT-E2E-062 | grade semanal é exibida com os blocos do médico | passou |  |
| deepseek-0717 | CT-E2E-063 | médico adiciona bloco à grade | passou |  |
| deepseek-0718 | CT-E2E-064 | médico remove bloco da grade | passou |  |
| deepseek-0719 | CT-E2E-065 | grade com horário inválido é recusada | passou |  |
| deepseek-0720 | CT-E2E-066 | médico cria bloqueio de agenda | passou |  |
| deepseek-0721 | CT-E2E-067 | bloqueio remove os horários livres | passou |  |
| deepseek-0722 | CT-E2E-068 | médico remove bloqueio de agenda | passou |  |
| deepseek-0723 | CT-E2E-069 | bloqueio com fim antes do início é recusado | passou |  |
| deepseek-0724 | CT-E2E-070 | bloqueio no passado é recusado | passou |  |
| deepseek-0725 | CT-E2E-071 | médico cancela consulta da própria agenda | passou |  |
| deepseek-0726 | CT-E2E-072 | médico não registra atendimento antes do horário | passou |  |

## Arquivo: e2e/medico-agenda.spec.js

```js
import { test, expect } from '@playwright/test';

const SENHA = 'Senha123';

async function entrar(page, email, destino) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-senha').fill(SENHA);
  await page.locator('#login-entrar').click();
  await expect(page).toHaveURL(new RegExp(`${destino}$`));
}

async function sair(page) {
  await page.locator('#botao-sair').click();
  await expect(page).toHaveURL(/\/login$/);
}

async function agendar(page, { especialidade, medico, data, hora }) {
  await page.locator('#menu-agendar').click();
  await page.locator('#agendar-especialidade').selectOption(especialidade);
  await page.locator('#agendar-medico').selectOption(medico);
  await page.locator('#agendar-data').fill(data);
  await page.locator(`#agendar-horarios [data-inicio="${data} ${hora}"]`).click();
  await page.locator('#agendar-confirmar').click();
  await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Consulta agendada' })).toBeVisible();
}

test.describe('Agenda do médico', () => {
  /**
   * @caso CT-E2E-059
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo apreensibilidade
   * @requisito RF10.2
   * @objetivo Abrir a agenda de um dia sem atendimentos
   * @resultadoEsperado A tabela mostra a mensagem de nenhuma consulta para os filtros
   */
  test('agenda vazia mostra mensagem orientativa', async ({ page }) => {
    await entrar(page, 'carlos@clinica.com', '/medico');
    await page.locator('#agenda-data').fill('2026-10-19');
    await expect(page.locator('#tabela-agenda')).toContainText('Nenhuma consulta para os filtros escolhidos.');
  });

  /**
   * @caso CT-E2E-060
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.2
   * @objetivo Ver na agenda do médico uma consulta agendada pelo paciente
   * @resultadoEsperado O atendimento de Ana aparece no dia escolhido com status Agendada
   */
  test('médico vê a consulta marcada pelo paciente', async ({ page }) => {
    await entrar(page, 'ana@email.com', '/paciente');
    await agendar(page, { especialidade: '1', medico: '1', data: '2026-10-19', hora: '10:00' });
    await sair(page);
    await entrar(page, 'carlos@clinica.com', '/medico');
    await page.locator('#agenda-data').fill('2026-10-19');
    const linha = page.locator('#tabela-agenda tbody tr', { hasText: 'Ana Pereira' });
    await expect(linha).toContainText('19/10/2026 10:00');
    await expect(linha.locator('[data-status="AGENDADA"]')).toBeVisible();
  });

  /**
   * @caso CT-E2E-061
   * @nivel e2e
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30, RF10.2
   * @objetivo Confirmar que o médico não vê consultas de outro médico
   * @resultadoEsperado A agenda de Carlos em 21/10 não mostra a consulta de Ana com Beatriz
   */
  test('médico não vê a agenda de outro médico', async ({ page }) => {
    await entrar(page, 'ana@email.com', '/paciente');
    await agendar(page, { especialidade: '2', medico: '2', data: '2026-10-21', hora: '10:30' });
    await sair(page);
    await entrar(page, 'carlos@clinica.com', '/medico');
    await page.locator('#agenda-data').fill('2026-10-21');
    await expect(page.locator('#tabela-agenda')).toContainText('Nenhuma consulta para os filtros escolhidos.');
    await expect(page.locator('#tabela-agenda tbody tr', { hasText: 'Ana Pereira' })).toHaveCount(0);
  });

  /**
   * @caso CT-E2E-062
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.1
   * @objetivo Carregar a grade semanal do médico
   * @resultadoEsperado A grade mostra os dez blocos configurados, começando pela segunda 08:00–12:00
   */
  test('grade semanal é exibida com os blocos do médico', async ({ page }) => {
    await entrar(page, 'carlos@clinica.com', '/medico');
    await page.locator('#menu-grade').click();
    const linhas = page.locator('#tabela-grade tbody tr');
    await expect(linhas).toHaveCount(10);
    const primeira = linhas.first();
    await expect(primeira.locator('.grade-dia')).toHaveValue('1');
    await expect(primeira.locator('.grade-inicio')).toHaveValue('08:00');
    await expect(primeira.locator('.grade-fim')).toHaveValue('12:00');
  });

  /**
   * @caso CT-E2E-063
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.2
   * @objetivo Adicionar um bloco de sábado e salvar a grade
   * @resultadoEsperado A grade fica com 11 blocos e o novo bloco persiste após recarregar
   */
  test('médico adiciona bloco à grade', async ({ page }) => {
    await entrar(page, 'carlos@clinica.com', '/medico');
    await page.locator('#menu-grade').click();
    await page.locator('#grade-adicionar').click();
    const linhas = page.locator('#tabela-grade tbody tr');
    await expect(linhas).toHaveCount(11);
    const nova = linhas.last();
    await nova.locator('.grade-dia').selectOption('6');
    await nova.locator('.grade-inicio').fill('08:00');
    await nova.locator('.grade-fim').fill('12:00');
    await page.locator('#grade-salvar').click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Grade salva com 11 bloco(s)' })).toBeVisible();
    await page.reload();
    await expect(page.locator('#tabela-grade tbody tr')).toHaveCount(11);
  });

  /**
   * @caso CT-E2E-064
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.2
   * @objetivo Remover o bloco de sábado e salvar a grade
   * @resultadoEsperado A grade volta a ter 10 blocos
   */
  test('médico remove bloco da grade', async ({ page }) => {
    await entrar(page, 'carlos@clinica.com', '/medico');
    await page.locator('#menu-grade').click();
    const linhas = page.locator('#tabela-grade tbody tr');
    await expect(linhas).toHaveCount(11);
    await linhas.last().locator('.grade-remover').click();
    await expect(linhas).toHaveCount(10);
    await page.locator('#grade-salvar').click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Grade salva com 10 bloco(s)' })).toBeVisible();
  });

  /**
   * @caso CT-E2E-065
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN10
   * @objetivo Salvar um bloco com hora final anterior à inicial
   * @resultadoEsperado A API recusa e a mensagem em português é exibida
   */
  test('grade com horário inválido é recusada', async ({ page }) => {
    await entrar(page, 'carlos@clinica.com', '/medico');
    await page.locator('#menu-grade').click();
    const primeira = page.locator('#tabela-grade tbody tr').first();
    await primeira.locator('.grade-inicio').fill('12:00');
    await primeira.locator('.grade-fim').fill('08:00');
    await page.locator('#grade-salvar').click();
    await expect(page.getByRole('alert')).toHaveText('Hora de início deve ser anterior à hora de fim.');
  });

  /**
   * @caso CT-E2E-066
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.1
   * @objetivo Criar um bloqueio de agenda com motivo
   * @resultadoEsperado O bloqueio aparece na tabela com o período e o motivo
   */
  test('médico cria bloqueio de agenda', async ({ page }) => {
    await entrar(page, 'carlos@clinica.com', '/medico');
    await page.locator('#menu-bloqueios').click();
    await page.locator('#bloqueio-inicio').fill('2026-11-02');
    await page.locator('#bloqueio-fim').fill('2026-11-03');
    await page.locator('#bloqueio-motivo').fill('Congresso');
    await page.locator('#bloqueio-criar').click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Agenda bloqueada' })).toBeVisible();
    const linha = page.locator('#tabela-bloqueios tbody tr', { hasText: 'Congresso' });
    await expect(linha).toContainText('02/11/2026');
    await expect(linha).toContainText('03/11/2026');
  });

  /**
   * @caso CT-E2E-067
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Consultar horários em uma data bloqueada
   * @resultadoEsperado Nenhum horário é oferecido na data do bloqueio
   */
  test('bloqueio remove os horários livres', async ({ page }) => {
    await entrar(page, 'joao@email.com', '/paciente');
    await page.locator('#menu-agendar').click();
    await page.locator('#agendar-especialidade').selectOption('1');
    await page.locator('#agendar-medico').selectOption('1');
    await page.locator('#agendar-data').fill('2026-11-02');
    await expect(page.locator('#agendar-horarios')).toContainText('Nenhum horário livre nesta data.');
  });

  /**
   * @caso CT-E2E-068
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.2
   * @objetivo Remover um bloqueio de agenda
   * @resultadoEsperado A tabela de bloqueios volta ao estado vazio
   */
  test('médico remove bloqueio de agenda', async ({ page }) => {
    await entrar(page, 'carlos@clinica.com', '/medico');
    await page.locator('#menu-bloqueios').click();
    const linha = page.locator('#tabela-bloqueios tbody tr', { hasText: 'Congresso' });
    await linha.getByRole('button', { name: 'Remover' }).click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Bloqueio removido' })).toBeVisible();
    await expect(page.locator('#tabela-bloqueios')).toContainText('Nenhum bloqueio cadastrado.');
  });

  /**
   * @caso CT-E2E-069
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN12
   * @objetivo Criar bloqueio com data final anterior à inicial
   * @resultadoEsperado O sistema recusa com mensagem explicativa
   */
  test('bloqueio com fim antes do início é recusado', async ({ page }) => {
    await entrar(page, 'carlos@clinica.com', '/medico');
    await page.locator('#menu-bloqueios').click();
    await page.locator('#bloqueio-inicio').fill('2026-11-10');
    await page.locator('#bloqueio-fim').fill('2026-11-05');
    await page.locator('#bloqueio-motivo').fill('Teste');
    await page.locator('#bloqueio-criar').click();
    await expect(page.getByRole('alert')).toHaveText('A data final do bloqueio não pode ser anterior à inicial.');
  });

  /**
   * @caso CT-E2E-070
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN12
   * @objetivo Criar bloqueio começando no passado
   * @resultadoEsperado O sistema recusa e explica que o bloqueio não pode começar no passado
   */
  test('bloqueio no passado é recusado', async ({ page }) => {
    await entrar(page, 'carlos@clinica.com', '/medico');
    await page.locator('#menu-bloqueios').click();
    await page.locator('#bloqueio-inicio').fill('2026-10-01');
    await page.locator('#bloqueio-fim').fill('2026-10-02');
    await page.locator('#bloqueio-motivo').fill('Passado');
    await page.locator('#bloqueio-criar').click();
    await expect(page.getByRole('alert')).toHaveText('O bloqueio não pode começar no passado.');
  });

  /**
   * @caso CT-E2E-071
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.2, RN26
   * @objetivo Cancelar uma consulta da própria agenda com motivo
   * @resultadoEsperado O status da consulta muda para Cancelada
   */
  test('médico cancela consulta da própria agenda', async ({ page }) => {
    await entrar(page, 'carlos@clinica.com', '/medico');
    await page.locator('#agenda-data').fill('2026-10-19');
    const linha = page.locator('#tabela-agenda tbody tr', { hasText: 'Ana Pereira' });
    await linha.getByRole('button', { name: 'Cancelar' }).click();
    await page.locator('#texto-campo').fill('Médico precisou se ausentar');
    await page.locator('#texto-confirmar').click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Consulta cancelada' })).toBeVisible();
    await expect(linha.locator('[data-status="CANCELADA"]')).toBeVisible();
  });

  /**
   * @caso CT-E2E-072
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN28
   * @objetivo Registrar atendimento antes do horário da consulta
   * @resultadoEsperado O sistema recusa e a consulta continua agendada
   */
  test('médico não registra atendimento antes do horário', async ({ page }) => {
    await entrar(page, 'joao@email.com', '/paciente');
    await agendar(page, { especialidade: '1', medico: '1', data: '2026-10-19', hora: '14:00' });
    await sair(page);
    await entrar(page, 'carlos@clinica.com', '/medico');
    await page.locator('#agenda-data').fill('2026-10-19');
    const linha = page.locator('#tabela-agenda tbody tr', { hasText: 'João Santos' });
    await linha.getByRole('button', { name: 'Atendido' }).click();
    await page.locator('#texto-confirmar').click();
    await expect(page.getByRole('alert')).toHaveText('O atendimento só pode ser registrado a partir do horário da consulta.');
    await expect(linha.locator('[data-status="AGENDADA"]')).toBeVisible();
  });
});
```
