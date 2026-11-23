# lote-013

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 14 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0178 | CT-INT-096 | grava a grade semanal | passou |  |
| deepseek-0179 | CT-INT-097 | salvar substitui a grade anterior | passou |  |
| deepseek-0180 | CT-INT-098 | recepção gerencia a grade de qualquer médico | passou |  |
| deepseek-0181 | CT-INT-099 | médico edita a própria grade | passou |  |
| deepseek-0182 | CT-INT-100 | médico não edita a grade de outro | passou |  |
| deepseek-0183 | CT-INT-101 | paciente não edita grade | passou |  |
| deepseek-0184 | CT-INT-102 | grade inválida não altera a grade gravada | passou |  |
| deepseek-0185 | CT-INT-103 | grade vazia limpa os blocos | passou |  |
| deepseek-0186 | CT-INT-104 | recusa grade que não é lista | passou |  |
| deepseek-0187 | CT-INT-105 | converte dia da semana em texto | passou |  |
| deepseek-0188 | CT-INT-106 | recusa bloco fora do horário permitido | passou |  |
| deepseek-0189 | CT-INT-107 | lê a grade de exemplo | passou |  |
| deepseek-0190 | CT-INT-108 | ordena a grade por dia e horário | passou |  |
| deepseek-0191 | CT-INT-109 | médico inexistente devolve 404 | passou |  |

## Arquivo: backend/__testes__/integracao/agenda-grade.test.js

```js
// Integração: grade semanal de disponibilidade (RF05, RN10, RN11, RN30).
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');
const clock = require('../../src/utils/clock');

let ctx;
let recepcao;
let carlos;
let beatriz;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  const db = abrirBanco(':memory:');
  const dados = semear(db);
  ctx = { db, ...dados, ...criarServicos(db) };
  recepcao = { perfil: 'RECEPCAO' };
  carlos = ctx.authService.login('carlos@clinica.com', 'Senha123').usuario;
  beatriz = ctx.authService.login('beatriz@clinica.com', 'Senha123').usuario;
});

afterEach(() => {
  ctx.db.close();
  clock.definirAgora(null);
});

const BLOCO_MANHA = { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' };
const BLOCO_TARDE = { diaSemana: 1, horaInicio: '14:00', horaFim: '18:00' };

describe('salvarGrade', () => {
  /**
   * @caso CT-INT-096
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.1
   * @objetivo Gravar os blocos da grade semanal
   * @resultadoEsperado A grade salva contém os dois blocos informados
   */
  test('grava a grade semanal', () => {
    const grade = ctx.agendaService.salvarGrade(recepcao, ctx.medicos[0].id, [BLOCO_MANHA, BLOCO_TARDE]);
    expect(grade).toHaveLength(2);
    expect(grade[0]).toMatchObject({ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' });
  });

  /**
   * @caso CT-INT-097
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.2
   * @objetivo Substituir a grade anterior por inteiro ao salvar
   * @resultadoEsperado Depois de salvar um único bloco, a grade tem exatamente 1 bloco
   */
  test('salvar substitui a grade anterior', () => {
    ctx.agendaService.salvarGrade(recepcao, ctx.medicos[0].id, [BLOCO_MANHA, BLOCO_TARDE]);
    const grade = ctx.agendaService.salvarGrade(recepcao, ctx.medicos[0].id, [{ diaSemana: 3, horaInicio: '09:00', horaFim: '10:00' }]);
    expect(grade).toHaveLength(1);
    expect(grade[0].diaSemana).toBe(3);
  });

  /**
   * @caso CT-INT-098
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF05.1, RN30
   * @objetivo Permitir que a recepção gerencie a grade de qualquer médico
   * @resultadoEsperado A grade do médico de outra conta é salva com sucesso
   */
  test('recepção gerencia a grade de qualquer médico', () => {
    expect(ctx.agendaService.salvarGrade(recepcao, ctx.medicos[1].id, [BLOCO_MANHA])).toHaveLength(1);
  });

  /**
   * @caso CT-INT-099
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF05.1, RN30
   * @objetivo Permitir que o médico edite a própria grade
   * @resultadoEsperado O médico logado salva a própria grade
   */
  test('médico edita a própria grade', () => {
    expect(ctx.agendaService.salvarGrade(carlos, carlos.medicoId, [BLOCO_MANHA])).toHaveLength(1);
  });

  /**
   * @caso CT-INT-100
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir que o médico edite a grade de outro médico
   * @resultadoEsperado salvarGrade lança 403 SEM_PERMISSAO
   */
  test('médico não edita a grade de outro', () => {
    expect(() => ctx.agendaService.salvarGrade(carlos, beatriz.medicoId, [BLOCO_MANHA])).toThrow(
      expect.objectContaining({ status: 403, message: 'Você só pode gerenciar a sua própria agenda.' }),
    );
  });

  /**
   * @caso CT-INT-101
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir que o paciente altere a grade do médico
   * @resultadoEsperado salvarGrade lança 403 SEM_PERMISSAO
   */
  test('paciente não edita grade', () => {
    const ana = ctx.authService.login('ana@email.com', 'Senha123').usuario;
    expect(() => ctx.agendaService.salvarGrade(ana, ctx.medicos[0].id, [BLOCO_MANHA])).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  /**
   * @caso CT-INT-102
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo recuperabilidade
   * @requisito RN11, RNF04
   * @objetivo Manter a grade anterior quando a nova grade é inválida
   * @resultadoEsperado Depois de uma tentativa com blocos sobrepostos a grade original continua intacta
   */
  test('grade inválida não altera a grade gravada', () => {
    const antes = ctx.agendaService.salvarGrade(recepcao, ctx.medicos[0].id, [BLOCO_MANHA]);
    expect(() =>
      ctx.agendaService.salvarGrade(recepcao, ctx.medicos[0].id, [BLOCO_MANHA, { diaSemana: 1, horaInicio: '09:00', horaFim: '10:00' }]),
    ).toThrow(expect.objectContaining({ status: 400 }));
    expect(ctx.agendaService.obterGrade(ctx.medicos[0].id)).toHaveLength(antes.length);
  });

  /**
   * @caso CT-INT-103
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.2
   * @objetivo Limpar a grade ao salvar uma lista vazia
   * @resultadoEsperado A grade do médico fica sem blocos
   */
  test('grade vazia limpa os blocos', () => {
    ctx.agendaService.salvarGrade(recepcao, ctx.medicos[0].id, [BLOCO_MANHA]);
    expect(ctx.agendaService.salvarGrade(recepcao, ctx.medicos[0].id, [])).toEqual([]);
    expect(ctx.agendaService.obterGrade(ctx.medicos[0].id)).toEqual([]);
  });

  /**
   * @caso CT-INT-104
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF05.1, RNF04
   * @objetivo Recusar corpo sem lista de blocos
   * @resultadoEsperado salvarGrade lança 400 citando lista de blocos
   */
  test('recusa grade que não é lista', () => {
    expect(() => ctx.agendaService.salvarGrade(recepcao, ctx.medicos[0].id, undefined)).toThrow(
      expect.objectContaining({ status: 400, message: 'A grade deve ser uma lista de blocos.' }),
    );
  });

  /**
   * @caso CT-INT-105
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN10
   * @objetivo Converter dia da semana enviado como texto pelo formulário
   * @resultadoEsperado O bloco com diaSemana '2' é gravado como inteiro 2
   */
  test('converte dia da semana em texto', () => {
    const grade = ctx.agendaService.salvarGrade(recepcao, ctx.medicos[0].id, [{ diaSemana: '2', horaInicio: '08:00', horaFim: '09:00' }]);
    expect(grade[0].diaSemana).toBe(2);
  });

  /**
   * @caso CT-INT-106
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN10
   * @objetivo Recusar bloco fora do horário de funcionamento
   * @resultadoEsperado salvarGrade lança 400 citando 07:00 e 20:00
   */
  test('recusa bloco fora do horário permitido', () => {
    expect(() =>
      ctx.agendaService.salvarGrade(recepcao, ctx.medicos[0].id, [{ diaSemana: 1, horaInicio: '06:00', horaFim: '08:00' }]),
    ).toThrow(expect.objectContaining({ status: 400 }));
  });
});

describe('obterGrade', () => {
  /**
   * @caso CT-INT-107
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.1
   * @objetivo Ler a grade de exemplo do Dr. Carlos
   * @resultadoEsperado A grade tem 10 blocos, começando por segunda 08:00
   */
  test('lê a grade de exemplo', () => {
    const grade = ctx.agendaService.obterGrade(ctx.medicos[0].id);
    expect(grade).toHaveLength(10);
    expect(grade[0]).toMatchObject({ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' });
  });

  /**
   * @caso CT-INT-108
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.1
   * @objetivo Ordenar a grade por dia da semana e horário
   * @resultadoEsperado Os blocos vêm de segunda a sexta, manhã antes da tarde
   */
  test('ordena a grade por dia e horário', () => {
    const grade = ctx.agendaService.obterGrade(ctx.medicos[0].id);
    expect(grade.slice(0, 2).map((b) => b.horaInicio)).toEqual(['08:00', '14:00']);
    const dias = grade.map((b) => b.diaSemana);
    expect(dias).toEqual([...dias].sort((a, b) => a - b));
  });

  /**
   * @caso CT-INT-109
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN30
   * @objetivo Recusar consulta de grade de médico inexistente
   * @resultadoEsperado obterGrade lança 404 NAO_ENCONTRADO
   */
  test('médico inexistente devolve 404', () => {
    expect(() => ctx.agendaService.obterGrade(999)).toThrow(
      expect.objectContaining({ status: 404, message: 'Médico não encontrado.' }),
    );
  });
});
```
