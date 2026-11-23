# lote-009

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 19 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0125 | CT-API-052 | paciente lista especialidades | passou |  |
| deepseek-0126 | CT-API-053 | especialidade traz preço em centavos | passou |  |
| deepseek-0127 | CT-API-054 | recepção cria especialidade | passou |  |
| deepseek-0128 | CT-API-055 | nome duplicado devolve 409 | passou |  |
| deepseek-0129 | CT-API-056 | preço inválido devolve 400 | passou |  |
| deepseek-0130 | CT-API-057 | nome curto devolve 400 | passou |  |
| deepseek-0131 | CT-API-058 | lista médicos sem dados sensíveis | passou |  |
| deepseek-0132 | CT-API-059 | filtra médicos por especialidade | passou |  |
| deepseek-0133 | CT-API-060 | busca médico por id | passou |  |
| deepseek-0134 | CT-API-061 | médico inexistente devolve 404 | passou |  |
| deepseek-0135 | CT-API-062 | recepção cadastra médico | passou |  |
| deepseek-0136 | CT-API-063 | duração padrão é 30 minutos | passou |  |
| deepseek-0137 | CT-API-064 | CRM duplicado devolve 409 | passou |  |
| deepseek-0138 | CT-API-065 | CRM inválido devolve 400 | passou |  |
| deepseek-0139 | CT-API-066 | duração inválida devolve 400 | passou |  |
| deepseek-0140 | CT-API-067 | especialidade inexistente devolve 400 | passou |  |
| deepseek-0141 | CT-API-068 | devolve data e horários | passou |  |
| deepseek-0142 | CT-API-069 | data ausente devolve 400 | passou |  |
| deepseek-0143 | CT-API-070 | data malformada devolve 400 | passou |  |

## Arquivo: backend/__testes__/api/especialidades-medicos.test.js

```js
// API: especialidades, médicos e horários livres (RF03, RF04, RF07).
const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');
const clock = require('../../src/utils/clock');

let db;
let app;
let dados;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  dados = semear(db);
  app = criarApp({ db });
});

afterEach(() => {
  db.close();
  clock.definirAgora(null);
});

async function token(email = 'recepcao@clinica.com') {
  const resposta = await request(app).post('/api/auth/login').send({ email, senha: 'Senha123' });
  return resposta.body.token;
}

const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe('GET /api/especialidades', () => {
  /**
   * @caso CT-API-052
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.2
   * @objetivo Listar especialidades para qualquer usuário autenticado
   * @resultadoEsperado O paciente recebe as 4 especialidades em ordem alfabética
   */
  test('paciente lista especialidades', async () => {
    const t = await token('ana@email.com');
    const resposta = await request(app).get('/api/especialidades').set(auth(t));
    expect(resposta.status).toBe(200);
    expect(resposta.body.map((e) => e.nome)).toEqual(['Cardiologia', 'Clínica Geral', 'Dermatologia', 'Pediatria']);
  });

  /**
   * @caso CT-API-053
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF03.2
   * @objetivo Expor preço em centavos na especialidade
   * @resultadoEsperado Cardiologia traz precoCentavos 30000
   */
  test('especialidade traz preço em centavos', async () => {
    const t = await token();
    const resposta = await request(app).get('/api/especialidades').set(auth(t));
    expect(resposta.body.find((e) => e.nome === 'Cardiologia')).toMatchObject({ precoCentavos: 30000 });
  });
});

describe('POST /api/especialidades', () => {
  /**
   * @caso CT-API-054
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.1
   * @objetivo Cadastrar especialidade pela recepção
   * @resultadoEsperado A resposta é 201 com a especialidade criada
   */
  test('recepção cria especialidade', async () => {
    const t = await token();
    const resposta = await request(app).post('/api/especialidades').set(auth(t)).send({ nome: 'Oftalmologia', precoCentavos: 18000 });
    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({ nome: 'Oftalmologia', precoCentavos: 18000 });
  });

  /**
   * @caso CT-API-055
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN09
   * @objetivo Recusar especialidade duplicada
   * @resultadoEsperado A resposta é 409 CONFLITO
   */
  test('nome duplicado devolve 409', async () => {
    const t = await token();
    const resposta = await request(app).post('/api/especialidades').set(auth(t)).send({ nome: 'Cardiologia', precoCentavos: 10000 });
    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.mensagem).toBe('Especialidade já cadastrada.');
  });

  /**
   * @caso CT-API-056
   * @nivel api
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN09
   * @objetivo Recusar preço base inválido
   * @resultadoEsperado A resposta é 400 com mensagem sobre centavos
   */
  test('preço inválido devolve 400', async () => {
    const t = await token();
    const resposta = await request(app).post('/api/especialidades').set(auth(t)).send({ nome: 'Nova Especialidade', precoCentavos: 0 });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('Preço deve ser um inteiro em centavos maior que zero.');
  });

  /**
   * @caso CT-API-057
   * @nivel api
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN09
   * @objetivo Recusar nome de especialidade curto
   * @resultadoEsperado A resposta é 400 VALIDACAO
   */
  test('nome curto devolve 400', async () => {
    const t = await token();
    const resposta = await request(app).post('/api/especialidades').set(auth(t)).send({ nome: 'Oi', precoCentavos: 10000 });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('Nome da especialidade deve ter pelo menos 3 caracteres.');
  });
});

describe('GET /api/medicos', () => {
  /**
   * @caso CT-API-058
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04.2
   * @objetivo Listar médicos sem expor dados sensíveis
   * @resultadoEsperado A resposta é 200 com 4 médicos e sem hash de senha
   */
  test('lista médicos sem dados sensíveis', async () => {
    const t = await token('ana@email.com');
    const resposta = await request(app).get('/api/medicos').set(auth(t));
    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(4);
    expect(JSON.stringify(resposta.body)).not.toMatch(/senhaHash|\$2[aby]\$/);
  });

  /**
   * @caso CT-API-059
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04.2
   * @objetivo Filtrar médicos por especialidade
   * @resultadoEsperado O filtro por Cardiologia devolve somente a Beatriz
   */
  test('filtra médicos por especialidade', async () => {
    const t = await token();
    const cardio = dados.medicos[1].especialidadeId;
    const resposta = await request(app).get(`/api/medicos?especialidadeId=${cardio}`).set(auth(t));
    expect(resposta.body.map((m) => m.nome)).toEqual(['Dra. Beatriz Souza']);
  });

  /**
   * @caso CT-API-060
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04.2
   * @objetivo Buscar um médico pelo id
   * @resultadoEsperado A resposta é 200 com o médico e a duração da consulta
   */
  test('busca médico por id', async () => {
    const t = await token();
    const resposta = await request(app).get(`/api/medicos/${dados.medicos[0].id}`).set(auth(t));
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ id: dados.medicos[0].id, duracaoConsultaMin: 30, especialidadeNome: 'Clínica Geral' });
  });

  /**
   * @caso CT-API-061
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Devolver 404 para médico inexistente
   * @resultadoEsperado A resposta é 404 NAO_ENCONTRADO
   */
  test('médico inexistente devolve 404', async () => {
    const t = await token();
    const resposta = await request(app).get('/api/medicos/9999').set(auth(t));
    expect(resposta.status).toBe(404);
    expect(resposta.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });
});

describe('POST /api/medicos', () => {
  const novo = {
    nome: 'Dr. Novo Teste',
    email: 'novo.medico@clinica.com',
    senha: 'Senha123',
    crm: '55555/SP',
    especialidadeId: 1,
    duracaoConsultaMin: 45,
  };

  /**
   * @caso CT-API-062
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04.1
   * @objetivo Cadastrar médico pela recepção
   * @resultadoEsperado A resposta é 201 com CRM e duração informados
   */
  test('recepção cadastra médico', async () => {
    const t = await token();
    const resposta = await request(app).post('/api/medicos').set(auth(t)).send(novo);
    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({ nome: 'Dr. Novo Teste', crm: '55555/SP', duracaoConsultaMin: 45, ativo: true });
  });

  /**
   * @caso CT-API-063
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Usar 30 minutos quando a duração é omitida
   * @resultadoEsperado O médico criado tem duracaoConsultaMin 30
   */
  test('duração padrão é 30 minutos', async () => {
    const t = await token();
    const { duracaoConsultaMin, ...semDuracao } = novo;
    const resposta = await request(app).post('/api/medicos').set(auth(t)).send(semDuracao);
    expect(resposta.body.duracaoConsultaMin).toBe(30);
  });

  /**
   * @caso CT-API-064
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Recusar CRM duplicado
   * @resultadoEsperado A resposta é 409 CONFLITO
   */
  test('CRM duplicado devolve 409', async () => {
    const t = await token();
    const resposta = await request(app).post('/api/medicos').set(auth(t)).send({ ...novo, crm: '123456/SP' });
    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.mensagem).toBe('CRM já cadastrado.');
  });

  /**
   * @caso CT-API-065
   * @nivel api
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN07
   * @objetivo Recusar CRM fora do formato
   * @resultadoEsperado A resposta é 400 com mensagem sobre o formato
   */
  test('CRM inválido devolve 400', async () => {
    const t = await token();
    const resposta = await request(app).post('/api/medicos').set(auth(t)).send({ ...novo, crm: '123/XX' });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('CRM inválido. Use o formato 123456/UF.');
  });

  /**
   * @caso CT-API-066
   * @nivel api
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN08
   * @objetivo Recusar duração fora dos múltiplos de 15
   * @resultadoEsperado A resposta é 400 com mensagem sobre a duração
   */
  test('duração inválida devolve 400', async () => {
    const t = await token();
    const resposta = await request(app).post('/api/medicos').set(auth(t)).send({ ...novo, duracaoConsultaMin: 20 });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('Duração da consulta deve ser de 15 a 60 minutos, em múltiplos de 15.');
  });

  /**
   * @caso CT-API-067
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF04.1
   * @objetivo Recusar especialidade inexistente
   * @resultadoEsperado A resposta é 400 VALIDACAO
   */
  test('especialidade inexistente devolve 400', async () => {
    const t = await token();
    const resposta = await request(app).post('/api/medicos').set(auth(t)).send({ ...novo, especialidadeId: 99 });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('Especialidade inexistente.');
  });
});

describe('GET /api/medicos/:id/horarios', () => {
  /**
   * @caso CT-API-068
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF07.1
   * @objetivo Devolver os horários livres do médico na data
   * @resultadoEsperado A resposta traz a data e 16 horários do Carlos
   */
  test('devolve data e horários', async () => {
    const t = await token('ana@email.com');
    const resposta = await request(app).get(`/api/medicos/${dados.medicos[0].id}/horarios?data=2026-10-20`).set(auth(t));
    expect(resposta.status).toBe(200);
    expect(resposta.body.data).toBe('2026-10-20');
    expect(resposta.body.horarios).toHaveLength(16);
    expect(resposta.body.horarios[0]).toBe('2026-10-20 08:00');
  });

  /**
   * @caso CT-API-069
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar data ausente na consulta de horários
   * @resultadoEsperado A resposta é 400 VALIDACAO
   */
  test('data ausente devolve 400', async () => {
    const t = await token();
    const resposta = await request(app).get(`/api/medicos/${dados.medicos[0].id}/horarios`).set(auth(t));
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('Data inválida. Use o formato AAAA-MM-DD.');
  });

  /**
   * @caso CT-API-070
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar data malformada na consulta de horários
   * @resultadoEsperado A resposta é 400 VALIDACAO
   */
  test('data malformada devolve 400', async () => {
    const t = await token();
    const resposta = await request(app).get(`/api/medicos/${dados.medicos[0].id}/horarios?data=20-10-2026`).set(auth(t));
    expect(resposta.status).toBe(400);
  });
});
```
