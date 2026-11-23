// Integração: cadastro de pacientes com validações de conta e CPF (RF02, RN01–RN06).
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');
const clock = require('../../src/utils/clock');

let ctx;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  const db = abrirBanco(':memory:');
  const dados = semear(db);
  ctx = { db, ...dados, ...criarServicos(db) };
});

afterEach(() => {
  ctx.db.close();
  clock.definirAgora(null);
});

const BASE = {
  nome: 'Carla Mendes',
  email: 'carla@email.com',
  senha: 'Senha123',
  cpf: '123.456.789-09',
  dataNascimento: '1985-03-12',
  telefone: '(41) 99999-0000',
};

describe('registrarPaciente', () => {
  /**
   * @caso CT-INT-056
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.1, RF02.3
   * @objetivo Cadastrar um paciente com todos os campos obrigatórios
   * @resultadoEsperado O paciente é criado com id, nome, e-mail, CPF, nascimento e telefone
   */
  test('cadastra paciente com dados completos', () => {
    const paciente = ctx.cadastroService.registrarPaciente(BASE);
    expect(paciente).toMatchObject({
      nome: 'Carla Mendes',
      email: 'carla@email.com',
      cpf: '12345678909',
      dataNascimento: '1985-03-12',
      telefone: '(41) 99999-0000',
      ativo: true,
    });
    expect(Number.isInteger(paciente.id)).toBe(true);
  });

  /**
   * @caso CT-INT-057
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Gravar o CPF somente com dígitos
   * @resultadoEsperado O CPF gravado é 12345678909, sem pontuação
   */
  test('grava CPF normalizado', () => {
    const paciente = ctx.cadastroService.registrarPaciente(BASE);
    const linha = ctx.db.prepare('SELECT cpf FROM pacientes WHERE id = ?').get(paciente.id);
    expect(linha.cpf).toBe('12345678909');
  });

  /**
   * @caso CT-INT-058
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Normalizar nome e e-mail ao cadastrar
   * @resultadoEsperado O nome perde espaços nas pontas e o e-mail é gravado em minúsculas
   */
  test('normaliza nome e e-mail', () => {
    const paciente = ctx.cadastroService.registrarPaciente({ ...BASE, nome: '  Carla Mendes  ', email: '  CARLA@EMAIL.COM ' });
    expect(paciente.nome).toBe('Carla Mendes');
    expect(paciente.email).toBe('carla@email.com');
  });

  /**
   * @caso CT-INT-059
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF01
   * @objetivo Gravar a senha como hash bcrypt
   * @resultadoEsperado O valor em senha_hash não é a senha em texto e confere com bcrypt
   */
  test('grava a senha como hash', () => {
    const paciente = ctx.cadastroService.registrarPaciente(BASE);
    const { senha_hash: hash } = ctx.db.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').get(paciente.usuarioId);
    expect(hash).not.toBe('Senha123');
    expect(require('bcryptjs').compareSync('Senha123', hash)).toBe(true);
  });

  /**
   * @caso CT-INT-060
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Recusar e-mail já cadastrado, mesmo em caixa diferente
   * @resultadoEsperado registrarPaciente lança 409 CONFLITO
   */
  test('recusa e-mail duplicado sem diferenciar maiúsculas', () => {
    ctx.cadastroService.registrarPaciente(BASE);
    expect(() => ctx.cadastroService.registrarPaciente({ ...BASE, cpf: '987.654.321-00', email: 'CARLA@EMAIL.COM' })).toThrow(
      expect.objectContaining({ status: 409, codigo: 'CONFLITO', message: 'E-mail já cadastrado.' }),
    );
  });

  /**
   * @caso CT-INT-061
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Recusar CPF já cadastrado, inclusive com pontuação diferente
   * @resultadoEsperado registrarPaciente lança 409 citando CPF já cadastrado
   */
  test('recusa CPF duplicado com pontuação', () => {
    ctx.cadastroService.registrarPaciente(BASE);
    expect(() => ctx.cadastroService.registrarPaciente({ ...BASE, email: 'outra@email.com', cpf: '12345678909' })).toThrow(
      expect.objectContaining({ status: 409, message: 'CPF já cadastrado.' }),
    );
  });

  /**
   * @caso CT-INT-062
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Recusar CPF com dígito verificador inválido
   * @resultadoEsperado registrarPaciente lança 400 VALIDACAO
   */
  test('recusa CPF inválido', () => {
    expect(() => ctx.cadastroService.registrarPaciente({ ...BASE, cpf: '123.456.789-00' })).toThrow(
      expect.objectContaining({ status: 400, message: 'CPF inválido.' }),
    );
  });

  /**
   * @caso CT-INT-063
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Recusar e-mail sem formato válido
   * @resultadoEsperado registrarPaciente lança 400 com "E-mail inválido."
   */
  test('recusa e-mail inválido', () => {
    expect(() => ctx.cadastroService.registrarPaciente({ ...BASE, email: 'carla.email.com' })).toThrow(
      expect.objectContaining({ status: 400, message: 'E-mail inválido.' }),
    );
  });

  /**
   * @caso CT-INT-064
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN02
   * @objetivo Recusar senha sem número
   * @resultadoEsperado registrarPaciente lança 400 citando letras e números
   */
  test('recusa senha fora do padrão', () => {
    expect(() => ctx.cadastroService.registrarPaciente({ ...BASE, senha: 'somenteletras' })).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  /**
   * @caso CT-INT-065
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.3
   * @objetivo Recusar nome com menos de 3 caracteres
   * @resultadoEsperado registrarPaciente lança 400 com "Nome deve ter pelo menos 3 caracteres."
   */
  test('recusa nome curto', () => {
    expect(() => ctx.cadastroService.registrarPaciente({ ...BASE, nome: 'Jo' })).toThrow(
      expect.objectContaining({ status: 400, message: 'Nome deve ter pelo menos 3 caracteres.' }),
    );
  });

  /**
   * @caso CT-INT-066
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Exigir responsável para paciente menor de 18 anos
   * @resultadoEsperado registrarPaciente lança 400 citando o responsável
   */
  test('exige responsável para menor', () => {
    expect(() =>
      ctx.cadastroService.registrarPaciente({ ...BASE, dataNascimento: '2012-05-10' }),
    ).toThrow(expect.objectContaining({ status: 400, message: 'Paciente menor de 18 anos deve informar o nome do responsável.' }));
  });

  /**
   * @caso CT-INT-067
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Cadastrar menor quando o responsável é informado
   * @resultadoEsperado O paciente é criado com responsavelNome preenchido
   */
  test('cadastra menor com responsável', () => {
    const paciente = ctx.cadastroService.registrarPaciente({
      ...BASE,
      dataNascimento: '2012-05-10',
      responsavelNome: 'Márcia Mendes',
    });
    expect(paciente.responsavelNome).toBe('Márcia Mendes');
  });

  /**
   * @caso CT-INT-068
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Não exigir responsável de quem completa 18 anos hoje
   * @resultadoEsperado O paciente nascido em 19/10/2008 é cadastrado sem responsável
   */
  test('não exige responsável ao completar 18 anos', () => {
    const paciente = ctx.cadastroService.registrarPaciente({ ...BASE, dataNascimento: '2008-10-19' });
    expect(paciente.responsavelNome).toBeNull();
  });

  /**
   * @caso CT-INT-069
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Recusar data de nascimento futura
   * @resultadoEsperado registrarPaciente lança 400 citando data futura
   */
  test('recusa data de nascimento futura', () => {
    expect(() => ctx.cadastroService.registrarPaciente({ ...BASE, dataNascimento: '2026-12-01' })).toThrow(
      expect.objectContaining({ status: 400, message: 'Data de nascimento não pode ser futura.' }),
    );
  });

  /**
   * @caso CT-INT-070
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Recusar idade acima de 130 anos
   * @resultadoEsperado registrarPaciente lança 400 citando idade máxima
   */
  test('recusa idade acima de 130 anos', () => {
    expect(() => ctx.cadastroService.registrarPaciente({ ...BASE, dataNascimento: '1880-01-01' })).toThrow(
      expect.objectContaining({ status: 400, message: 'Idade não pode ser superior a 130 anos.' }),
    );
  });

  /**
   * @caso CT-INT-071
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN05, RNF06
   * @objetivo Explicar o formato quando a data vem em DD/MM/AAAA
   * @resultadoEsperado registrarPaciente lança 400 citando AAAA-MM-DD
   */
  test('recusa data em formato brasileiro', () => {
    expect(() => ctx.cadastroService.registrarPaciente({ ...BASE, dataNascimento: '12/03/1985' })).toThrow(
      expect.objectContaining({ status: 400, message: 'Data de nascimento inválida. Use o formato AAAA-MM-DD.' }),
    );
  });

  /**
   * @caso CT-INT-072
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.3
   * @objetivo Aceitar cadastro sem telefone
   * @resultadoEsperado O telefone é gravado como nulo
   */
  test('telefone é opcional', () => {
    const paciente = ctx.cadastroService.registrarPaciente({ ...BASE, telefone: undefined });
    expect(paciente.telefone).toBeNull();
  });

  /**
   * @caso CT-INT-073
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo recuperabilidade
   * @requisito RN03, RNF04
   * @objetivo Não deixar usuário órfão quando o CPF é duplicado
   * @resultadoEsperado A contagem de usuários permanece a mesma após a falha
   */
  test('falha de CPF duplicado não cria usuário', () => {
    const antes = ctx.db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n;
    expect(() => ctx.cadastroService.registrarPaciente({ ...BASE, cpf: '529.982.247-25', email: 'nova@email.com' })).toThrow();
    expect(ctx.db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n).toBe(antes);
  });

  /**
   * @caso CT-INT-074
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Criar paciente ativo por padrão
   * @resultadoEsperado O usuário criado tem ativo = true
   */
  test('paciente nasce ativo', () => {
    const paciente = ctx.cadastroService.registrarPaciente(BASE);
    expect(ctx.repos.usuarios.buscarPorId(paciente.usuarioId).ativo).toBe(true);
  });

  /**
   * @caso CT-INT-075
   * @nivel integracao
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF04
   * @objetivo Distinguir validação (400) de conflito (409) nos erros
   * @resultadoEsperado CPF inválido devolve VALIDACAO e CPF duplicado devolve CONFLITO
   */
  test('códigos de erro distinguem validação de conflito', () => {
    expect(() => ctx.cadastroService.registrarPaciente({ ...BASE, cpf: '111.111.111-11' })).toThrow(
      expect.objectContaining({ codigo: 'VALIDACAO' }),
    );
    ctx.cadastroService.registrarPaciente(BASE);
    expect(() => ctx.cadastroService.registrarPaciente({ ...BASE, email: 'outro@email.com' })).toThrow(
      expect.objectContaining({ codigo: 'CONFLITO' }),
    );
  });
});
