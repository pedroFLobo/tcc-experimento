// API: autenticação obrigatória e autorização por perfil (RN30, RNF02).
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

async function token(email) {
  const resposta = await request(app).post('/api/auth/login').send({ email, senha: 'Senha123' });
  return resposta.body.token;
}

const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe('rotas protegidas sem token', () => {
  /**
   * @caso CT-API-036
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Exigir autenticação em todas as rotas de dados
   * @resultadoEsperado Todas devolvem 401 NAO_AUTENTICADO
   */
  test('rotas de dados exigem token', async () => {
    const rotas = [
      '/api/especialidades',
      '/api/medicos',
      '/api/medicos/1',
      '/api/medicos/1/disponibilidades',
      '/api/medicos/1/horarios?data=2026-10-20',
      '/api/pacientes',
      '/api/consultas',
      '/api/admin/relatorios/resumo?dataInicio=2026-10-19&dataFim=2026-10-19',
    ];
    for (const rota of rotas) {
      const resposta = await request(app).get(rota);
      expect({ rota, status: resposta.status }).toEqual({ rota, status: 401 });
      expect(resposta.body.erro.codigo).toBe('NAO_AUTENTICADO');
    }
  });

  /**
   * @caso CT-API-037
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Exigir token nas rotas de escrita
   * @resultadoEsperado POST /api/consultas sem token devolve 401
   */
  test('rotas de escrita exigem token', async () => {
    const resposta = await request(app).post('/api/consultas').send({});
    expect(resposta.status).toBe(401);
  });
});

describe('autorização por perfil', () => {
  /**
   * @caso CT-API-038
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF03.1, RN30
   * @objetivo Impedir que o paciente cadastre especialidade
   * @resultadoEsperado A resposta é 403 SEM_PERMISSAO
   */
  test('paciente não cria especialidade', async () => {
    const t = await token('ana@email.com');
    const resposta = await request(app).post('/api/especialidades').set(auth(t)).send({ nome: 'Oftalmo', precoCentavos: 10000 });
    expect(resposta.status).toBe(403);
    expect(resposta.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-039
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF04.1, RN30
   * @objetivo Impedir que o médico cadastre outro médico
   * @resultadoEsperado A resposta é 403 SEM_PERMISSAO
   */
  test('médico não cadastra médico', async () => {
    const t = await token('carlos@clinica.com');
    const resposta = await request(app).post('/api/medicos').set(auth(t)).send({ nome: 'Novo Medico' });
    expect(resposta.status).toBe(403);
  });

  /**
   * @caso CT-API-040
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.3, RN30
   * @objetivo Impedir que o médico liste todos os pacientes
   * @resultadoEsperado A resposta é 403 SEM_PERMISSAO
   */
  test('médico não lista pacientes', async () => {
    const t = await token('carlos@clinica.com');
    const resposta = await request(app).get('/api/pacientes').set(auth(t));
    expect(resposta.status).toBe(403);
  });

  /**
   * @caso CT-API-041
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30
   * @objetivo Impedir que o paciente liste todos os pacientes
   * @resultadoEsperado A resposta é 403 SEM_PERMISSAO
   */
  test('paciente não lista pacientes', async () => {
    const t = await token('ana@email.com');
    expect((await request(app).get('/api/pacientes').set(auth(t))).status).toBe(403);
  });

  /**
   * @caso CT-API-042
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF10.3, RN30
   * @objetivo Impedir que o médico ative ou desative contas
   * @resultadoEsperado O PATCH administrativo devolve 403
   */
  test('médico não altera status de usuário', async () => {
    const t = await token('carlos@clinica.com');
    const resposta = await request(app).patch(`/api/admin/usuarios/${dados.pacientes[0].usuarioId}/ativo`).set(auth(t)).send({ ativo: false });
    expect(resposta.status).toBe(403);
  });

  /**
   * @caso CT-API-043
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF11.1, RN30
   * @objetivo Impedir que o paciente leia relatórios
   * @resultadoEsperado A resposta é 403 SEM_PERMISSAO
   */
  test('paciente não lê relatório', async () => {
    const t = await token('ana@email.com');
    const resposta = await request(app).get('/api/admin/relatorios/resumo?dataInicio=2026-10-19&dataFim=2026-10-19').set(auth(t));
    expect(resposta.status).toBe(403);
  });

  /**
   * @caso CT-API-044
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir que o médico altere a grade de outro médico
   * @resultadoEsperado O PUT devolve 403 SEM_PERMISSAO
   */
  test('médico não altera grade de outro', async () => {
    const t = await token('carlos@clinica.com');
    const resposta = await request(app)
      .put(`/api/medicos/${dados.medicos[1].id}/disponibilidades`)
      .set(auth(t))
      .send({ blocos: [{ diaSemana: 1, horaInicio: '08:00', horaFim: '09:00' }] });
    expect(resposta.status).toBe(403);
    expect(resposta.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-045
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir que o paciente altere uma grade
   * @resultadoEsperado O PUT devolve 403
   */
  test('paciente não altera grade', async () => {
    const t = await token('ana@email.com');
    const resposta = await request(app)
      .put(`/api/medicos/${dados.medicos[0].id}/disponibilidades`)
      .set(auth(t))
      .send({ blocos: [] });
    expect(resposta.status).toBe(403);
  });

  /**
   * @caso CT-API-046
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30
   * @objetivo Impedir que o paciente leia bloqueios de um médico
   * @resultadoEsperado A resposta é 403
   */
  test('paciente não lê bloqueios do médico', async () => {
    const t = await token('ana@email.com');
    expect((await request(app).get(`/api/medicos/${dados.medicos[0].id}/bloqueios`).set(auth(t))).status).toBe(403);
  });

  /**
   * @caso CT-API-047
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF08.1, RN30
   * @objetivo Impedir que o médico crie consultas
   * @resultadoEsperado A resposta é 403 com a orientação de procurar a recepção
   */
  test('médico não cria consulta', async () => {
    const t = await token('carlos@clinica.com');
    const resposta = await request(app)
      .post('/api/consultas')
      .set(auth(t))
      .send({ pacienteId: dados.pacientes[0].id, medicoId: dados.medicos[0].id, inicio: '2026-10-20 09:00' });
    expect(resposta.status).toBe(403);
    expect(resposta.body.erro.mensagem).toBe('Médicos não agendam consultas. Procure a recepção.');
  });

  /**
   * @caso CT-API-048
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30
   * @objetivo Impedir que o paciente leia o cadastro de outro paciente
   * @resultadoEsperado A resposta é 403
   */
  test('paciente não lê outro paciente', async () => {
    const t = await token('ana@email.com');
    const resposta = await request(app).get(`/api/pacientes/${dados.pacientes[1].id}`).set(auth(t));
    expect(resposta.status).toBe(403);
  });

  /**
   * @caso CT-API-049
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.1, RN30
   * @objetivo Deixar o paciente ler o próprio cadastro
   * @resultadoEsperado A resposta é 200 com o paciente do token
   */
  test('paciente lê o próprio cadastro', async () => {
    const t = await token('ana@email.com');
    const resposta = await request(app).get(`/api/pacientes/${dados.pacientes[0].id}`).set(auth(t));
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ id: dados.pacientes[0].id, nome: 'Ana Pereira' });
  });

  /**
   * @caso CT-API-050
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF11.1
   * @objetivo Deixar a recepção acessar os recursos administrativos
   * @resultadoEsperado A lista de pacientes e o relatório devolvem 200
   */
  test('recepção acessa recursos administrativos', async () => {
    const t = await token('recepcao@clinica.com');
    expect((await request(app).get('/api/pacientes').set(auth(t))).status).toBe(200);
    expect(
      (await request(app).get('/api/admin/relatorios/resumo?dataInicio=2026-10-19&dataFim=2026-10-19').set(auth(t))).status,
    ).toBe(200);
  });

  /**
   * @caso CT-API-051
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30
   * @objetivo Impedir que o paciente exclua bloqueio de médico
   * @resultadoEsperado O DELETE devolve 403
   */
  test('paciente não remove bloqueio', async () => {
    const t = await token('ana@email.com');
    const resposta = await request(app).delete(`/api/medicos/${dados.medicos[0].id}/bloqueios/1`).set(auth(t));
    expect(resposta.status).toBe(403);
  });
});
