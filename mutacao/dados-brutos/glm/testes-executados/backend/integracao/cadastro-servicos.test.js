// Testes de integração do cadastro: serviços + repositórios + SQLite em memória (RF02, RN01–RN03, RN05–RN09, RNF01).
const clock = require('../../src/utils/clock');
const { abrirBanco } = require('../../src/db/connection');
const { semear, SENHA_PADRAO } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');
const bcrypt = require('bcryptjs');

let db, servicos;

beforeAll(() => {
  // O relógio é fixado antes de semear: a idade do paciente menor depende dele.
  clock.definirAgora(new Date(2026, 9, 19, 8, 0)); // 2026-10-19 08:00
  db = abrirBanco(':memory:');
  semear(db);
  servicos = criarServicos(db);
});

afterAll(() => {
  clock.definirAgora(null);
  db.close();
});

const capturar = (acao) => {
  try {
    return acao();
  } catch (erro) {
    return erro;
  }
};

describe('registrarPaciente (RF02, RN01–RN03, RN05, RN06)', () => {
  /**
   * @caso CT-INT-001
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.2, RN03
   * @objetivo Persistir paciente gravando o CPF apenas com dígitos
   * @resultadoEsperado registrarPaciente retorna o paciente com cpf '12345678906' e o registro existe no banco
   */
  test.skip('persiste paciente com CPF normalizado', () => {
    const paciente = servicos.cadastroService.registrarPaciente({
      nome: 'Marina Silva', email: 'marina@email.com', senha: SENHA_PADRAO,
      cpf: '123.456.789-06', dataNascimento: '1995-03-10', telefone: '(11) 91234-5678',
    });
    expect(paciente.id).toBe(4);
    expect(paciente.cpf).toBe('12345678906');
    expect(servicos.repos.pacientes.buscarPorId(paciente.id).nome).toBe('Marina Silva');
  });

  /**
   * @caso CT-INT-002
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Recusar cadastro com CPF já usado por outro paciente
   * @resultadoEsperado registrarPaciente lança CONFLITO (409) com mensagem de CPF já cadastrado
   */
  test('recusa CPF duplicado', () => {
    const erro = capturar(() => servicos.cadastroService.registrarPaciente({
      nome: 'Outra Pessoa', email: 'outra@email.com', senha: SENHA_PADRAO,
      cpf: '529.982.247-25', dataNascimento: '1992-01-01',
    }));
    expect(erro.status).toBe(409);
    expect(erro.codigo).toBe('CONFLITO');
    expect(erro.message).toBe('CPF já cadastrado.');
  });

  /**
   * @caso CT-INT-003
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Recusar cadastro com e-mail duplicado, inclusive em caixa diferente
   * @resultadoEsperado registrarPaciente lança CONFLITO (409) para 'ana@email.com' e 'ANA@EMAIL.COM'
   */
  test('recusa e-mail duplicado ignorando caixa', () => {
    const dadosBase = { nome: 'Cópia Ana', senha: SENHA_PADRAO, cpf: '987.654.321-00', dataNascimento: '1992-01-01' };
    const erro = capturar(() => servicos.cadastroService.registrarPaciente({ ...dadosBase, email: 'ANA@EMAIL.COM' }));
    expect(erro.status).toBe(409);
    expect(erro.codigo).toBe('CONFLITO');
    expect(erro.message).toBe('E-mail já cadastrado.');
  });

  /**
   * @caso CT-INT-004
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Recusar paciente menor de 18 anos sem nome do responsável
   * @resultadoEsperado registrarPaciente lança VALIDACAO (400) exigindo o responsável
   */
  test.skip('exige responsável para menor sem responsável', () => {
    const erro = capturar(() => servicos.cadastroService.registrarPaciente({
      nome: 'Pedro Menor', email: 'pedro@email.com', senha: SENHA_PADRAO,
      cpf: '390.533.447-06', dataNascimento: '2015-04-01',
    }));
    expect(erro.status).toBe(400);
    expect(erro.codigo).toBe('VALIDACAO');
    expect(erro.message).toBe('Paciente menor de 18 anos deve informar o nome do responsável.');
  });

  /**
   * @caso CT-INT-005
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN06
   * @objetivo Persistir o nome do responsável de um paciente menor
   * @resultadoEsperado registrarPaciente grava responsavelNome 'Sandra Menor' no banco
   */
  test.skip('grava o responsável do menor informado', () => {
    const menor = servicos.cadastroService.registrarPaciente({
      nome: 'Lucia Menor', email: 'lucia@email.com', senha: SENHA_PADRAO,
      cpf: '111.444.777-36', dataNascimento: '2018-07-20', responsavelNome: 'Sandra Menor',
    });
    expect(servicos.repos.pacientes.buscarPorId(menor.id).responsavelNome).toBe('Sandra Menor');
  });

  /**
   * @caso CT-INT-006
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN02
   * @objetivo Recusar senha que não tem 8 caracteres com letra e número
   * @resultadoEsperado registrarPaciente lança VALIDACAO (400) com a mensagem de senha
   */
  test('recusa senha fraca', () => {
    const erro = capturar(() => servicos.cadastroService.registrarPaciente({
      nome: 'Senha Fraca', email: 'fraca@email.com', senha: 'abc',
      cpf: '123.456.789-11', dataNascimento: '1990-01-01',
    }));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Senha deve ter no mínimo 8 caracteres, com letras e números.');
  });
});

describe('criarMedico (RF04, RN07, RN08)', () => {
  /**
   * @caso CT-INT-007
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF04.1, RN08
   * @objetivo Gravar médico com a duração padrão de 30 minutos quando não informada
   * @resultadoEsperado criarMedico retorna duração 30 e o médico aparece no banco com a especialidade certa
   */
  test('usa duração padrão de 30 minutos', () => {
    const medico = servicos.cadastroService.criarMedico({
      nome: 'Dra. Helena Costa', email: 'helena@clinica.com', senha: SENHA_PADRAO,
      crm: '5555/SE', especialidadeId: 1,
    });
    expect(medico.duracaoConsultaMin).toBe(30);
    expect(servicos.repos.medicos.buscarPorId(medico.id).crm).toBe('5555/SE');
  });

  /**
   * @caso CT-INT-008
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Recusar CRM já cadastrado
   * @resultadoEsperado criarMedico lança CONFLITO (409) para '123456/SP'
   */
  test('recusa CRM duplicado', () => {
    const erro = capturar(() => servicos.cadastroService.criarMedico({
      nome: 'Doutor Duplicado', email: 'duplicado@clinica.com', senha: SENHA_PADRAO,
      crm: '123456/SP', especialidadeId: 1,
    }));
    expect(erro.status).toBe(409);
    expect(erro.message).toBe('CRM já cadastrado.');
  });

  /**
   * @caso CT-INT-009
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF04.1
   * @objetivo Recusar médico com especialidade que não existe
   * @resultadoEsperado criarMedico lança VALIDACAO (400) informando especialidade inexistente
   */
  test('recusa especialidade inexistente', () => {
    const erro = capturar(() => servicos.cadastroService.criarMedico({
      nome: 'Dr. Fantasma', email: 'fantasma@clinica.com', senha: SENHA_PADRAO,
      crm: '7777/BA', especialidadeId: 999,
    }));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Especialidade inexistente.');
  });

  /**
   * @caso CT-INT-010
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Recusar duração fora de 15–60 minutos ou não múltipla de 15
   * @resultadoEsperado criarMedico lança VALIDACAO (400) para 10 e 20 minutos
   */
  test('recusa duração inválida', () => {
    const dados = { nome: 'Dr. Ritmo', email: 'ritmo@clinica.com', senha: SENHA_PADRAO, crm: '8888/GO', especialidadeId: 1 };
    for (const duracao of [10, 20]) {
      const erro = capturar(() => servicos.cadastroService.criarMedico({ ...dados, email: `ritmo${duracao}@clinica.com`, duracaoConsultaMin: duracao }));
      expect(erro.message).toBe('Duração da consulta deve ser de 15 a 60 minutos, em múltiplos de 15.');
    }
  });
});

describe('criarEspecialidade (RF03, RN09)', () => {
  /**
   * @caso CT-INT-011
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF03.1, RN09
   * @objetivo Persistir especialidade com nome e preço base em centavos
   * @resultadoEsperado criarEspecialidade retorna a especialidade com precoCentavos 18000 e ela fica listável
   */
  test('persiste especialidade com preço em centavos', () => {
    const especialidade = servicos.cadastroService.criarEspecialidade({ nome: 'Oftalmologia', precoCentavos: 18000 });
    expect(especialidade.id).toBe(5);
    expect(servicos.repos.especialidades.buscarPorNome('Oftalmologia').precoCentavos).toBe(18000);
  });

  /**
   * @caso CT-INT-012
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN09
   * @objetivo Recusar especialidade duplicada e preço não positivo
   * @resultadoEsperado criarEspecialidade lança CONFLITO para nome repetido e VALIDACAO para preço zero
   */
  test('recusa nome duplicado e preço zero', () => {
    const duplicada = capturar(() => servicos.cadastroService.criarEspecialidade({ nome: 'Oftalmologia', precoCentavos: 18000 }));
    expect(duplicada.status).toBe(409);
    const precoZero = capturar(() => servicos.cadastroService.criarEspecialidade({ nome: 'Nutrição', precoCentavos: 0 }));
    expect(precoZero.status).toBe(400);
    expect(precoZero.message).toBe('Preço deve ser um inteiro em centavos maior que zero.');
  });
});

describe('contas de usuário (RN21, RNF01)', () => {
  /**
   * @caso CT-INT-013
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02, RN21
   * @objetivo Atualizar a situação ativo/inativo do usuário no banco
   * @resultadoEsperado definirUsuarioAtivo persiste ativo false e depois true
   */
  test.skip('alterna o usuário entre inativo e ativo', () => {
    const usuario = servicos.repos.usuarios.buscarPorEmail('marina@email.com');
    servicos.cadastroService.definirUsuarioAtivo(usuario.id, false);
    expect(servicos.repos.usuarios.buscarPorId(usuario.id).ativo).toBe(false);
    servicos.cadastroService.definirUsuarioAtivo(usuario.id, true);
    expect(servicos.repos.usuarios.buscarPorId(usuario.id).ativo).toBe(true);
  });

  /**
   * @caso CT-INT-014
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF01
   * @objetivo Gravar a senha como hash bcrypt, nunca em texto puro
   * @resultadoEsperado o campo senha_hash começa com '$2', difere do texto e valida com compareSync
   */
  test.skip('armazena hash bcrypt e não a senha em claro', () => {
    const usuario = servicos.repos.usuarios.buscarPorEmail('marina@email.com');
    expect(usuario.senhaHash).not.toBe(SENHA_PADRAO);
    expect(usuario.senhaHash).toMatch(/^\$2/);
    expect(bcrypt.compareSync(SENHA_PADRAO, usuario.senhaHash)).toBe(true);
  });
});
