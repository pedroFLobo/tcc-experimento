/**
 * Autorização por perfil e por dono do recurso (RN30, RF10, RF01.2)
 * nas rotas HTTP da API.
 * Relógio fixado em 2026-10-19 08:00 (segunda-feira).
 */
const request = require('supertest');
const clock = require('../../src/utils/clock');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');

let db;
let app;
let carlos;
let eduardo;
let ana;
let joao;
let tokens;

function inserirConsulta({ pacienteId, medicoId, inicio, fim, status, valorCentavos = 15000 }) {
  const id = app.locals.servicos.repos.consultas.inserir({
    pacienteId,
    medicoId,
    inicio,
    fim,
    valorCentavos,
    retornoDe: null,
    agora: '2026-10-19 08:00',
  });
  if (status) db.prepare('UPDATE consultas SET status = ? WHERE id = ?').run(status, id);
  return id;
}

beforeEach(async () => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  const dados = semear(db);
  app = criarApp({ db });
  [carlos, , eduardo] = dados.medicos;
  [ana, joao] = dados.pacientes;

  const logar = async (email) => {
    const res = await request(app).post('/api/auth/login').send({ email, senha: 'Senha123' });
    return res.body.token;
  };
  tokens = {
    recepcao: await logar('recepcao@clinica.com'),
    paciente: await logar('ana@email.com'),
    medico: await logar('carlos@clinica.com'),
    outroMedico: await logar('eduardo@clinica.com'),
  };
});

afterEach(() => {
  clock.definirAgora(null);
  db.close();
});

const comToken = (perfil) => `Bearer ${tokens[perfil]}`;

describe('RF10 — listagem de consultas por perfil', () => {
  /**
   * @caso CT-API-019
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.1, RN30
   * @objetivo Devolver ao paciente somente as consultas dele na listagem
   * @resultadoEsperado a resposta 200 traz apenas consultas do paciente logado
   */
  test('paciente lista somente as próprias consultas', async () => {
    inserirConsulta({ pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-26 10:00', fim: '2026-10-26 10:30' });
    inserirConsulta({ pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-27 10:00', fim: '2026-10-27 10:30' });
    inserirConsulta({ pacienteId: joao.id, medicoId: carlos.id, inicio: '2026-10-26 11:00', fim: '2026-10-26 11:30' });

    const res = await request(app).get('/api/consultas').set('Authorization', comToken('paciente'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((c) => c.pacienteId === ana.id)).toBe(true);
  });

  /**
   * @caso CT-API-020
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.2, RN30
   * @objetivo Devolver ao médico somente as consultas da própria agenda
   * @resultadoEsperado a resposta 200 traz apenas consultas do médico logado
   */
  test('médico lista somente as consultas da própria agenda', async () => {
    inserirConsulta({ pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-26 10:00', fim: '2026-10-26 10:30' });
    inserirConsulta({ pacienteId: joao.id, medicoId: carlos.id, inicio: '2026-10-26 11:00', fim: '2026-10-26 11:30' });
    inserirConsulta({ pacienteId: ana.id, medicoId: eduardo.id, inicio: '2026-10-27 13:00', fim: '2026-10-27 13:30' });

    const res = await request(app).get('/api/consultas').set('Authorization', comToken('medico'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((c) => c.medicoId === carlos.id)).toBe(true);
  });

  /**
   * @caso CT-API-021
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Aplicar o filtro de status pedido pela recepção na query string
   * @resultadoEsperado a resposta 200 traz só as consultas com o status informado
   */
  test('recepção filtra consultas por status na query string', async () => {
    inserirConsulta({ pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-26 10:00', fim: '2026-10-26 10:30' });
    inserirConsulta({
      pacienteId: joao.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 11:00',
      fim: '2026-10-26 11:30',
      status: 'CANCELADA',
    });

    const res = await request(app).get('/api/consultas?status=CANCELADA').set('Authorization', comToken('recepcao'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('CANCELADA');
  });

  /**
   * @caso CT-API-022
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF10.3
   * @objetivo Recusar filtro de status desconhecido
   * @resultadoEsperado a resposta é 400 VALIDACAO pedindo status válido
   */
  test('filtro de status inválido responde 400', async () => {
    const res = await request(app).get('/api/consultas?status=QUALQUER').set('Authorization', comToken('recepcao'));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: { codigo: 'VALIDACAO', mensagem: 'Status inválido.' } });
  });
});

describe('RN30 — acesso a recursos de outro usuário', () => {
  /**
   * @caso CT-API-023
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30, RF10.1
   * @objetivo Bloquear a leitura de consulta de outro paciente
   * @resultadoEsperado a resposta é 403 SEM_PERMISSAO
   */
  test('paciente lê consulta de outro paciente e recebe 403', async () => {
    const id = inserirConsulta({
      pacienteId: joao.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
    });
    const res = await request(app).get(`/api/consultas/${id}`).set('Authorization', comToken('paciente'));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ erro: { codigo: 'SEM_PERMISSAO', mensagem: 'Você não tem acesso a esta consulta.' } });
  });

  /**
   * @caso CT-API-024
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30, RF10.2
   * @objetivo Bloquear a leitura de consulta da agenda de outro médico
   * @resultadoEsperado a resposta é 403 SEM_PERMISSAO
   */
  test('médico lê consulta de outro médico e recebe 403', async () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
    });
    const res = await request(app).get(`/api/consultas/${id}`).set('Authorization', comToken('outroMedico'));
    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-025
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN30
   * @objetivo Devolver 404 para consulta inexistente em vez de erro genérico
   * @resultadoEsperado a resposta é 404 NAO_ENCONTRADO
   */
  test('consulta inexistente responde 404', async () => {
    const res = await request(app).get('/api/consultas/99999').set('Authorization', comToken('recepcao'));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Consulta não encontrada.' } });
  });

  /**
   * @caso CT-API-026
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RF08.1
   * @objetivo Recusar agendamento em nome de outra pessoa pelo paciente
   * @resultadoEsperado a resposta é 403 SEM_PERMISSAO
   */
  test('paciente agenda para outro e recebe 403', async () => {
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', comToken('paciente'))
      .send({ pacienteId: joao.id, medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    expect(res.status).toBe(403);
    expect(res.body.erro.mensagem).toBe('Você só pode agendar consultas para si mesmo.');
  });

  /**
   * @caso CT-API-027
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RF04.1
   * @objetivo Recusar agendamento feito por conta de médico
   * @resultadoEsperado a resposta é 403 SEM_PERMISSAO orientando a recepção
   */
  test('médico agenda consulta e recebe 403', async () => {
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', comToken('medico'))
      .send({ medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    expect(res.status).toBe(403);
    expect(res.body.erro.mensagem).toBe('Médicos não agendam consultas. Procure a recepção.');
  });

  /**
   * @caso CT-API-028
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RN28
   * @objetivo Recusar registro de atendimento por paciente
   * @resultadoEsperado a resposta é 403 SEM_PERMISSAO
   */
  test('paciente registra atendimento e recebe 403', async () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
    });
    const res = await request(app)
      .post(`/api/consultas/${id}/realizar`)
      .set('Authorization', comToken('paciente'))
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.erro.mensagem).toBe('Somente o médico da consulta pode registrar o atendimento.');
  });

  /**
   * @caso CT-API-029
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RN29
   * @objetivo Recusar registro de falta por paciente
   * @resultadoEsperado a resposta é 403 SEM_PERMISSAO
   */
  test('paciente registra falta e recebe 403', async () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
    });
    const res = await request(app).post(`/api/consultas/${id}/falta`).set('Authorization', comToken('paciente'));
    expect(res.status).toBe(403);
    expect(res.body.erro.mensagem).toBe('Somente o médico da consulta ou a recepção podem registrar falta.');
  });

  /**
   * @caso CT-API-030
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RF09.2
   * @objetivo Recusar cancelamento de consulta de outro paciente pela API
   * @resultadoEsperado a resposta é 403 SEM_PERMISSAO
   */
  test('paciente cancela consulta de outro e recebe 403', async () => {
    const id = inserirConsulta({
      pacienteId: joao.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
    });
    const res = await request(app)
      .post(`/api/consultas/${id}/cancelar`)
      .set('Authorization', comToken('paciente'))
      .send({ motivo: 'Só para ver' });
    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });
});

describe('RN30 — listagens e cadastros protegidos por perfil', () => {
  /**
   * @caso CT-API-031
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RF02.2
   * @objetivo Reservar a listagem de pacientes à recepção
   * @resultadoEsperado a resposta para paciente é 403 SEM_PERMISSAO
   */
  test('paciente não lista pacientes e recebe 403', async () => {
    const res = await request(app).get('/api/pacientes').set('Authorization', comToken('paciente'));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ erro: { codigo: 'SEM_PERMISSAO', mensagem: 'Você não tem permissão para esta operação.' } });
  });

  /**
   * @caso CT-API-032
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30
   * @objetivo Bloquear a leitura de cadastro de outro paciente
   * @resultadoEsperado a resposta é 403 SEM_PERMISSAO com a mensagem de acesso
   */
  test('paciente lê cadastro de outro paciente e recebe 403', async () => {
    const res = await request(app).get(`/api/pacientes/${joao.id}`).set('Authorization', comToken('paciente'));
    expect(res.status).toBe(403);
    expect(res.body.erro.mensagem).toBe('Você não tem acesso a este paciente.');
  });

  /**
   * @caso CT-API-033
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN30
   * @objetivo Devolver 404 para paciente inexistente
   * @resultadoEsperado a resposta é 404 NAO_ENCONTRADO
   */
  test('paciente inexistente responde 404', async () => {
    const res = await request(app).get('/api/pacientes/99999').set('Authorization', comToken('recepcao'));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Paciente não encontrado.' } });
  });

  /**
   * @caso CT-API-034
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RF03.1
   * @objetivo Reservar a criação de especialidade à recepção
   * @resultadoEsperado a resposta para paciente é 403 SEM_PERMISSAO
   */
  test('paciente cria especialidade e recebe 403', async () => {
    const res = await request(app)
      .post('/api/especialidades')
      .set('Authorization', comToken('paciente'))
      .send({ nome: 'Ortopedia', precoCentavos: 20000 });
    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-035
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RF04.1
   * @objetivo Reservar a criação de médico à recepção
   * @resultadoEsperado a resposta para médico é 403 SEM_PERMISSAO
   */
  test('médico cria outro médico e recebe 403', async () => {
    const res = await request(app)
      .post('/api/medicos')
      .set('Authorization', comToken('medico'))
      .send({ nome: 'Outro Médico', email: 'outro@clinica.com', senha: 'Senha123', crm: '778899/SP', especialidadeId: 1 });
    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-036
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RF05.1
   * @objetivo Impedir que médico edite a grade de outro médico
   * @resultadoEsperado a resposta é 403 com a mensagem de agenda própria
   */
  test('médico edita grade alheia e recebe 403', async () => {
    const res = await request(app)
      .put(`/api/medicos/${carlos.id}/disponibilidades`)
      .set('Authorization', comToken('outroMedico'))
      .send({ blocos: [{ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' }] });
    expect(res.status).toBe(403);
    expect(res.body.erro.mensagem).toBe('Você só pode gerenciar a sua própria agenda.');
  });

  /**
   * @caso CT-API-037
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RF06.1
   * @objetivo Impedir que médico veja os bloqueios de outro médico
   * @resultadoEsperado a resposta é 403 com a mensagem de agenda própria
   */
  test('médico lê bloqueios alheios e recebe 403', async () => {
    const res = await request(app)
      .get(`/api/medicos/${carlos.id}/bloqueios`)
      .set('Authorization', comToken('outroMedico'));
    expect(res.status).toBe(403);
    expect(res.body.erro.mensagem).toBe('Você só pode gerenciar a sua própria agenda.');
  });

  /**
   * @caso CT-API-038
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RF06.1
   * @objetivo Reservar a criação de bloqueio ao médico dono e à recepção
   * @resultadoEsperado a resposta para paciente é 403 SEM_PERMISSAO
   */
  test('paciente cria bloqueio e recebe 403', async () => {
    const res = await request(app)
      .post(`/api/medicos/${carlos.id}/bloqueios`)
      .set('Authorization', comToken('paciente'))
      .send({ dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Férias' });
    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-039
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RF11.1
   * @objetivo Reservar o relatório à recepção
   * @resultadoEsperado a resposta para médico é 403 SEM_PERMISSAO
   */
  test('médico consulta relatório e recebe 403', async () => {
    const res = await request(app)
      .get('/api/admin/relatorios/resumo?dataInicio=2026-10-01&dataFim=2026-10-31')
      .set('Authorization', comToken('medico'));
    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-040
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RN21
   * @objetivo Reservar a ativação de contas à recepção
   * @resultadoEsperado a resposta para paciente é 403 SEM_PERMISSAO
   */
  test('paciente ativa conta de usuário e recebe 403', async () => {
    const res = await request(app)
      .patch(`/api/admin/usuarios/${joao.id}/ativo`)
      .set('Authorization', comToken('paciente'))
      .send({ ativo: false });
    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-041
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.1
   * @objetivo Permitir que qualquer usuário autenticado leia a grade do médico
   * @resultadoEsperado a resposta é 200 com a lista de blocos da grade
   */
  test('paciente lê a grade do médico com 200', async () => {
    const res = await request(app)
      .get(`/api/medicos/${carlos.id}/disponibilidades`)
      .set('Authorization', comToken('paciente'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('diaSemana');
    expect(res.body[0]).toHaveProperty('horaInicio');
  });

  /**
   * @caso CT-API-042
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2
   * @objetivo Exigir token nas rotas de consulta
   * @resultadoEsperado a requisição sem token responde 401 NAO_AUTENTICADO
   */
  test('consulta de rotas protegidas sem token responde 401', async () => {
    const res = await request(app).get('/api/consultas');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Autenticação necessária.' } });
  });
});
