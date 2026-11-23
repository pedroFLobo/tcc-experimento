// Testes de API de cadastros e administração (RF02–RF04, RN07–RN09, RN21, RN30, RNF04).
const clock = require('../../src/utils/clock');
const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');

let db, app, tokenRecepcao, tokenPaciente, tokenMedico, pacienteNovo;

beforeAll(async () => {
  clock.definirAgora(new Date(2026, 9, 19, 8, 0)); // 2026-10-19 08:00, segunda-feira
  db = abrirBanco(':memory:');
  semear(db);
  app = criarApp({ db });
  const entrar = async (email) => {
    const r = await request(app).post('/api/auth/login').send({ email, senha: 'Senha123' });
    return r.body.token;
  };
  tokenRecepcao = await entrar('recepcao@clinica.com');
  tokenPaciente = await entrar('ana@email.com');
  tokenMedico = await entrar('carlos@clinica.com');
  pacienteNovo = (await request(app).post('/api/pacientes')
    .set('Authorization', `Bearer ${tokenRecepcao}`)
    .send({
      nome: 'Hugo Barbosa', email: 'hugo@email.com', senha: 'Senha123',
      cpf: '123.456.789-06', dataNascimento: '1988-11-30', telefone: '(11) 93333-4040',
    })).body;
});

afterAll(() => {
  clock.definirAgora(null);
  db.close();
});

describe('especialidades (RF03, RN09)', () => {
  /**
   * @caso CT-API-016
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF03.2
   * @objetivo Listar especialidades com qualquer usuário autenticado
   * @resultadoEsperado paciente autenticado recebe 200 com as 4 especialidades da base
   */
  test('paciente autenticado lista especialidades', async () => {
    const r = await request(app).get('/api/especialidades').set('Authorization', `Bearer ${tokenPaciente}`);
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(4);
    expect(r.body[0]).toHaveProperty('precoCentavos');
  });

  /**
   * @caso CT-API-017
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2
   * @objetivo Exigir token para listar especialidades
   * @resultadoEsperado requisição anônima devolve 401 NAO_AUTENTICADO
   */
  test('listagem sem token retorna 401', async () => {
    const r = await request(app).get('/api/especialidades');
    expect(r.status).toBe(401);
    expect(r.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  /**
   * @caso CT-API-018
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF03.1, RN09
   * @objetivo Cadastrar especialidade pela recepção com nome e preço base
   * @resultadoEsperado resposta 201 com a especialidade criada e precoCentavos 18000
   */
  test('recepção cadastra especialidade', async () => {
    const r = await request(app).post('/api/especialidades')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ nome: 'Oftalmologia', precoCentavos: 18000 });
    expect(r.status).toBe(201);
    expect(r.body.nome).toBe('Oftalmologia');
    expect(r.body.precoCentavos).toBe(18000);
  });

  /**
   * @caso CT-API-019
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF03.1, RN30
   * @objetivo Impedir que paciente cadastre especialidade
   * @resultadoEsperado resposta 403 SEM_PERMISSAO
   */
  test('paciente não cadastra especialidade', async () => {
    const r = await request(app).post('/api/especialidades')
      .set('Authorization', `Bearer ${tokenPaciente}`)
      .send({ nome: 'Fraude', precoCentavos: 1000 });
    expect(r.status).toBe(403);
    expect(r.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-020
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN09
   * @objetivo Recusar especialidade com nome já existente
   * @resultadoEsperado resposta 409 CONFLITO 'Especialidade já cadastrada.'
   */
  test('nome duplicado retorna 409', async () => {
    const r = await request(app).post('/api/especialidades')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ nome: 'Cardiologia', precoCentavos: 10000 });
    expect(r.status).toBe(409);
    expect(r.body.erro.mensagem).toBe('Especialidade já cadastrada.');
  });

  /**
   * @caso CT-API-021
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN09
   * @objetivo Recusar especialidade com preço não positivo
   * @resultadoEsperado resposta 400 VALIDACAO com a mensagem de preço
   */
  test('preço zero retorna 400', async () => {
    const r = await request(app).post('/api/especialidades')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ nome: 'Gratuita', precoCentavos: 0 });
    expect(r.status).toBe(400);
    expect(r.body.erro.mensagem).toBe('Preço deve ser um inteiro em centavos maior que zero.');
  });
});

describe('médicos (RF04, RN07, RN08)', () => {
  /**
   * @caso CT-API-022
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF04.1, RN08
   * @objetivo Cadastrar médico pela recepção com duração padrão de 30 minutos
   * @resultadoEsperado resposta 201 com crm gravado e duracaoConsultaMin 30 omitido o campo
   */
  test('recepção cadastra médico com duração padrão', async () => {
    const r = await request(app).post('/api/medicos')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({
        nome: 'Dr. Otávio Prado', email: 'otavio@clinica.com', senha: 'Senha123',
        crm: '555555/SP', especialidadeId: 2,
      });
    expect(r.status).toBe(201);
    expect(r.body.crm).toBe('555555/SP');
    expect(r.body.duracaoConsultaMin).toBe(30);
  });

  /**
   * @caso CT-API-023
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF04.1, RN30
   * @objetivo Impedir que paciente cadastre médicos
   * @resultadoEsperado resposta 403 SEM_PERMISSAO
   */
  test('paciente não cadastra médico', async () => {
    const r = await request(app).post('/api/medicos')
      .set('Authorization', `Bearer ${tokenPaciente}`)
      .send({ nome: 'X', email: 'x@clinica.com', senha: 'Senha123', crm: '777777/SP', especialidadeId: 1 });
    expect(r.status).toBe(403);
    expect(r.body.erro.codigo).toBe('SEM_PERMISSAO');
  });
});

  /**
   * @caso CT-API-024
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Recusar médico com CRM já cadastrado
   * @resultadoEsperado resposta 409 CONFLITO 'CRM já cadastrado.'
   */
  test('CRM duplicado retorna 409', async () => {
    const r = await request(app).post('/api/medicos')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({
        nome: 'Dr. Duplicado', email: 'duplicado@clinica.com', senha: 'Senha123',
        crm: '123456/SP', especialidadeId: 1,
      });
    expect(r.status).toBe(409);
    expect(r.body.erro.mensagem).toBe('CRM já cadastrado.');
  });

  /**
   * @caso CT-API-025
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN08
   * @objetivo Recusar duração fora dos múltiplos de 15 entre 15 e 60
   * @resultadoEsperado resposta 400 VALIDACAO com a mensagem de duração
   */
  test('duração inválida retorna 400', async () => {
    const r = await request(app).post('/api/medicos')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({
        nome: 'Dr. Rápido', email: 'rapido@clinica.com', senha: 'Senha123',
        crm: '222222/SP', especialidadeId: 1, duracaoConsultaMin: 20,
      });
    expect(r.status).toBe(400);
    expect(r.body.erro.mensagem).toBe('Duração da consulta deve ser de 15 a 60 minutos, em múltiplos de 15.');
  });

  /**
   * @caso CT-API-026
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF01.2
   * @objetivo Listar médicos filtrando por especialidade via query string
   * @resultadoEsperado GET /api/medicos?especialidadeId=2 devolve só a Dra. Beatriz
   */
  test('lista médicos filtrada por especialidade', async () => {
    const r = await request(app).get('/api/medicos?especialidadeId=2').set('Authorization', `Bearer ${tokenPaciente}`);
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(1);
    expect(r.body[0].nome).toBe('Dra. Beatriz Souza');
  });

  /**
   * @caso CT-API-027
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.2
   * @objetivo Consultar um médico pelo id com a especialidade embutida
   * @resultadoEsperado GET /api/medicos/1 devolve 200 Carlos com especialidadeNome
   */
  test('busca médico por id', async () => {
    const r = await request(app).get('/api/medicos/1').set('Authorization', `Bearer ${tokenPaciente}`);
    expect(r.status).toBe(200);
    expect(r.body.nome).toBe('Dr. Carlos Almeida');
    expect(r.body.especialidadeNome).toBe('Clínica Geral');
  });
});

describe('pacientes (RF02, RN30)', () => {
  /**
   * @caso CT-API-028
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.2
   * @objetivo Cadastrar paciente pela recepção
   * @resultadoEsperado resposta 201 com o paciente criado (feito no beforeAll: Hugo Barbosa)
   */
  test('recepção cadastra paciente', () => {
    expect(pacienteNovo.nome).toBe('Hugo Barbosa');
    expect(pacienteNovo.id).toBeGreaterThan(0);
  });

  /**
   * @caso CT-API-029
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF02.2, RN30
   * @objetivo Impedir que paciente cadastre outros pacientes
   * @resultadoEsperado resposta 403 SEM_PERMISSAO
   */
  test('paciente não cadastra paciente', async () => {
    const r = await request(app).post('/api/pacientes')
      .set('Authorization', `Bearer ${tokenPaciente}`)
      .send({ nome: 'Fantasma', email: 'fantasma@email.com', senha: 'Senha123', cpf: '111.444.777-35', dataNascimento: '1990-01-01' });
    expect(r.status).toBe(403);
  });

  /**
   * @caso CT-API-030
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.2, RN30
   * @objetivo Restringir a listagem de pacientes à recepção
   * @resultadoEsperado recepção recebe 200 com todos os pacientes; paciente recebe 403
   */
  test('listagem de pacientes é exclusiva da recepção', async () => {
    const ok = await request(app).get('/api/pacientes').set('Authorization', `Bearer ${tokenRecepcao}`);
    expect(ok.status).toBe(200);
    expect(ok.body.length).toBeGreaterThanOrEqual(5);
    const negado = await request(app).get('/api/pacientes').set('Authorization', `Bearer ${tokenPaciente}`);
    expect(negado.status).toBe(403);
  });

  /**
   * @caso CT-API-031
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.1, RN30
   * @objetivo Permitir ao paciente acessar apenas o próprio cadastro
   * @resultadoEsperado GET /api/pacientes/:id próprio devolve 200; alheio devolve 403
   */
  test('paciente acessa só o próprio cadastro', async () => {
    const proprio = await request(app).get('/api/pacientes/1').set('Authorization', `Bearer ${tokenPaciente}`);
    expect(proprio.status).toBe(200);
    expect(proprio.body.nome).toBe('Ana Pereira');
    const alheio = await request(app).get('/api/pacientes/2').set('Authorization', `Bearer ${tokenPaciente}`);
    expect(alheio.status).toBe(403);
    expect(alheio.body.erro.mensagem).toBe('Você não tem acesso a este paciente.');
  });
});

  /**
   * @caso CT-API-032
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN30
   * @objetivo Retornar 404 para paciente inexistente
   * @resultadoEsperado GET /api/pacientes/9999 devolve 404 NAO_ENCONTRADO 'Paciente não encontrado.'
   */
  test('paciente inexistente retorna 404', async () => {
    const r = await request(app).get('/api/pacientes/9999').set('Authorization', `Bearer ${tokenRecepcao}`);
    expect(r.status).toBe(404);
    expect(r.body.erro.codigo).toBe('NAO_ENCONTRADO');
    expect(r.body.erro.mensagem).toBe('Paciente não encontrado.');
  });
});

describe('administração e relatórios (RN21, RF11, RNF04)', () => {
  /**
   * @caso CT-API-033
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Ativar e desativar a conta de um usuário pela recepção
   * @resultadoEsperado PATCH /api/admin/usuarios/:id/ativo alterna ativo para false e true com 200
   */
  test('recepção desativa e reativa usuário', async () => {
    const desativar = await request(app).patch(`/api/admin/usuarios/${pacienteNovo.usuarioId}/ativo`)
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ ativo: false });
    expect(desativar.status).toBe(200);
    expect(desativar.body.ativo).toBe(false);
    const reativar = await request(app).patch(`/api/admin/usuarios/${pacienteNovo.usuarioId}/ativo`)
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ ativo: true });
    expect(reativar.body.ativo).toBe(true);
  });

  /**
   * @caso CT-API-034
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN21, RN30
   * @objetivo Impedir que paciente altere contas de usuários
   * @resultadoEsperado resposta 403 SEM_PERMISSAO
   */
  test('paciente não altera contas', async () => {
    const r = await request(app).patch('/api/admin/usuarios/1/ativo')
      .set('Authorization', `Bearer ${tokenPaciente}`)
      .send({ ativo: false });
    expect(r.status).toBe(403);
    expect(r.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-035
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN21, RNF04
   * @objetivo Recusar corpo sem boolean em ativo
   * @resultadoEsperado resposta 400 VALIDACAO pedindo true ou false
   */
  test('campo ativo inválido retorna 400', async () => {
    const r = await request(app).patch('/api/admin/usuarios/1/ativo')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ ativo: 'sim' });
    expect(r.status).toBe(400);
    expect(r.body.erro.mensagem).toBe('Informe "ativo" como true ou false.');
  });

  /**
   * @caso CT-API-036
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Emitir o relatório resumo do período pela recepção
   * @resultadoEsperado resposta 200 com periodo, porStatus, faltasPorMedico e faturamentoCentavos
   */
  test('recepção obtém relatório resumo', async () => {
    const r = await request(app)
      .get('/api/admin/relatorios/resumo?dataInicio=2026-10-01&dataFim=2026-10-31')
      .set('Authorization', `Bearer ${tokenRecepcao}`);
    expect(r.status).toBe(200);
    expect(r.body.porStatus).toEqual({ AGENDADA: 0, CONFIRMADA: 0, REALIZADA: 0, FALTA: 0, CANCELADA: 0 });
    expect(r.body.faturamentoCentavos).toBe(0);
    expect(Array.isArray(r.body.faltasPorMedico)).toBe(true);
  });

  /**
   * @caso CT-API-037
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF11.1, RN30
   * @objetivo Restringir relatórios à recepção
   * @resultadoEsperado médico autenticado recebe 403 SEM_PERMISSAO
   */
  test('médico não emite relatórios', async () => {
    const r = await request(app)
      .get('/api/admin/relatorios/resumo?dataInicio=2026-10-01&dataFim=2026-10-31')
      .set('Authorization', `Bearer ${tokenMedico}`);
    expect(r.status).toBe(403);
  });

  /**
   * @caso CT-API-038
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF11.1, RNF04
   * @objetivo Exigir as datas do período no relatório
   * @resultadoEsperado resposta 400 VALIDACAO pedindo dataInicio e dataFim
   */
  test('relatório sem datas retorna 400', async () => {
    const r = await request(app).get('/api/admin/relatorios/resumo').set('Authorization', `Bearer ${tokenRecepcao}`);
    expect(r.status).toBe(400);
    expect(r.body.erro.mensagem).toBe('Informe dataInicio e dataFim no formato AAAA-MM-DD.');
  });

  /**
   * @caso CT-API-039
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF04
   * @objetivo Responder com 404 padronizado em rota inexistente
   * @resultadoEsperado GET /api/inexistente devolve 404 NAO_ENCONTRADO 'Rota não encontrada.'
   */
  test('rota inexistente retorna 404 padronizado', async () => {
    const r = await request(app).get('/api/inexistente').set('Authorization', `Bearer ${tokenPaciente}`);
    expect(r.status).toBe(404);
    expect(r.body.erro.codigo).toBe('NAO_ENCONTRADO');
    expect(r.body.erro.mensagem).toBe('Rota não encontrada.');
  });
});
