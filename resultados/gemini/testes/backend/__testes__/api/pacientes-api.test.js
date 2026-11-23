const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear, SENHA_PADRAO } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');

describe('API: Pacientes (/api/pacientes)', () => {
  let db;
  let app;
  let tokenRecepcao;
  let tokenPacienteAna;
  let tokenPacienteJoao;

  beforeEach(async () => {
    db = abrirBanco(':memory:');
    semear(db);
    app = criarApp({ db });

    const lRec = await request(app).post('/api/auth/login').send({ email: 'recepcao@clinica.com', senha: SENHA_PADRAO });
    tokenRecepcao = lRec.body.token;

    const lAna = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: SENHA_PADRAO });
    tokenPacienteAna = lAna.body.token; // Paciente ID 1

    const lJoao = await request(app).post('/api/auth/login').send({ email: 'joao@email.com', senha: SENHA_PADRAO });
    tokenPacienteJoao = lJoao.body.token; // Paciente ID 2
  });

  afterEach(() => {
    db.close();
  });

  /**
   * @caso CT-API-025
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.2
   * @objetivo Recepção lista pacientes com sucesso
   * @resultadoEsperado Status 200 com array de pacientes
   */
  test('GET /api/pacientes - recepção lista pacientes', async () => {
    const res = await request(app)
      .get('/api/pacientes')
      .set('Authorization', `Bearer ${tokenRecepcao}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  /**
   * @caso CT-API-026
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30, RF02.2
   * @objetivo Impedir paciente de listar todos os pacientes da clínica
   * @resultadoEsperado Status 403 com erro.codigo = SEM_PERMISSAO
   */
  test('GET /api/pacientes - paciente recebe 403 ao tentar listar todos os pacientes', async () => {
    const res = await request(app)
      .get('/api/pacientes')
      .set('Authorization', `Bearer ${tokenPacienteAna}`);

    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-027
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.2
   * @objetivo Recepção cadastra novo paciente via POST /api/pacientes
   * @resultadoEsperado Status 201 com dados do paciente cadastrado
   */
  test('POST /api/pacientes - recepção cadastra novo paciente', async () => {
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({
        nome: 'Valéria Costa',
        email: 'valeria@email.com',
        senha: 'Senha123',
        cpf: '730.825.290-77',
        dataNascimento: '1979-03-25',
        telefone: '(11) 98765-1234',
      });

    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Valéria Costa');
    expect(res.body.cpf).toBe('73082529077');
  });

  /**
   * @caso CT-API-028
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30
   * @objetivo Paciente visualiza os próprios dados mas recebe 403 ao tentar ver dados de outro paciente
   * @resultadoEsperado Status 200 no próprio perfil e 403 no perfil alheio
   */
  test('GET /api/pacientes/:id - paciente só visualiza o próprio cadastro', async () => {
    // Ana (ID 1) acessa a si mesma
    const resProprio = await request(app)
      .get('/api/pacientes/1')
      .set('Authorization', `Bearer ${tokenPacienteAna}`);
    expect(resProprio.status).toBe(200);
    expect(resProprio.body.email).toBe('ana@email.com');

    // Ana (ID 1) tenta acessar João (ID 2)
    const resAlheio = await request(app)
      .get('/api/pacientes/2')
      .set('Authorization', `Bearer ${tokenPacienteAna}`);
    expect(resAlheio.status).toBe(403);
    expect(resAlheio.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-029
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN30, RNF04
   * @objetivo Retornar 404 quando o id do paciente for inexistente
   * @resultadoEsperado Status 404 com erro.codigo = NAO_ENCONTRADO
   */
  test('GET /api/pacientes/:id - retorna 404 para paciente inexistente', async () => {
    const res = await request(app)
      .get('/api/pacientes/9999')
      .set('Authorization', `Bearer ${tokenRecepcao}`);

    expect(res.status).toBe(404);
    expect(res.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });
});
