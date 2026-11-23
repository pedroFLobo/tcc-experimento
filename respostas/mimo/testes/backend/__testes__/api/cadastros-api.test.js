/**
 * API de cadastros (RF02.2, RF03.1, RF04.1) e administração de contas,
 * com as validações RN01, RN03, RN05–RN09 e RN21.
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
let ana;
let tokens;

const novoPaciente = (extra = {}) => ({
  nome: 'Paula Nunes',
  email: 'paula@email.com',
  senha: 'Senha123',
  cpf: '12345678909',
  dataNascimento: '1992-03-10',
  telefone: '(11) 91234-5678',
  ...extra,
});

const novoMedico = (extra = {}) => ({
  nome: 'Dra. Paula Costa',
  email: 'paula@clinica.com',
  senha: 'Senha123',
  crm: '778899/SP',
  especialidadeId: 1,
  duracaoConsultaMin: 45,
  ...extra,
});

beforeEach(async () => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  const dados = semear(db);
  app = criarApp({ db });
  [carlos] = dados.medicos;
  [ana] = dados.pacientes;

  const logar = async (email) => {
    const res = await request(app).post('/api/auth/login').send({ email, senha: 'Senha123' });
    return res.body.token;
  };
  tokens = {
    recepcao: await logar('recepcao@clinica.com'),
    paciente: await logar('ana@email.com'),
  };
});

afterEach(() => {
  clock.definirAgora(null);
  db.close();
});

const comToken = (perfil) => `Bearer ${tokens[perfil]}`;

describe('RF03 — especialidades pela API', () => {
  /**
   * @caso CT-API-083
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.2
   * @objetivo Listar as especialidades para qualquer usuário autenticado
   * @resultadoEsperado a resposta 200 traz as quatro especialidades do seed
   */
  test('GET /api/especialidades devolve as especialidades', async () => {
    const res = await request(app).get('/api/especialidades').set('Authorization', comToken('paciente'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    expect(res.body.some((e) => e.nome === 'Clínica Geral' && e.precoCentavos === 15000)).toBe(true);
  });

  /**
   * @caso CT-API-084
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.1, RN09
   * @objetivo Cadastrar especialidade com nome e preço pela recepção
   * @resultadoEsperado a resposta é 201 com a especialidade criada
   */
  test('POST /api/especialidades responde 201', async () => {
    const res = await request(app)
      .post('/api/especialidades')
      .set('Authorization', comToken('recepcao'))
      .send({ nome: 'Ortopedia', precoCentavos: 22000 });
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Ortopedia');
    expect(res.body.precoCentavos).toBe(22000);
  });

  /**
   * @caso CT-API-085
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN09
   * @objetivo Recusar especialidade com nome repetido
   * @resultadoEsperado a resposta é 409 CONFLITO de especialidade já cadastrada
   */
  test('POST /api/especialidade repetida responde 409', async () => {
    const res = await request(app)
      .post('/api/especialidades')
      .set('Authorization', comToken('recepcao'))
      .send({ nome: 'Cardiologia', precoCentavos: 22000 });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erro: { codigo: 'CONFLITO', mensagem: 'Especialidade já cadastrada.' } });
  });

  /**
   * @caso CT-API-086
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN09
   * @objetivo Recusar preço base igual a zero
   * @resultadoEsperado a resposta é 400 VALIDACAO com a regra do preço
   */
  test('POST /api/especialidade com preço zero responde 400', async () => {
    const res = await request(app)
      .post('/api/especialidades')
      .set('Authorization', comToken('recepcao'))
      .send({ nome: 'Ortopedia', precoCentavos: 0 });
    expect(res.status).toBe(400);
    expect(res.body.erro.mensagem).toBe('Preço deve ser um inteiro em centavos maior que zero.');
  });

  /**
   * @caso CT-API-087
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN09
   * @objetivo Recusar nome de especialidade com menos de 3 caracteres
   * @resultadoEsperado a resposta é 400 VALIDACAO com a regra do nome
   */
  test('POST /api/especialidade com nome curto responde 400', async () => {
    const res = await request(app)
      .post('/api/especialidades')
      .set('Authorization', comToken('recepcao'))
      .send({ nome: 'Ox', precoCentavos: 22000 });
    expect(res.status).toBe(400);
    expect(res.body.erro.mensagem).toBe('Nome da especialidade deve ter pelo menos 3 caracteres.');
  });
});

describe('RF02 — cadastro de pacientes pela API', () => {
  /**
   * @caso CT-API-088
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.2
   * @objetivo Buscar pacientes por nome ou e-mail pela recepção
   * @resultadoEsperado a resposta 200 traz apenas o paciente encontrado
   */
  test('GET /api/pacientes filtra por busca', async () => {
    const res = await request(app).get('/api/pacientes?busca=Ana').set('Authorization', comToken('recepcao'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe('Ana Pereira');
  });

  /**
   * @caso CT-API-089
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.2, RF02.3
   * @objetivo Cadastrar paciente completo pela recepção
   * @resultadoEsperado a resposta é 201 com CPF gravado só com dígitos
   */
  test('POST /api/pacientes responde 201', async () => {
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', comToken('recepcao'))
      .send(novoPaciente({ cpf: '123.456.789-09' }));
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Paula Nunes');
    expect(res.body.cpf).toBe('12345678909');
    expect(res.body.responsavelNome).toBeNull();
  });

  /**
   * @caso CT-API-090
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN03
   * @objetivo Recusar CPF com dígitos verificadores errados
   * @resultadoEsperado a resposta é 400 VALIDACAO com a mensagem de CPF inválido
   */
  test('POST /api/pacientes com CPF inválido responde 400', async () => {
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', comToken('recepcao'))
      .send(novoPaciente({ cpf: '12345678900' }));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: { codigo: 'VALIDACAO', mensagem: 'CPF inválido.' } });
  });

  /**
   * @caso CT-API-091
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN03
   * @objetivo Recusar CPF já cadastrado em outra conta
   * @resultadoEsperado a resposta é 409 CONFLITO de CPF já cadastrado
   */
  test('POST /api/pacientes com CPF repetido responde 409', async () => {
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', comToken('recepcao'))
      .send(novoPaciente({ cpf: '52998224725' }));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erro: { codigo: 'CONFLITO', mensagem: 'CPF já cadastrado.' } });
  });

  /**
   * @caso CT-API-092
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN05
   * @objetivo Recusar data de nascimento futura
   * @resultadoEsperado a resposta é 400 VALIDACAO com a mensagem de data futura
   */
  test('POST /api/pacientes com nascimento futuro responde 400', async () => {
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', comToken('recepcao'))
      .send(novoPaciente({ dataNascimento: '2030-01-01' }));
    expect(res.status).toBe(400);
    expect(res.body.erro.mensagem).toBe('Data de nascimento não pode ser futura.');
  });

  /**
   * @caso CT-API-093
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN05
   * @objetivo Recusar nascimento que indicaria idade acima de 130 anos
   * @resultadoEsperado a resposta é 400 VALIDACAO com o limite de idade
   */
  test('POST /api/pacientes com idade acima de 130 responde 400', async () => {
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', comToken('recepcao'))
      .send(novoPaciente({ dataNascimento: '1890-01-01' }));
    expect(res.status).toBe(400);
    expect(res.body.erro.mensagem).toBe('Idade não pode ser superior a 130 anos.');
  });

  /**
   * @caso CT-API-094
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN06
   * @objetivo Exigir responsável para paciente menor de 18 anos
   * @resultadoEsperado a resposta é 400 VALIDACAO pedindo o nome do responsável
   */
  test('POST /api/paciente menor sem responsável responde 400', async () => {
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', comToken('recepcao'))
      .send(novoPaciente({ dataNascimento: '2016-10-19' }));
    expect(res.status).toBe(400);
    expect(res.body.erro.mensagem).toBe('Paciente menor de 18 anos deve informar o nome do responsável.');
  });

  /**
   * @caso CT-API-095
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN06, RF02.3
   * @objetivo Aceitar paciente menor quando o responsável é informado
   * @resultadoEsperado a resposta é 201 com o responsável gravado
   */
  test('POST /api/paciente menor com responsável responde 201', async () => {
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', comToken('recepcao'))
      .send(novoPaciente({ dataNascimento: '2016-10-19', responsavelNome: 'Marta Oliveira' }));
    expect(res.status).toBe(201);
    expect(res.body.responsavelNome).toBe('Marta Oliveira');
  });

  /**
   * @caso CT-API-096
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN01
   * @objetivo Recusar cadastro com e-mail já usado por outra conta
   * @resultadoEsperado a resposta é 409 CONFLITO de e-mail já cadastrado
   */
  test('POST /api/paciente com e-mail repetido responde 409', async () => {
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', comToken('recepcao'))
      .send(novoPaciente({ email: 'joao@email.com' }));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erro: { codigo: 'CONFLITO', mensagem: 'E-mail já cadastrado.' } });
  });
});

describe('RF04 — cadastro de médicos pela API', () => {
  /**
   * @caso CT-API-097
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04.1
   * @objetivo Cadastrar médico completo pela recepção
   * @resultadoEsperado a resposta é 201 com CRM, especialidade e duração
   */
  test('POST /api/medicos responde 201', async () => {
    const res = await request(app).post('/api/medicos').set('Authorization', comToken('recepcao')).send(novoMedico());
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Dra. Paula Costa');
    expect(res.body.crm).toBe('778899/SP');
    expect(res.body.especialidadeId).toBe(1);
    expect(res.body.duracaoConsultaMin).toBe(45);
  });

  /**
   * @caso CT-API-098
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN07
   * @objetivo Recusar CRM com UF inválida
   * @resultadoEsperado a resposta é 400 VALIDACAO com o formato do CRM
   */
  test('POST /api/medico com CRM inválido responde 400', async () => {
    const res = await request(app)
      .post('/api/medicos')
      .set('Authorization', comToken('recepcao'))
      .send(novoMedico({ crm: '12345/XX' }));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: { codigo: 'VALIDACAO', mensagem: 'CRM inválido. Use o formato 123456/UF.' } });
  });

  /**
   * @caso CT-API-099
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN07
   * @objetivo Recusar CRM já cadastrado
   * @resultadoEsperado a resposta é 409 CONFLITO de CRM já cadastrado
   */
  test('POST /api/medico com CRM repetido responde 409', async () => {
    const res = await request(app)
      .post('/api/medicos')
      .set('Authorization', comToken('recepcao'))
      .send(novoMedico({ crm: carlos.crm }));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erro: { codigo: 'CONFLITO', mensagem: 'CRM já cadastrado.' } });
  });

  /**
   * @caso CT-API-100
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF04.1
   * @objetivo Recusar médico apontando especialidade inexistente
   * @resultadoEsperado a resposta é 400 VALIDACAO dizendo que a especialidade não existe
   */
  test('POST /api/medico com especialidade inexistente responde 400', async () => {
    const res = await request(app)
      .post('/api/medicos')
      .set('Authorization', comToken('recepcao'))
      .send(novoMedico({ especialidadeId: 99999 }));
    expect(res.status).toBe(400);
    expect(res.body.erro.mensagem).toBe('Especialidade inexistente.');
  });

  /**
   * @caso CT-API-101
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN08
   * @objetivo Recusar duração de consulta fora dos múltiplos de 15 entre 15 e 60
   * @resultadoEsperado a resposta é 400 VALIDACAO com a regra da duração
   */
  test('POST /api/medico com duração inválida responde 400', async () => {
    const res = await request(app)
      .post('/api/medicos')
      .set('Authorization', comToken('recepcao'))
      .send(novoMedico({ duracaoConsultaMin: 20 }));
    expect(res.status).toBe(400);
    expect(res.body.erro.mensagem).toBe(
      'Duração da consulta deve ser de 15 a 60 minutos, em múltiplos de 15.',
    );
  });

  /**
   * @caso CT-API-102
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN08
   * @objetivo Aplicar a duração padrão de 30 minutos quando não informada
   * @resultadoEsperado a resposta é 201 com duracaoConsultaMin igual a 30
   */
  test('POST /api/medico sem duração usa 30 minutos', async () => {
    const { duracaoConsultaMin, ...semDuracao } = novoMedico();
    const res = await request(app)
      .post('/api/medicos')
      .set('Authorization', comToken('recepcao'))
      .send(semDuracao);
    expect(res.status).toBe(201);
    expect(res.body.duracaoConsultaMin).toBe(30);
  });
});

describe('RN21 — administração de contas pela API', () => {
  /**
   * @caso CT-API-103
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN21
   * @objetivo Desativar a conta de um usuário pela recepção
   * @resultadoEsperado a resposta é 200 com id e ativo em falso
   */
  test('PATCH /api/admin/usuarios/:id/ativo responde 200', async () => {
    const res = await request(app)
      .patch(`/api/admin/usuarios/${ana.usuarioId}/ativo`)
      .set('Authorization', comToken('recepcao'))
      .send({ ativo: false });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: ana.usuarioId, ativo: false });
    expect(app.locals.servicos.repos.usuarios.buscarPorId(ana.usuarioId).ativo).toBe(false);
  });

  /**
   * @caso CT-API-104
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN21, RNF04
   * @objetivo Recusar ativo que não seja booleano
   * @resultadoEsperado a resposta é 400 VALIDACAO pedindo true ou false
   */
  test('PATCH ativo com valor não booleano responde 400', async () => {
    const res = await request(app)
      .patch(`/api/admin/usuarios/${ana.usuarioId}/ativo`)
      .set('Authorization', comToken('recepcao'))
      .send({ ativo: 'sim' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: { codigo: 'VALIDACAO', mensagem: 'Informe "ativo" como true ou false.' } });
  });

  /**
   * @caso CT-API-105
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN30
   * @objetivo Devolver 404 ao desativar usuário inexistente
   * @resultadoEsperado a resposta é 404 NAO_ENCONTRADO
   */
  test('PATCH de usuário inexistente responde 404', async () => {
    const res = await request(app)
      .patch('/api/admin/usuarios/99999/ativo')
      .set('Authorization', comToken('recepcao'))
      .send({ ativo: false });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Usuário não encontrado.' } });
  });
});
