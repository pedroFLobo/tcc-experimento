# lote-132

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 11 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0153 | CT-INT-013 | especialidade é criada com preço base positivo | passou |  |
| mimo-0154 | CT-INT-014 | nome de especialidade repetido é rejeitado | passou |  |
| mimo-0155 | CT-INT-015 | preço base precisa ser inteiro maior que zero | passou |  |
| mimo-0156 | CT-INT-016 | nome de especialidade curto é rejeitado | passou |  |
| mimo-0157 | CT-INT-017 | médico é criado com CRM normalizado e duração padrão | passou |  |
| mimo-0158 | CT-INT-018 | durações válidas de consulta são aceitas | passou |  |
| mimo-0159 | CT-INT-019 | duração inválida é rejeitada | passou |  |
| mimo-0160 | CT-INT-020 | CRM fora do padrão é rejeitado | passou |  |
| mimo-0161 | CT-INT-021 | CRM repetido é rejeitado | passou |  |
| mimo-0162 | CT-INT-022 | especialidade inexistente é rejeitada | passou |  |
| mimo-0163 | CT-INT-023 | conta de médico obedece as regras de e-mail e senha | passou |  |

## Arquivo: backend/__testes__/integracao/cadastro-medicos-especialidades.test.js

```js
/**
 * Cadastro de médicos (RF04) e especialidades (RF03) com as regras RN07, RN08 e RN09.
 */
const clock = require('../../src/utils/clock');
const { abrirBanco } = require('../../src/db/connection');
const { criarServicos } = require('../../src/services');

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

const especialidade = (campos = {}) => ({ nome: 'Clínica Geral', precoCentavos: 15000, ...campos });

const medico = (campos = {}) => ({
  nome: 'Dr. Carlos Almeida',
  email: 'carlos@clinica.com',
  senha: 'Senha123',
  crm: '123456/SP',
  especialidadeId: 1,
  ...campos,
});

describe('RF03 — especialidades', () => {
  /**
   * @caso CT-INT-013
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.1, RN09
   * @objetivo Criar especialidade com nome e preço base em centavos
   * @resultadoEsperado a especialidade é gravada com o preço inteiro maior que zero
   */
  test('especialidade é criada com preço base positivo', () => {
    const criada = servicos.cadastroService.criarEspecialidade(especialidade({ nome: 'Cardiologia', precoCentavos: 30000 }));
    expect(criada).toEqual({ id: 1, nome: 'Cardiologia', precoCentavos: 30000 });
  });

  /**
   * @caso CT-INT-014
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN09
   * @objetivo Recusar nome de especialidade repetido
   * @resultadoEsperado o segundo cadastro falha com 409 CONFLITO
   */
  test('nome de especialidade repetido é rejeitado', () => {
    servicos.cadastroService.criarEspecialidade(especialidade());
    let erro;
    try {
      servicos.cadastroService.criarEspecialidade(especialidade({ nome: 'Clínica Geral', precoCentavos: 20000 }));
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(409);
    expect(erro.codigo).toBe('CONFLITO');
    expect(erro.message).toBe('Especialidade já cadastrada.');
  });

  /**
   * @caso CT-INT-015
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN09
   * @objetivo Recusar preço base zerado, negativo ou não inteiro
   * @resultadoEsperado os três casos falham com 400 VALIDACAO e mensagem de preço
   */
  test('preço base precisa ser inteiro maior que zero', () => {
    const casos = [0, -100, 150.5, 'abc'];
    casos.forEach((preco, i) => {
      let erro;
      try {
        servicos.cadastroService.criarEspecialidade(especialidade({ nome: `Esp ${i}`, precoCentavos: preco }));
      } catch (e) {
        erro = e;
      }
      expect(erro.status).toBe(400);
      expect(erro.message).toBe('Preço deve ser um inteiro em centavos maior que zero.');
    });
    expect(db.prepare('SELECT COUNT(*) AS n FROM especialidades').get().n).toBe(0);
  });

  /**
   * @caso CT-INT-016
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF03.1
   * @objetivo Recusar nome de especialidade com menos de 3 caracteres
   * @resultadoEsperado o cadastro falha com 400 VALIDACAO
   */
  test('nome de especialidade curto é rejeitado', () => {
    let erro;
    try {
      servicos.cadastroService.criarEspecialidade(especialidade({ nome: 'RA' }));
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Nome da especialidade deve ter pelo menos 3 caracteres.');
  });
});

describe('RF04 — cadastro de médico', () => {
  beforeEach(() => {
    servicos.cadastroService.criarEspecialidade(especialidade());
  });

  /**
   * @caso CT-INT-017
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04.1, RN07
   * @objetivo Criar médico normalizando o CRM para maiúsculas
   * @resultadoEsperado o médico é gravado com CRM '123456/SP' e duração padrão de 30 minutos
   */
  test('médico é criado com CRM normalizado e duração padrão', () => {
    const criado = servicos.cadastroService.criarMedico(medico({ crm: ' 123456/sp ' }));
    expect(criado.crm).toBe('123456/SP');
    expect(criado.duracaoConsultaMin).toBe(30);
    expect(criado.especialidadeId).toBe(1);
    expect(criado.ativo).toBe(true);
  });

  /**
   * @caso CT-INT-018
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN08
   * @objetivo Aceitar durações válidas informadas explicitamente
   * @resultadoEsperado 15, 45 e 60 minutos são aceitos
   */
  test('durações válidas de consulta são aceitas', () => {
    [15, 45, 60].forEach((duracao, i) => {
      const criado = servicos.cadastroService.criarMedico(
        medico({ nome: `Médico ${i}`, email: `m${i}@clinica.com`, crm: `1000${i}/SP`, duracaoConsultaMin: duracao }),
      );
      expect(criado.duracaoConsultaMin).toBe(duracao);
    });
  });

  /**
   * @caso CT-INT-019
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN08
   * @objetivo Recusar duração fora da faixa ou que não é múltipla de 15
   * @resultadoEsperado os casos inválidos falham com 400 VALIDACAO e nenhuma linha é criada
   */
  test('duração inválida é rejeitada', () => {
    [10, 20, 61, 30.5].forEach((duracao, i) => {
      let erro;
      try {
        servicos.cadastroService.criarMedico(
          medico({ nome: `Médico ${i}`, email: `d${i}@clinica.com`, crm: `2000${i}/SP`, duracaoConsultaMin: duracao }),
        );
      } catch (e) {
        erro = e;
      }
      expect(erro.status).toBe(400);
      expect(erro.message).toBe('Duração da consulta deve ser de 15 a 60 minutos, em múltiplos de 15.');
    });
    expect(db.prepare('SELECT COUNT(*) AS n FROM medicos').get().n).toBe(0);
  });

  /**
   * @caso CT-INT-020
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN07
   * @objetivo Recusar CRM fora do padrão NNNN/UF
   * @resultadoEsperado o cadastro falha com a mensagem de CRM inválido
   */
  test('CRM fora do padrão é rejeitado', () => {
    const casos = ['123/SP', '1234567/SP', '123456/XX', '123456SP'];
    casos.forEach((crm, i) => {
      let erro;
      try {
        servicos.cadastroService.criarMedico(medico({ email: `c${i}@clinica.com`, crm }));
      } catch (e) {
        erro = e;
      }
      expect(erro.status).toBe(400);
      expect(erro.message).toBe('CRM inválido. Use o formato 123456/UF.');
    });
    expect(db.prepare('SELECT COUNT(*) AS n FROM medicos').get().n).toBe(0);
  });

  /**
   * @caso CT-INT-021
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN07
   * @objetivo Recusar CRM já cadastrado
   * @resultadoEsperado o segundo cadastro falha com 409 CONFLITO
   */
  test('CRM repetido é rejeitado', () => {
    servicos.cadastroService.criarMedico(medico());
    let erro;
    try {
      servicos.cadastroService.criarMedico(medico({ nome: 'Outro Médico', email: 'outro@clinica.com', crm: '123456/SP' }));
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(409);
    expect(erro.message).toBe('CRM já cadastrado.');
  });

  /**
   * @caso CT-INT-022
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF04.1
   * @objetivo Recusar médico vinculado a especialidade inexistente
   * @resultadoEsperado o cadastro falha com 400 VALIDACAO e a mensagem de especialidade inexistente
   */
  test('especialidade inexistente é rejeitada', () => {
    let erro;
    try {
      servicos.cadastroService.criarMedico(medico({ especialidadeId: 999 }));
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Especialidade inexistente.');
  });

  /**
   * @caso CT-INT-023
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN01, RN02
   * @objetivo Aplicar as mesmas regras de conta do paciente ao criar médico
   * @resultadoEsperado e-mail repetido e senha fraca são rejeitados
   */
  test('conta de médico obedece as regras de e-mail e senha', () => {
    servicos.cadastroService.criarMedico(medico());

    let emailRepetido;
    try {
      servicos.cadastroService.criarMedico(medico({ nome: 'Outro', email: 'CARLOS@clinica.com', crm: '654321/RJ' }));
    } catch (e) {
      emailRepetido = e;
    }
    expect(emailRepetido.status).toBe(409);

    let senhaFraca;
    try {
      servicos.cadastroService.criarMedico(medico({ email: 'novo@clinica.com', crm: '654321/RJ', senha: '123' }));
    } catch (e) {
      senhaFraca = e;
    }
    expect(senhaFraca.status).toBe(400);
    expect(senhaFraca.message).toBe('Senha deve ter no mínimo 8 caracteres, com letras e números.');
  });
});
```
