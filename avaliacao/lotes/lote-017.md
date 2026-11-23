# lote-017

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 20 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0247 | CT-INT-076 | cadastra médico completo | passou |  |
| deepseek-0248 | CT-INT-077 | duração padrão é 30 minutos | passou |  |
| deepseek-0249 | CT-INT-078 | recusa duração inválida | passou |  |
| deepseek-0250 | CT-INT-079 | recusa CRM duplicado | passou |  |
| deepseek-0251 | CT-INT-080 | normaliza CRM para maiúsculas | passou |  |
| deepseek-0252 | CT-INT-081 | recusa CRM inválido | passou |  |
| deepseek-0253 | CT-INT-082 | recusa especialidade inexistente | passou |  |
| deepseek-0254 | CT-INT-083 | recusa e-mail já usado por paciente | passou |  |
| deepseek-0255 | CT-INT-084 | cria usuário com perfil MEDICO | passou |  |
| deepseek-0256 | CT-INT-085 | retorno do médico não expõe senha | passou |  |
| deepseek-0257 | CT-INT-086 | cadastra especialidade | passou |  |
| deepseek-0258 | CT-INT-087 | recusa especialidade duplicada | passou |  |
| deepseek-0259 | CT-INT-088 | recusa preço zero | passou |  |
| deepseek-0260 | CT-INT-089 | recusa preço negativo | passou |  |
| deepseek-0261 | CT-INT-090 | recusa preço fracionário | passou |  |
| deepseek-0262 | CT-INT-091 | recusa nome de especialidade curto | passou |  |
| deepseek-0263 | CT-INT-092 | desativa conta | passou |  |
| deepseek-0264 | CT-INT-093 | reativa conta | passou |  |
| deepseek-0265 | CT-INT-094 | recusa ativo não booleano | passou |  |
| deepseek-0266 | CT-INT-095 | usuário inexistente devolve 404 | passou |  |

## Arquivo: backend/__testes__/integracao/cadastro-medico-especialidade.test.js

```js
// Integração: cadastro de médicos, especialidades e ativação de contas (RF03, RF04, RN07–RN09, RN21).
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

const MEDICO = {
  nome: 'Dr. Hugo Martins',
  email: 'hugo@clinica.com',
  senha: 'Senha123',
  crm: '55555/SP',
  especialidadeId: 2,
  duracaoConsultaMin: 45,
};

describe('criarMedico', () => {
  /**
   * @caso CT-INT-076
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04.1
   * @objetivo Cadastrar médico com especialidade e duração
   * @resultadoEsperado O médico é criado com CRM, especialidade e duração informados
   */
  test('cadastra médico completo', () => {
    const medico = ctx.cadastroService.criarMedico(MEDICO);
    expect(medico).toMatchObject({
      nome: 'Dr. Hugo Martins',
      email: 'hugo@clinica.com',
      crm: '55555/SP',
      especialidadeId: 2,
      especialidadeNome: 'Cardiologia',
      duracaoConsultaMin: 45,
      ativo: true,
    });
  });

  /**
   * @caso CT-INT-077
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Usar 30 minutos como duração padrão
   * @resultadoEsperado Sem duracaoConsultaMin o médico é criado com 30 minutos
   */
  test('duração padrão é 30 minutos', () => {
    const { duracaoConsultaMin, ...semDuracao } = MEDICO;
    expect(ctx.cadastroService.criarMedico(semDuracao).duracaoConsultaMin).toBe(30);
  });

  /**
   * @caso CT-INT-078
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Recusar duração fora dos múltiplos de 15 ou fora do intervalo
   * @resultadoEsperado Duração 20 devolve 400 VALIDACAO
   */
  test('recusa duração inválida', () => {
    expect(() => ctx.cadastroService.criarMedico({ ...MEDICO, duracaoConsultaMin: 20 })).toThrow(
      expect.objectContaining({
        status: 400,
        message: 'Duração da consulta deve ser de 15 a 60 minutos, em múltiplos de 15.',
      }),
    );
  });

  /**
   * @caso CT-INT-079
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Recusar CRM já cadastrado
   * @resultadoEsperado criarMedico lança 409 CONFLITO
   */
  test('recusa CRM duplicado', () => {
    ctx.cadastroService.criarMedico(MEDICO);
    expect(() => ctx.cadastroService.criarMedico({ ...MEDICO, email: 'outro@clinica.com' })).toThrow(
      expect.objectContaining({ status: 409, message: 'CRM já cadastrado.' }),
    );
  });

  /**
   * @caso CT-INT-080
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN07
   * @objetivo Aceitar CRM em minúsculas e gravá-lo em maiúsculas
   * @resultadoEsperado O CRM 55555/sp é gravado como 55555/SP
   */
  test('normaliza CRM para maiúsculas', () => {
    expect(ctx.cadastroService.criarMedico({ ...MEDICO, crm: '55555/sp' }).crm).toBe('55555/SP');
  });

  /**
   * @caso CT-INT-081
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Recusar CRM com UF inexistente
   * @resultadoEsperado criarMedico lança 400 citando o formato 123456/UF
   */
  test('recusa CRM inválido', () => {
    expect(() => ctx.cadastroService.criarMedico({ ...MEDICO, crm: '55555/ZZ' })).toThrow(
      expect.objectContaining({ status: 400, message: 'CRM inválido. Use o formato 123456/UF.' }),
    );
  });

  /**
   * @caso CT-INT-082
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF04.1, RNF04
   * @objetivo Recusar especialidade inexistente
   * @resultadoEsperado criarMedico lança 400 com "Especialidade inexistente."
   */
  test('recusa especialidade inexistente', () => {
    expect(() => ctx.cadastroService.criarMedico({ ...MEDICO, especialidadeId: 99 })).toThrow(
      expect.objectContaining({ status: 400, message: 'Especialidade inexistente.' }),
    );
  });

  /**
   * @caso CT-INT-083
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Recusar e-mail já usado por outro perfil
   * @resultadoEsperado criarMedico lança 409 CONFLITO
   */
  test('recusa e-mail já usado por paciente', () => {
    expect(() => ctx.cadastroService.criarMedico({ ...MEDICO, email: 'ana@email.com' })).toThrow(
      expect.objectContaining({ status: 409, message: 'E-mail já cadastrado.' }),
    );
  });

  /**
   * @caso CT-INT-084
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF04.1, RN30
   * @objetivo Criar o usuário do médico com perfil MEDICO
   * @resultadoEsperado O usuário vinculado tem perfil MEDICO
   */
  test('cria usuário com perfil MEDICO', () => {
    const medico = ctx.cadastroService.criarMedico(MEDICO);
    expect(ctx.repos.usuarios.buscarPorId(medico.usuarioId).perfil).toBe('MEDICO');
  });

  /**
   * @caso CT-INT-085
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF01
   * @objetivo Não devolver hash de senha no cadastro de médico
   * @resultadoEsperado O retorno não possui senhaHash nem senha
   */
  test('retorno do médico não expõe senha', () => {
    const medico = ctx.cadastroService.criarMedico(MEDICO);
    expect(medico).not.toHaveProperty('senhaHash');
    expect(medico).not.toHaveProperty('senha');
  });
});

describe('criarEspecialidade', () => {
  /**
   * @caso CT-INT-086
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.1
   * @objetivo Cadastrar especialidade com nome e preço base
   * @resultadoEsperado A especialidade é criada com nome e preço em centavos
   */
  test('cadastra especialidade', () => {
    const especialidade = ctx.cadastroService.criarEspecialidade({ nome: 'Oftalmologia', precoCentavos: 22000 });
    expect(especialidade).toMatchObject({ nome: 'Oftalmologia', precoCentavos: 22000 });
  });

  /**
   * @caso CT-INT-087
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN09
   * @objetivo Recusar nome repetido sem diferenciar maiúsculas
   * @resultadoEsperado criarEspecialidade lança 409 CONFLITO
   */
  test('recusa especialidade duplicada', () => {
    expect(() => ctx.cadastroService.criarEspecialidade({ nome: 'cardiologia', precoCentavos: 10000 })).toThrow(
      expect.objectContaining({ status: 409, message: 'Especialidade já cadastrada.' }),
    );
  });

  /**
   * @caso CT-INT-088
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN09
   * @objetivo Recusar preço base igual a zero
   * @resultadoEsperado criarEspecialidade lança 400 VALIDACAO
   */
  test('recusa preço zero', () => {
    expect(() => ctx.cadastroService.criarEspecialidade({ nome: 'Nutrição', precoCentavos: 0 })).toThrow(
      expect.objectContaining({ status: 400, message: 'Preço deve ser um inteiro em centavos maior que zero.' }),
    );
  });

  /**
   * @caso CT-INT-089
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN09
   * @objetivo Recusar preço base negativo
   * @resultadoEsperado criarEspecialidade lança 400 VALIDACAO
   */
  test('recusa preço negativo', () => {
    expect(() => ctx.cadastroService.criarEspecialidade({ nome: 'Nutrição', precoCentavos: -100 })).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  /**
   * @caso CT-INT-090
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN09
   * @objetivo Recusar preço fracionário, pois valores são inteiros em centavos
   * @resultadoEsperado criarEspecialidade lança 400 para 150.5 centavos
   */
  test('recusa preço fracionário', () => {
    expect(() => ctx.cadastroService.criarEspecialidade({ nome: 'Nutrição', precoCentavos: 150.5 })).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  /**
   * @caso CT-INT-091
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN09
   * @objetivo Recusar nome de especialidade com menos de 3 caracteres
   * @resultadoEsperado criarEspecialidade lança 400
   */
  test('recusa nome de especialidade curto', () => {
    expect(() => ctx.cadastroService.criarEspecialidade({ nome: 'OI', precoCentavos: 10000 })).toThrow(
      expect.objectContaining({ status: 400, message: 'Nome da especialidade deve ter pelo menos 3 caracteres.' }),
    );
  });
});

describe('definirUsuarioAtivo', () => {
  /**
   * @caso CT-INT-092
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Desativar uma conta de paciente
   * @resultadoEsperado A conta fica com ativo = false no banco
   */
  test('desativa conta', () => {
    const paciente = ctx.pacientes[0];
    expect(ctx.cadastroService.definirUsuarioAtivo(paciente.usuarioId, false)).toEqual({ id: paciente.usuarioId, ativo: false });
    expect(ctx.repos.usuarios.buscarPorId(paciente.usuarioId).ativo).toBe(false);
  });

  /**
   * @caso CT-INT-093
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Reativar uma conta desativada
   * @resultadoEsperado A conta volta a ativo = true
   */
  test('reativa conta', () => {
    const paciente = ctx.pacientes[0];
    ctx.cadastroService.definirUsuarioAtivo(paciente.usuarioId, false);
    ctx.cadastroService.definirUsuarioAtivo(paciente.usuarioId, true);
    expect(ctx.repos.usuarios.buscarPorId(paciente.usuarioId).ativo).toBe(true);
  });

  /**
   * @caso CT-INT-094
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN21, RNF04
   * @objetivo Recusar valor de "ativo" que não é booleano
   * @resultadoEsperado definirUsuarioAtivo lança 400 VALIDACAO
   */
  test('recusa ativo não booleano', () => {
    expect(() => ctx.cadastroService.definirUsuarioAtivo(ctx.pacientes[0].usuarioId, 'true')).toThrow(
      expect.objectContaining({ status: 400, message: 'Informe "ativo" como true ou false.' }),
    );
  });

  /**
   * @caso CT-INT-095
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN30
   * @objetivo Recusar usuário inexistente ao mudar a situação
   * @resultadoEsperado definirUsuarioAtivo lança 404 NAO_ENCONTRADO
   */
  test('usuário inexistente devolve 404', () => {
    expect(() => ctx.cadastroService.definirUsuarioAtivo(9999, false)).toThrow(
      expect.objectContaining({ status: 404, message: 'Usuário não encontrado.' }),
    );
  });
});
```
