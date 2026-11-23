const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear, SENHA_PADRAO } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');
const clock = require('../../src/utils/clock');

describe('API: Médicos (/api/medicos)', () => {
  let db;
  let app;
  let tokenRecepcao;
  let tokenMedico1;
  let tokenMedico2;
  let tokenPaciente;
  const agoraFixo = new Date('2026-10-19T08:00:00');

  beforeEach(async () => {
    clock.definirAgora(agoraFixo);
    db = abrirBanco(':memory:');
    semear(db);
    app = criarApp({ db });

    const lRec = await request(app).post('/api/auth/login').send({ email: 'recepcao@clinica.com', senha: SENHA_PADRAO });
    tokenRecepcao = lRec.body.token;

    const lMed1 = await request(app).post('/api/auth/login').send({ email: 'carlos@clinica.com', senha: SENHA_PADRAO });
    tokenMedico1 = lMed1.body.token; // Medico ID 1

    const lMed2 = await request(app).post('/api/auth/login').send({ email: 'beatriz@clinica.com', senha: SENHA_PADRAO });
    tokenMedico2 = lMed2.body.token; // Medico ID 2

    const lPac = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: SENHA_PADRAO });
    tokenPaciente = lPac.body.token;
  });

  afterEach(() => {
    clock.definirAgora(null);
    db.close();
  });

  /**
   * @caso CT-API-015
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04
   * @objetivo Listar médicos cadastrados com possibilidade de filtrar por especialidade
   * @resultadoEsperado Status 200 com lista de médicos
   */
  test('GET /api/medicos - lista médicos cadastrados', async () => {
    const res = await request(app)
      .get('/api/medicos')
      .set('Authorization', `Bearer ${tokenPaciente}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
    expect(res.body[0]).toHaveProperty('crm');
    expect(res.body[0]).toHaveProperty('especialidadeNome');
  });

  /**
   * @caso CT-API-016
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04.1, RN07, RN08
   * @objetivo Cadastrar médico quando autenticado como RECEPCAO
   * @resultadoEsperado Status 201 com dados do médico cadastrado
   */
  test('POST /api/medicos - recepção cadastra novo médico com CRM e duração', async () => {
    const res = await request(app)
      .post('/api/medicos')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({
        nome: 'Dr. Fernando Dias',
        email: 'fernando.dias@clinica.com',
        senha: 'Senha123',
        crm: '887766/SP',
        especialidadeId: 1,
        duracaoConsultaMin: 30,
      });

    expect(res.status).toBe(201);
    expect(res.body.crm).toBe('887766/SP');
    expect(res.body.duracaoConsultaMin).toBe(30);
  });

  /**
   * @caso CT-API-017
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF04.1, RN30
   * @objetivo Proibir paciente ou médico de cadastrar médicos
   * @resultadoEsperado Status 403 com erro.codigo = SEM_PERMISSAO
   */
  test('POST /api/medicos - paciente recebe 403 ao tentar cadastrar médico', async () => {
    const res = await request(app)
      .post('/api/medicos')
      .set('Authorization', `Bearer ${tokenPaciente}`)
      .send({
        nome: 'Dr. Inválido',
        email: 'invalido@clinica.com',
        senha: 'Senha123',
        crm: '123123/SP',
        especialidadeId: 1,
      });

    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-018
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.1
   * @objetivo Obter a grade de disponibilidade do médico
   * @resultadoEsperado Status 200 com array de blocos semanais
   */
  test('GET /api/medicos/:id/disponibilidades - retorna blocos de disponibilidade', async () => {
    const res = await request(app)
      .get('/api/medicos/1/disponibilidades')
      .set('Authorization', `Bearer ${tokenPaciente}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('diaSemana');
  });

  /**
   * @caso CT-API-019
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.1, RF05.2
   * @objetivo Atualizar grade de disponibilidade pelo médico dono
   * @resultadoEsperado Status 200 com os novos blocos salvos
   */
  test('PUT /api/medicos/:id/disponibilidades - médico dono atualiza grade', async () => {
    const novaGrade = [
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 2, horaInicio: '14:00', horaFim: '18:00' },
    ];

    const res = await request(app)
      .put('/api/medicos/1/disponibilidades')
      .set('Authorization', `Bearer ${tokenMedico1}`)
      .send({ blocos: novaGrade });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  /**
   * @caso CT-API-020
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF05.1, RN30
   * @objetivo Impedir médico de alterar grade de outro médico
   * @resultadoEsperado Status 403 SEM_PERMISSAO
   */
  test('PUT /api/medicos/:id/disponibilidades - médico recebe 403 ao tentar alterar grade alheia', async () => {
    const res = await request(app)
      .put('/api/medicos/2/disponibilidades')
      .set('Authorization', `Bearer ${tokenMedico1}`) // Médico 1 tentando alterar Médico 2
      .send({ blocos: [{ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' }] });

    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-021
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.1, RN12
   * @objetivo Criar bloqueio de agenda por médico dono
   * @resultadoEsperado Status 201 com dados do bloqueio cadastrado
   */
  test('POST /api/medicos/:id/bloqueios - médico cria bloqueio de agenda', async () => {
    const res = await request(app)
      .post('/api/medicos/1/bloqueios')
      .set('Authorization', `Bearer ${tokenMedico1}`)
      .send({
        dataInicio: '2026-11-10',
        dataFim: '2026-11-12',
        motivo: 'Curso de atualização',
      });

    expect(res.status).toBe(201);
    expect(res.body.motivo).toBe('Curso de atualização');
  });

  /**
   * @caso CT-API-022
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN12, RNF04
   * @objetivo Rejeitar bloqueio onde data final é anterior à data inicial
   * @resultadoEsperado Status 400 VALIDACAO
   */
  test('POST /api/medicos/:id/bloqueios - retorna 400 se data fim for anterior a data inicio', async () => {
    const res = await request(app)
      .post('/api/medicos/1/bloqueios')
      .set('Authorization', `Bearer ${tokenMedico1}`)
      .send({
        dataInicio: '2026-11-15',
        dataFim: '2026-11-10',
      });

    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('VALIDACAO');
  });

  /**
   * @caso CT-API-023
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.2
   * @objetivo Excluir bloqueio existente via DELETE /api/medicos/:id/bloqueios/:bloqueioId
   * @resultadoEsperado Status 204 No Content
   */
  test('DELETE /api/medicos/:id/bloqueios/:bloqueioId - médico remove bloqueio', async () => {
    // Cria bloqueio
    const criaRes = await request(app)
      .post('/api/medicos/1/bloqueios')
      .set('Authorization', `Bearer ${tokenMedico1}`)
      .send({ dataInicio: '2026-12-01', dataFim: '2026-12-05', motivo: 'Viagem' });

    const res = await request(app)
      .delete(`/api/medicos/1/bloqueios/${criaRes.body.id}`)
      .set('Authorization', `Bearer ${tokenMedico1}`);

    expect(res.status).toBe(204);
  });

  /**
   * @caso CT-API-024
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1, RN14, RN16
   * @objetivo Consultar horários livres de um médico para determinada data
   * @resultadoEsperado Status 200 com array de strings 'AAAA-MM-DD HH:mm'
   */
  test('GET /api/medicos/:id/horarios - retorna lista de horários livres', async () => {
    const res = await request(app)
      .get('/api/medicos/1/horarios?data=2026-10-20')
      .set('Authorization', `Bearer ${tokenPaciente}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('horarios');
    expect(Array.isArray(res.body.horarios)).toBe(true);
    expect(res.body.horarios.length).toBeGreaterThan(0);
  });
});
