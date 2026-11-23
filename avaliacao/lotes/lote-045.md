# lote-045

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 17 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0739 | CT-E2E-042 | recepção cadastra especialidade | passou |  |
| deepseek-0740 | CT-E2E-043 | especialidade duplicada é recusada | passou |  |
| deepseek-0741 | CT-E2E-044 | recepção cadastra médico | passou |  |
| deepseek-0742 | CT-E2E-045 | CRM inválido é recusado | passou |  |
| deepseek-0743 | CT-E2E-046 | CRM duplicado é recusado | passou |  |
| deepseek-0744 | CT-E2E-047 | recepção cadastra paciente | passou |  |
| deepseek-0745 | CT-E2E-048 | CPF inválido é recusado pela recepção | passou |  |
| deepseek-0746 | CT-E2E-049 | e-mail duplicado é recusado | passou |  |
| deepseek-0747 | CT-E2E-050 | CPF duplicado é recusado | passou |  |
| deepseek-0748 | CT-E2E-051 | menor sem responsável é recusado | passou |  |
| deepseek-0749 | CT-E2E-052 | menor com responsável é cadastrado | passou |  |
| deepseek-0750 | CT-E2E-053 | paciente desativado não consegue entrar | passou |  |
| deepseek-0751 | CT-E2E-054 | paciente reativado volta a entrar | passou |  |
| deepseek-0752 | CT-E2E-055 | recepção busca pacientes | passou |  |
| deepseek-0753 | CT-E2E-056 | recepção abre a grade do médico | passou |  |
| deepseek-0754 | CT-E2E-057 | médico desativado não consegue entrar | passou |  |
| deepseek-0755 | CT-E2E-058 | médico reativado volta a entrar | passou |  |

## Arquivo: e2e/recepcao-cadastros.spec.js

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

async function cadastrarPaciente(page, { nome, email, cpf, nascimento, responsavel }) {
  await page.locator('#paciente-nome').fill(nome);
  await page.locator('#paciente-email').fill(email);
  await page.locator('#paciente-senha').fill(SENHA);
  await page.locator('#paciente-cpf').fill(cpf);
  await page.locator('#paciente-nascimento').fill(nascimento);
  if (responsavel) await page.locator('#paciente-responsavel').fill(responsavel);
  await page.locator('#paciente-enviar').click();
}

test.describe('Cadastros da recepção', () => {
  /**
   * @caso CT-E2E-042
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.1
   * @objetivo Cadastrar uma nova especialidade com preço base
   * @resultadoEsperado A especialidade aparece na tabela com o preço formatado
   */
  test('recepção cadastra especialidade', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-especialidades').click();
    await page.locator('#especialidade-nome').fill('Oftalmologia');
    await page.locator('#especialidade-preco').fill('180');
    await page.locator('#especialidade-cadastrar').click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Especialidade cadastrada' })).toBeVisible();
    const linha = page.locator('#tabela-especialidades tbody tr', { hasText: 'Oftalmologia' });
    await expect(linha).toContainText('R$ 180,00');
  });

  /**
   * @caso CT-E2E-043
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN09
   * @objetivo Tentar cadastrar uma especialidade com nome repetido
   * @resultadoEsperado O sistema recusa e informa que a especialidade já existe
   */
  test('especialidade duplicada é recusada', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-especialidades').click();
    await page.locator('#especialidade-nome').fill('Oftalmologia');
    await page.locator('#especialidade-preco').fill('200');
    await page.locator('#especialidade-cadastrar').click();
    await expect(page.getByRole('alert')).toHaveText('Especialidade já cadastrada.');
  });

  /**
   * @caso CT-E2E-044
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04.1
   * @objetivo Cadastrar um médico com CRM, especialidade e duração
   * @resultadoEsperado O médico aparece na equipe com os dados informados
   */
  test('recepção cadastra médico', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-medicos').click();
    await page.locator('#medico-nome').fill('Dra. Helena Prado');
    await page.locator('#medico-email').fill('helena@clinica.com');
    await page.locator('#medico-senha').fill(SENHA);
    await page.locator('#medico-crm').fill('55555/SP');
    await page.locator('#medico-especialidade').selectOption({ label: 'Oftalmologia' });
    await page.locator('#medico-cadastrar').click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Médico cadastrado' })).toBeVisible();
    const linha = page.locator('#tabela-medicos tbody tr', { hasText: 'Dra. Helena Prado' });
    await expect(linha).toContainText('55555/SP');
    await expect(linha).toContainText('Oftalmologia');
    await expect(linha).toContainText('30 min');
  });

  /**
   * @caso CT-E2E-045
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN07
   * @objetivo Cadastrar médico com CRM fora do formato
   * @resultadoEsperado O sistema recusa e mostra o formato esperado
   */
  test('CRM inválido é recusado', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-medicos').click();
    await page.locator('#medico-nome').fill('Dr. Crm Invalido');
    await page.locator('#medico-email').fill('crm.invalido@clinica.com');
    await page.locator('#medico-senha').fill(SENHA);
    await page.locator('#medico-crm').fill('123/SP');
    await page.locator('#medico-especialidade').selectOption({ label: 'Oftalmologia' });
    await page.locator('#medico-cadastrar').click();
    await expect(page.getByRole('alert')).toHaveText('CRM inválido. Use o formato 123456/UF.');
  });

  /**
   * @caso CT-E2E-046
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Cadastrar médico com CRM já usado
   * @resultadoEsperado O sistema recusa e informa que o CRM já está cadastrado
   */
  test('CRM duplicado é recusado', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-medicos').click();
    await page.locator('#medico-nome').fill('Dr. Crm Repetido');
    await page.locator('#medico-email').fill('crm.repetido@clinica.com');
    await page.locator('#medico-senha').fill(SENHA);
    await page.locator('#medico-crm').fill('55555/SP');
    await page.locator('#medico-especialidade').selectOption({ label: 'Oftalmologia' });
    await page.locator('#medico-cadastrar').click();
    await expect(page.getByRole('alert')).toHaveText('CRM já cadastrado.');
  });

  /**
   * @caso CT-E2E-047
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.2
   * @objetivo Cadastrar um paciente pela recepção
   * @resultadoEsperado O paciente aparece na tabela como Ativo
   */
  test('recepção cadastra paciente', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-pacientes').click();
    await cadastrarPaciente(page, { nome: 'Pedro E2E', email: 'pedro.e2e@email.com', cpf: '246.813.579-28', nascimento: '1985-07-20' });
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Paciente cadastrado' })).toBeVisible();
    const linha = page.locator('#tabela-pacientes tbody tr', { hasText: 'Pedro E2E' });
    await expect(linha).toContainText('24681357928');
    await expect(linha).toContainText('Ativo');
  });

  /**
   * @caso CT-E2E-048
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN03
   * @objetivo Cadastrar paciente com CPF inválido pela recepção
   * @resultadoEsperado O sistema recusa e informa CPF inválido
   */
  test('CPF inválido é recusado pela recepção', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-pacientes').click();
    await cadastrarPaciente(page, { nome: 'Cpf Ruim E2E', email: 'cpf.ruim@email.com', cpf: '111.111.111-11', nascimento: '1990-01-01' });
    await expect(page.getByRole('alert')).toHaveText('CPF inválido.');
  });

  /**
   * @caso CT-E2E-049
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Cadastrar paciente com e-mail já usado
   * @resultadoEsperado O sistema recusa e informa que o e-mail já está cadastrado
   */
  test('e-mail duplicado é recusado', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-pacientes').click();
    await cadastrarPaciente(page, { nome: 'Email Repetido E2E', email: 'pedro.e2e@email.com', cpf: '987.654.321-00', nascimento: '1990-01-01' });
    await expect(page.getByRole('alert')).toHaveText('E-mail já cadastrado.');
  });

  /**
   * @caso CT-E2E-050
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Cadastrar paciente com CPF já usado
   * @resultadoEsperado O sistema recusa e informa que o CPF já está cadastrado
   */
  test('CPF duplicado é recusado', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-pacientes').click();
    await cadastrarPaciente(page, { nome: 'Cpf Repetido E2E', email: 'outro.cpf@email.com', cpf: '246.813.579-28', nascimento: '1990-01-01' });
    await expect(page.getByRole('alert')).toHaveText('CPF já cadastrado.');
  });

  /**
   * @caso CT-E2E-051
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN06
   * @objetivo Cadastrar menor sem responsável pela recepção
   * @resultadoEsperado O sistema exige o nome do responsável
   */
  test('menor sem responsável é recusado', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-pacientes').click();
    await cadastrarPaciente(page, { nome: 'Menor E2E', email: 'menor.e2e@email.com', cpf: '123.456.789-09', nascimento: '2015-01-10' });
    await expect(page.getByRole('alert')).toHaveText('Paciente menor de 18 anos deve informar o nome do responsável.');
  });

  /**
   * @caso CT-E2E-052
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN06, RF02.2
   * @objetivo Cadastrar menor informando o responsável
   * @resultadoEsperado O paciente é criado e listado na tabela
   */
  test('menor com responsável é cadastrado', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-pacientes').click();
    await cadastrarPaciente(page, { nome: 'Menor E2E', email: 'menor.e2e@email.com', cpf: '123.456.789-09', nascimento: '2015-01-10', responsavel: 'Carla E2E' });
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Paciente cadastrado' })).toBeVisible();
    await expect(page.locator('#tabela-pacientes tbody tr', { hasText: 'Menor E2E' })).toBeVisible();
  });

  /**
   * @caso CT-E2E-053
   * @nivel e2e
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN21
   * @objetivo Desativar um paciente e tentar entrar com ele
   * @resultadoEsperado A conta fica inativa e o login é recusado
   */
  test('paciente desativado não consegue entrar', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-pacientes').click();
    const linha = page.locator('#tabela-pacientes tbody tr', { hasText: 'Pedro E2E' });
    await linha.getByRole('button', { name: 'Desativar' }).click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Pedro E2E foi desativado' })).toBeVisible();
    await expect(linha).toContainText('Inativo');
    await page.locator('#botao-sair').click();
    await expect(page).toHaveURL(/\/login$/);
    await page.locator('#login-email').fill('pedro.e2e@email.com');
    await page.locator('#login-senha').fill(SENHA);
    await page.locator('#login-entrar').click();
    await expect(page.getByRole('alert')).toHaveText('Conta inativa. Procure a recepção.');
    await expect(page).toHaveURL(/\/login$/);
  });

  /**
   * @caso CT-E2E-054
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN21
   * @objetivo Reativar a conta de um paciente
   * @resultadoEsperado O paciente volta a entrar na área do paciente
   */
  test('paciente reativado volta a entrar', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-pacientes').click();
    const linha = page.locator('#tabela-pacientes tbody tr', { hasText: 'Pedro E2E' });
    await linha.getByRole('button', { name: 'Ativar' }).click();
    await expect(linha).toContainText('Ativo');
    await page.locator('#botao-sair').click();
    await entrar(page, 'pedro.e2e@email.com', '/paciente');
    await expect(page.locator('#nome-usuario')).toHaveText('Pedro E2E');
  });

  /**
   * @caso CT-E2E-055
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF02.2
   * @objetivo Buscar pacientes por nome e por termo sem resultado
   * @resultadoEsperado A busca filtra a tabela e mostra o estado vazio quando não encontra
   */
  test('recepção busca pacientes', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-pacientes').click();
    await page.locator('#paciente-busca').fill('Pedro');
    await expect(page.locator('#tabela-pacientes tbody tr', { hasText: 'Pedro E2E' })).toBeVisible();
    await expect(page.locator('#tabela-pacientes tbody tr', { hasText: 'Ana Pereira' })).toHaveCount(0);
    await page.locator('#paciente-busca').fill('zzz');
    await expect(page.locator('#tabela-pacientes')).toContainText('Nenhum paciente encontrado.');
  });

  /**
   * @caso CT-E2E-056
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.1
   * @objetivo Abrir a edição da grade de um médico pela recepção
   * @resultadoEsperado O editor de grade do médico novo é exibido vazio
   */
  test('recepção abre a grade do médico', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-medicos').click();
    await page.locator('#gestao-medico').selectOption({ label: 'Dra. Helena Prado — Oftalmologia' });
    await expect(page.locator('#tabela-grade')).toContainText('Nenhum horário de atendimento cadastrado.');
    await expect(page.locator('#grade-adicionar')).toBeVisible();
  });

  /**
   * @caso CT-E2E-057
   * @nivel e2e
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN21
   * @objetivo Desativar um médico e tentar entrar com ele
   * @resultadoEsperado A conta do médico fica inativa e o login é recusado
   */
  test('médico desativado não consegue entrar', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-medicos').click();
    const linha = page.locator('#tabela-medicos tbody tr', { hasText: 'Dra. Helena Prado' });
    await linha.getByRole('button', { name: 'Desativar' }).click();
    await expect(linha).toContainText('Inativo');
    await page.locator('#botao-sair').click();
    await expect(page).toHaveURL(/\/login$/);
    await page.locator('#login-email').fill('helena@clinica.com');
    await page.locator('#login-senha').fill(SENHA);
    await page.locator('#login-entrar').click();
    await expect(page.getByRole('alert')).toHaveText('Conta inativa. Procure a recepção.');
  });

  /**
   * @caso CT-E2E-058
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN21
   * @objetivo Reativar a conta de um médico
   * @resultadoEsperado O médico volta a entrar na agenda
   */
  test('médico reativado volta a entrar', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', '/recepcao');
    await page.locator('#menu-medicos').click();
    const linha = page.locator('#tabela-medicos tbody tr', { hasText: 'Dra. Helena Prado' });
    await linha.getByRole('button', { name: 'Ativar' }).click();
    await expect(linha).toContainText('Ativo');
    await page.locator('#botao-sair').click();
    await entrar(page, 'helena@clinica.com', '/medico');
    await expect(page.getByRole('heading', { name: 'Atendimentos do dia' })).toBeVisible();
  });
});
```
