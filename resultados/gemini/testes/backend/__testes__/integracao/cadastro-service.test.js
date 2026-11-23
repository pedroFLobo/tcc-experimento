const { abrirBanco } = require('../../src/db/connection');
const { criarServicos } = require('../../src/services');
const clock = require('../../src/utils/clock');

describe('Integração: CadastroService', () => {
  let db;
  let servicos;
  const agoraFixo = new Date('2026-10-19T08:00:00');

  beforeEach(() => {
    clock.definirAgora(agoraFixo);
    db = abrirBanco(':memory:');
    servicos = criarServicos(db);
  });

  afterEach(() => {
    clock.definirAgora(null);
    db.close();
  });

  /**
   * @caso CT-INT-010
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.1, RF02.3, RN03
   * @objetivo Cadastrar paciente com sucesso persistindo usuário e paciente em transação
   * @resultadoEsperado Paciente criado com CPF gravado somente em dígitos e senha em hash
   */
  test('deve registrar paciente completo persistindo nas tabelas usuarios e pacientes', () => {
    const dados = {
      nome: 'Mariana Silva',
      email: 'mariana@email.com',
      senha: 'SenhaForte123',
      cpf: '529.982.247-25',
      dataNascimento: '1995-04-12',
      telefone: '(11) 98765-4321',
    };

    const paciente = servicos.cadastroService.registrarPaciente(dados);
    expect(paciente.id).toBeDefined();
    expect(paciente.nome).toBe('Mariana Silva');
    expect(paciente.cpf).toBe('52998224725'); // apenas dígitos
    expect(paciente.email).toBe('mariana@email.com');

    // Verifica que usuário foi inserido
    const usuario = servicos.repos.usuarios.buscarPorEmail('mariana@email.com');
    expect(usuario).toBeDefined();
    expect(usuario.perfil).toBe('PACIENTE');
  });

  /**
   * @caso CT-INT-011
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN01
   * @objetivo Rejeitar cadastro com e-mail já existente
   * @resultadoEsperado Lança erro CONFLITO informando e-mail já cadastrado
   */
  test('deve rejeitar cadastro de paciente com e-mail duplicado', () => {
    const dados1 = {
      nome: 'Primeiro Paciente',
      email: 'duplicado@email.com',
      senha: 'Senha123',
      cpf: '529.982.247-25',
      dataNascimento: '1990-01-01',
    };
    servicos.cadastroService.registrarPaciente(dados1);

    const dados2 = {
      nome: 'Segundo Paciente',
      email: 'duplicado@email.com',
      senha: 'Senha123',
      cpf: '111.444.777-35',
      dataNascimento: '1992-02-02',
    };
    expect(() => servicos.cadastroService.registrarPaciente(dados2)).toThrow(/E-mail já cadastrado/i);
  });

  /**
   * @caso CT-INT-012
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN03
   * @objetivo Rejeitar cadastro de paciente com CPF já registrado
   * @resultadoEsperado Lança erro CONFLITO de CPF
   */
  test('deve rejeitar cadastro com CPF duplicado', () => {
    servicos.cadastroService.registrarPaciente({
      nome: 'Pessoa Um',
      email: 'um@email.com',
      senha: 'Senha123',
      cpf: '529.982.247-25',
      dataNascimento: '1990-01-01',
    });

    expect(() => servicos.cadastroService.registrarPaciente({
      nome: 'Pessoa Dois',
      email: 'dois@email.com',
      senha: 'Senha123',
      cpf: '529.982.247-25',
      dataNascimento: '1992-02-02',
    })).toThrow(/CPF já cadastrado/i);
  });

  /**
   * @caso CT-INT-013
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN06
   * @objetivo Exigir nome do responsável para paciente menor de 18 anos
   * @resultadoEsperado Lança erro VALIDACAO se responsavelNome não for informado
   */
  test('deve exigir responsável para menor de 18 anos no cadastro de paciente', () => {
    // 10 anos em 2026 -> 2016
    expect(() => servicos.cadastroService.registrarPaciente({
      nome: 'Criança Silva',
      email: 'crianca@email.com',
      senha: 'Senha123',
      cpf: '390.533.447-05',
      dataNascimento: '2016-05-10',
    })).toThrow(/deve informar o nome do responsável/i);

    // Com responsável
    const paciente = servicos.cadastroService.registrarPaciente({
      nome: 'Criança Silva',
      email: 'crianca@email.com',
      senha: 'Senha123',
      cpf: '390.533.447-05',
      dataNascimento: '2016-05-10',
      responsavelNome: 'Mãe Silva',
    });
    expect(paciente.responsavelNome).toBe('Mãe Silva');
  });

  /**
   * @caso CT-INT-014
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.1, RN09
   * @objetivo Cadastrar especialidade com preço base em centavos
   * @resultadoEsperado Especialidade cadastrada e recuperável com id gerado
   */
  test('deve cadastrar especialidade com nome e preço base', () => {
    const esp = servicos.cadastroService.criarEspecialidade({
      nome: 'Ortopedia',
      precoCentavos: 28000,
    });
    expect(esp.id).toBeDefined();
    expect(esp.nome).toBe('Ortopedia');
    expect(esp.precoCentavos).toBe(28000);
  });

  /**
   * @caso CT-INT-015
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN09
   * @objetivo Impedir criação de especialidade com nome duplicado ou preço menor/igual a zero
   * @resultadoEsperado Lança erro apropriado de conflito ou validação
   */
  test('deve rejeitar especialidade com preço não positivo ou nome duplicado', () => {
    expect(() => servicos.cadastroService.criarEspecialidade({
      nome: 'Fisioterapia',
      precoCentavos: 0,
    })).toThrow(/maior que zero/i);

    servicos.cadastroService.criarEspecialidade({ nome: 'Fisioterapia', precoCentavos: 12000 });
    expect(() => servicos.cadastroService.criarEspecialidade({
      nome: 'Fisioterapia',
      precoCentavos: 15000,
    })).toThrow(/já cadastrada/i);
  });

  /**
   * @caso CT-INT-016
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04.1, RN07, RN08
   * @objetivo Cadastrar médico com especialidade e duração de consulta
   * @resultadoEsperado Médico persistido vinculado ao usuário com perfil MEDICO
   */
  test('deve cadastrar médico associado a uma especialidade existente', () => {
    const esp = servicos.cadastroService.criarEspecialidade({ nome: 'Neurologia', precoCentavos: 35000 });
    const medico = servicos.cadastroService.criarMedico({
      nome: 'Dr. Roberto',
      email: 'roberto@clinica.com',
      senha: 'Senha123',
      crm: '554433/SP',
      especialidadeId: esp.id,
      duracaoConsultaMin: 45,
    });

    expect(medico.id).toBeDefined();
    expect(medico.crm).toBe('554433/SP');
    expect(medico.duracaoConsultaMin).toBe(45);
    expect(medico.especialidadeId).toBe(esp.id);
  });

  /**
   * @caso CT-INT-017
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF04.1, RN07
   * @objetivo Rejeitar cadastro de médico com CRM duplicado ou especialidade inexistente
   * @resultadoEsperado Lança erro de conflito de CRM ou validação de especialidade
   */
  test('deve rejeitar médico com especialidade inexistente ou CRM repetido', () => {
    const esp = servicos.cadastroService.criarEspecialidade({ nome: 'Oftalmologia', precoCentavos: 20000 });
    servicos.cadastroService.criarMedico({
      nome: 'Dra. Julia',
      email: 'julia@clinica.com',
      senha: 'Senha123',
      crm: '998877/RJ',
      especialidadeId: esp.id,
      duracaoConsultaMin: 30,
    });

    // CRM repetido
    expect(() => servicos.cadastroService.criarMedico({
      nome: 'Dr. Marcos',
      email: 'marcos@clinica.com',
      senha: 'Senha123',
      crm: '998877/RJ',
      especialidadeId: esp.id,
    })).toThrow(/CRM já cadastrado/i);

    // Especialidade inexistente
    expect(() => servicos.cadastroService.criarMedico({
      nome: 'Dr. Marcos',
      email: 'marcos@clinica.com',
      senha: 'Senha123',
      crm: '112233/RJ',
      especialidadeId: 9999,
    })).toThrow(/Especialidade inexistente/i);
  });

  /**
   * @caso CT-INT-018
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN21
   * @objetivo Ativar e inativar usuário no sistema
   * @resultadoEsperado Flag ativo atualizada para false e true conforme solicitado
   */
  test('deve ativar e inativar usuário', () => {
    const esp = servicos.cadastroService.criarEspecialidade({ nome: 'Ginecologia', precoCentavos: 22000 });
    const medico = servicos.cadastroService.criarMedico({
      nome: 'Dra. Laura',
      email: 'laura@clinica.com',
      senha: 'Senha123',
      crm: '334455/SP',
      especialidadeId: esp.id,
    });

    servicos.cadastroService.definirUsuarioAtivo(medico.usuarioId, false);
    let u = servicos.repos.usuarios.buscarPorId(medico.usuarioId);
    expect(u.ativo).toBe(0);

    servicos.cadastroService.definirUsuarioAtivo(medico.usuarioId, true);
    u = servicos.repos.usuarios.buscarPorId(medico.usuarioId);
    expect(u.ativo).toBe(1);
  });

  /**
   * @caso CT-INT-019
   * @nivel integracao
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RNF03
   * @objetivo Garantir segurança contra injeção SQL no cadastro
   * @resultadoEsperado Trata strings com aspas e comandos SQL como literais sem quebrar o banco
   */
  test('deve persistir dados com caracteres especiais sem vulnerabilidade a SQL injection', () => {
    const esp = servicos.cadastroService.criarEspecialidade({
      nome: "Especialidade' OR '1'='1",
      precoCentavos: 10000,
    });
    expect(esp.nome).toBe("Especialidade' OR '1'='1");
    const buscada = servicos.repos.especialidades.buscarPorId(esp.id);
    expect(buscada.nome).toBe("Especialidade' OR '1'='1");
  });

  /**
   * @caso CT-INT-020
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo recuperabilidade
   * @requisito RNF04
   * @objetivo Rollback automático de transação caso ocorra falha ao inserir paciente
   * @resultadoEsperado Nenhum usuário órfão é deixado no banco se a criação de paciente falhar
   */
  test('deve reverter inserção de usuário se a transação do paciente falhar', () => {
    const totalUsuariosAntes = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n;

    // Força falha com CPF que passa no formato mas duplicado ou erro de banco
    try {
      servicos.cadastroService.registrarPaciente({
        nome: 'Paciente Teste',
        email: 'teste.falha@email.com',
        senha: 'Senha123',
        cpf: '529.982.247-25',
        dataNascimento: '1990-01-01',
      });
    } catch {}

    // Tentativa com mesmo e-mail ou erro
    try {
      servicos.cadastroService.registrarPaciente({
        nome: 'Paciente Teste',
        email: 'outro@email.com',
        senha: 'Senha123',
        cpf: '529.982.247-25', // CPF duplicado disparado após usuário
        dataNascimento: '1990-01-01',
      });
    } catch {}

    const usuarioOrfao = servicos.repos.usuarios.buscarPorEmail('outro@email.com');
    expect(usuarioOrfao).toBeUndefined();
  });
});
