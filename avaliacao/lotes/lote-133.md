# lote-133

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 12 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0164 | CT-INT-001 | paciente é cadastrado com CPF gravado só com dígitos | passou |  |
| mimo-0165 | CT-INT-002 | senha é gravada como hash bcrypt | passou |  |
| mimo-0166 | CT-INT-003 | e-mail repetido é rejeitado mesmo mudando a caixa | passou |  |
| mimo-0167 | CT-INT-004 | CPF repetido é rejeitado | passou |  |
| mimo-0168 | CT-INT-005 | CPF inválido é rejeitado antes de gravar | passou |  |
| mimo-0169 | CT-INT-006 | senha fora da regra é rejeitada | passou |  |
| mimo-0170 | CT-INT-007 | e-mail fora do formato é rejeitado | passou |  |
| mimo-0171 | CT-INT-008 | nascimento futuro ou com mais de 130 anos é rejeitado | passou |  |
| mimo-0172 | CT-INT-009 | menor de 18 anos exige responsável | passou |  |
| mimo-0173 | CT-INT-010 | paciente menor é criado com o nome do responsável | passou |  |
| mimo-0174 | CT-INT-011 | falha de cadastro não deixa registro pela metade | passou |  |
| mimo-0175 | CT-INT-012 | nome curto demais é rejeitado | passou |  |

## Arquivo: backend/__testes__/integracao/cadastro-pacientes.test.js

```js
/**
 * Cadastro de pacientes (RF02) e regras de conta RN01, RN02, RN03, RN05, RN06.
 * Usa banco em memória real com o schema aplicado.
 */
const clock = require('../../src/utils/clock');
const { abrirBanco } = require('../../src/db/connection');
const { criarServicos } = require('../../src/services');

const CPF_ANA = '52998224725';
const CPF_JOAO = '11144477735';
const CPF_LUCAS = '39053344705';
const CPF_NOVO = '12345678909';
const CPF_IDOSO = '93541134780';

let db;
let servicos;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  servicos = criarServicos(db);
});

afterEach(() => {
  clock.definirAgora(null);
  db.close();
});

const paciente = (campos = {}) => ({
  nome: 'Maria da Silva',
  email: 'maria@email.com',
  senha: 'Senha123',
  cpf: CPF_NOVO,
  dataNascimento: '1985-03-10',
  telefone: '(11) 91111-1111',
  ...campos,
});

const contar = (tabela) => db.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get().n;

describe('RF02 — auto-cadastro e cadastro pela recepção', () => {
  /**
   * @caso CT-INT-001
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.1, RN03
   * @objetivo Criar a conta do paciente e gravar o CPF normalizado
   * @resultadoEsperado registrarPaciente devolve o id e o CPF é gravado apenas com dígitos
   */
  test('paciente é cadastrado com CPF gravado só com dígitos', () => {
    const criado = servicos.cadastroService.registrarPaciente(paciente({ cpf: '529.982.247-25' }));
    expect(criado.id).toBeGreaterThan(0);
    expect(criado.cpf).toBe(CPF_ANA);
    expect(criado.nome).toBe('Maria da Silva');
    expect(criado.ativo).toBe(true);
  });

  /**
   * @caso CT-INT-002
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF01
   * @objetivo Armazenar a senha apenas como hash bcrypt
   * @resultadoEsperado o usuário gravado tem senhaHash bcrypt e não contém a senha em claro
   */
  test('senha é gravada como hash bcrypt', () => {
    const criado = servicos.cadastroService.registrarPaciente(paciente());
    const usuario = servicos.repos.usuarios.buscarPorId(criado.usuarioId);
    expect(usuario.senhaHash).toMatch(/^\$2[aby]\$/);
    expect(usuario.senhaHash).not.toContain('Senha123');
  });

  /**
   * @caso CT-INT-003
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN01
   * @objetivo Recusar e-mail já cadastrado, inclusive em outra caixa (unicidade)
   * @resultadoEsperado o segundo cadastro falha com 409 CONFLITO e nenhum usuário extra é criado
   */
  test('e-mail repetido é rejeitado mesmo mudando a caixa', () => {
    servicos.cadastroService.registrarPaciente(paciente());
    const antes = contar('usuarios');
    let erro;
    try {
      servicos.cadastroService.registrarPaciente(paciente({ email: 'MARIA@EMAIL.COM', cpf: CPF_JOAO }));
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(409);
    expect(erro.codigo).toBe('CONFLITO');
    expect(erro.message).toBe('E-mail já cadastrado.');
    expect(contar('usuarios')).toBe(antes);
  });

  /**
   * @caso CT-INT-004
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN03
   * @objetivo Recusar CPF já utilizado por outro paciente
   * @resultadoEsperado o segundo cadastro falha com 409 CONFLITO e não cria registro
   */
  test('CPF repetido é rejeitado', () => {
    servicos.cadastroService.registrarPaciente(paciente({ cpf: CPF_ANA }));
    let erro;
    try {
      servicos.cadastroService.registrarPaciente(paciente({ email: 'outra@email.com', cpf: '529.982.247-25' }));
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(409);
    expect(erro.codigo).toBe('CONFLITO');
    expect(contar('pacientes')).toBe(1);
  });

  /**
   * @caso CT-INT-005
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN03
   * @objetivo Recusar CPF com dígito verificador errado
   * @resultadoEsperado o cadastro falha com 400 VALIDACAO e a mensagem é "CPF inválido."
   */
  test('CPF inválido é rejeitado antes de gravar', () => {
    let erro;
    try {
      servicos.cadastroService.registrarPaciente(paciente({ cpf: '123.456.789-01' }));
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(400);
    expect(erro.codigo).toBe('VALIDACAO');
    expect(erro.message).toBe('CPF inválido.');
    expect(contar('usuarios')).toBe(0);
  });

  /**
   * @caso CT-INT-006
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN02
   * @objetivo Recusar senha sem 8 caracteres ou sem letra e número
   * @resultadoEsperado o cadastro falha com a mensagem de senha inválida
   */
  test('senha fora da regra é rejeitada', () => {
    const casos = ['Senha12', 'apenasletras', '12345678'];
    casos.forEach((senha) => {
      let erro;
      try {
        servicos.cadastroService.registrarPaciente(paciente({ email: `${senha}@email.com`, senha }));
      } catch (e) {
        erro = e;
      }
      expect(erro.status).toBe(400);
      expect(erro.message).toBe('Senha deve ter no mínimo 8 caracteres, com letras e números.');
    });
    expect(contar('usuarios')).toBe(0);
  });

  /**
   * @caso CT-INT-007
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN01
   * @objetivo Recusar e-mail sem formato válido
   * @resultadoEsperado o cadastro falha com 400 VALIDACAO e a mensagem de e-mail inválido
   */
  test('e-mail fora do formato é rejeitado', () => {
    let erro;
    try {
      servicos.cadastroService.registrarPaciente(paciente({ email: 'sem-arroba' }));
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('E-mail inválido.');
  });

  /**
   * @caso CT-INT-008
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN05
   * @objetivo Recusar nascimento futuro e nascimento com mais de 130 anos
   * @resultadoEsperado o cadastro falha com as mensagens de data futura e de idade máxima
   */
  test('nascimento futuro ou com mais de 130 anos é rejeitado', () => {
    let futuro;
    try {
      servicos.cadastroService.registrarPaciente(paciente({ email: 'futuro@email.com', dataNascimento: '2026-12-01' }));
    } catch (e) {
      futuro = e;
    }
    expect(futuro.status).toBe(400);
    expect(futuro.message).toBe('Data de nascimento não pode ser futura.');

    let idoso;
    try {
      servicos.cadastroService.registrarPaciente(paciente({ email: 'idoso@email.com', dataNascimento: '1890-01-01' }));
    } catch (e) {
      idoso = e;
    }
    expect(idoso.status).toBe(400);
    expect(idoso.message).toBe('Idade não pode ser superior a 130 anos.');
    expect(contar('usuarios')).toBe(0);
  });

  /**
   * @caso CT-INT-009
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN06
   * @objetivo Exigir responsável para paciente com 17 anos e dispensar para 18 anos
   * @resultadoEsperado o menor sem responsável falha com 400 e o maior de idade é criado
   */
  test('menor de 18 anos exige responsável', () => {
    let menor;
    try {
      servicos.cadastroService.registrarPaciente(
        paciente({ email: 'menor@email.com', cpf: CPF_JOAO, dataNascimento: '2012-06-01', responsavelNome: '' }),
      );
    } catch (e) {
      menor = e;
    }
    expect(menor.status).toBe(400);
    expect(menor.message).toBe('Paciente menor de 18 anos deve informar o nome do responsável.');

    const maior = servicos.cadastroService.registrarPaciente(
      paciente({ email: 'maior@email.com', cpf: CPF_JOAO, dataNascimento: '2008-10-19' }),
    );
    expect(maior.responsavelNome).toBe(null);
    expect(contar('pacientes')).toBe(1);
  });

  /**
   * @caso CT-INT-010
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN06
   * @objetivo Gravar o nome do responsável do paciente menor
   * @resultadoEsperado o registro criado mantém responsavelNome preenchido
   */
  test('paciente menor é criado com o nome do responsável', () => {
    const criado = servicos.cadastroService.registrarPaciente(
      paciente({ email: 'pedro@email.com', cpf: CPF_LUCAS, dataNascimento: '2016-01-15', responsavelNome: 'Marta Oliveira' }),
    );
    expect(criado.responsavelNome).toBe('Marta Oliveira');
  });

  /**
   * @caso CT-INT-011
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo recuperabilidade
   * @requisito RN03, RNF04
   * @objetivo Manter o banco consistente quando o cadastro falha no meio do caminho
   * @resultadoEsperado após a falha não há usuário nem paciente órfão na base
   */
  test('falha de cadastro não deixa registro pela metade', () => {
    expect(() =>
      servicos.cadastroService.registrarPaciente(paciente({ dataNascimento: '2012-06-01' })),
    ).toThrow();
    expect(contar('usuarios')).toBe(0);
    expect(contar('pacientes')).toBe(0);
  });

  /**
   * @caso CT-INT-012
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF02.3
   * @objetivo Recusar nome com menos de 3 caracteres
   * @resultadoEsperado o cadastro falha com a mensagem de tamanho mínimo do nome
   */
  test('nome curto demais é rejeitado', () => {
    const aceito = servicos.cadastroService.registrarPaciente(
      paciente({ nome: 'Ana', email: 'ana@email.com', cpf: CPF_IDOSO }),
    );
    expect(aceito.id).toBeGreaterThan(0);

    let curto;
    try {
      servicos.cadastroService.registrarPaciente(paciente({ nome: 'Li', email: 'li@email.com', cpf: CPF_JOAO }));
    } catch (e) {
      curto = e;
    }
    expect(curto.status).toBe(400);
    expect(curto.message).toBe('Nome deve ter pelo menos 3 caracteres.');
    expect(contar('usuarios')).toBe(1);
  });
});
```
