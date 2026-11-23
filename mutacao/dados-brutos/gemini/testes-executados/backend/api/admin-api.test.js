const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear, SENHA_PADRAO } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');

describe('API: Admin e Relatórios (/api/admin)', () => {
  let db;
  let app;
  let tokenRecepcao;
  let tokenPaciente;

  beforeEach(async () => {
    db = abrirBanco(':memory:');
    semear(db);
    app = criarApp({ db });

    const lRec = await request(app).post('/api/auth/login').send({ email: 'recepcao@clinica.com', senha: SENHA_PADRAO });
    tokenRecepcao = lRec.body.token;

    const lPac = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: SENHA_PADRAO });
    tokenPaciente = lPac.body.token;
  });

  afterEach(() => {
    db.close();
  });

  /**
   * @caso CT-API-042
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN21
   * @objetivo Ativar ou desativar usuário pela recepção via PATCH /api/admin/usuarios/:id/ativo
   * @resultadoEsperado Status 200 com flag ativo atualizada
   */
  test('PATCH /api/admin/usuarios/:id/ativo - recepção altera status ativo do usuário', async () => {
    const res = await request(app)
      .patch('/api/admin/usuarios/2/ativo') // Carlos Almeida
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ ativo: false });

    expect(res.status).toBe(200);
    expect(res.body.ativo).toBe(false);
  });

  /**
   * @caso CT-API-043
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30
   * @objetivo Proibir paciente de ativar ou desativar usuários
   * @resultadoEsperado Status 403 SEM_PERMISSAO
   */
  test('PATCH /api/admin/usuarios/:id/ativo - paciente recebe 403', async () => {
    const res = await request(app)
      .patch('/api/admin/usuarios/2/ativo')
      .set('Authorization', `Bearer ${tokenPaciente}`)
      .send({ ativo: false });

    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-044
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF11.1
   * @objetivo Obter resumo do relatório administrativo com totalizadores e faturamento
   * @resultadoEsperado Status 200 com totais por status, taxas por médico e faturamento
   */
  test.skip('GET /api/admin/relatorios/resumo - recepção obtém relatório do período', async () => {
    const res = await request(app)
      .get('/api/admin/relatorios/resumo?dataInicio=2026-10-01&dataFim=2026-10-31')
      .set('Authorization', `Bearer ${tokenRecepcao}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totaisPorStatus');
    expect(res.body).toHaveProperty('medicos');
    expect(res.body).toHaveProperty('faturamentoCentavos');
  });

  /**
   * @caso CT-API-045
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF11.1, RNF04
   * @objetivo Rejeitar parâmetros de data malformados no relatório
   * @resultadoEsperado Status 400 VALIDACAO
   */
  test('GET /api/admin/relatorios/resumo - responde 400 para datas malformadas', async () => {
    const res = await request(app)
      .get('/api/admin/relatorios/resumo?dataInicio=data-errada')
      .set('Authorization', `Bearer ${tokenRecepcao}`);

    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('VALIDACAO');
  });
});
