# lote-012

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 14 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0164 | CT-INT-110 | cria bloqueio com motivo | passou |  |
| deepseek-0165 | CT-INT-111 | lista bloqueios ordenados | passou |  |
| deepseek-0166 | CT-INT-112 | recusa data final anterior à inicial | passou |  |
| deepseek-0167 | CT-INT-113 | recusa bloqueio no passado | passou |  |
| deepseek-0168 | CT-INT-114 | permite bloqueio começando hoje | passou |  |
| deepseek-0169 | CT-INT-115 | recusa bloqueio com consulta ativa no período | passou |  |
| deepseek-0170 | CT-INT-116 | consulta cancelada não impede bloqueio | passou |  |
| deepseek-0171 | CT-INT-117 | motivo é opcional | passou |  |
| deepseek-0172 | CT-INT-118 | recusa datas malformadas | passou |  |
| deepseek-0173 | CT-INT-119 | médico cria bloqueio na própria agenda | passou |  |
| deepseek-0174 | CT-INT-120 | médico não cria bloqueio na agenda de outro | passou |  |
| deepseek-0175 | CT-INT-121 | remove bloqueio | passou |  |
| deepseek-0176 | CT-INT-122 | bloqueio de outro médico não é encontrado | passou |  |
| deepseek-0177 | CT-INT-123 | bloqueio inexistente devolve 404 | passou |  |

## Arquivo: backend/__testes__/integracao/agenda-bloqueios.test.js

```js
// Integração: bloqueios de agenda por período de datas (RF06, RN12, RN13, RN30).
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

function agendarCarlos(inicio) {
  return ctx.consultasService.agendar(recepcao, {
    pacienteId: ctx.pacientes[0].id,
    medicoId: ctx.medicos[0].id,
    inicio,
  });
}

describe('criarBloqueio', () => {
  /**
   * @caso CT-INT-110
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.1
   * @objetivo Criar um bloqueio de férias com período e motivo
   * @resultadoEsperado O bloqueio é criado com data inicial, final e motivo
   */
  test('cria bloqueio com motivo', () => {
    const bloqueio = ctx.agendaService.criarBloqueio(recepcao, ctx.medicos[0].id, {
      dataInicio: '2026-11-02',
      dataFim: '2026-11-06',
      motivo: 'Férias',
    });
    expect(bloqueio).toMatchObject({ medicoId: ctx.medicos[0].id, dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Férias' });
  });

  /**
   * @caso CT-INT-111
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.1, RF06.2
   * @objetivo Listar os bloqueios do médico em ordem de data
   * @resultadoEsperado Os dois bloqueios aparecem ordenados pela data inicial
   */
  test('lista bloqueios ordenados', () => {
    ctx.agendaService.criarBloqueio(recepcao, ctx.medicos[0].id, { dataInicio: '2026-12-01', dataFim: '2026-12-02', motivo: 'Congresso' });
    ctx.agendaService.criarBloqueio(recepcao, ctx.medicos[0].id, { dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Férias' });
    const lista = ctx.agendaService.listarBloqueios(recepcao, ctx.medicos[0].id);
    expect(lista.map((b) => b.dataInicio)).toEqual(['2026-11-02', '2026-12-01']);
  });

  /**
   * @caso CT-INT-112
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN12
   * @objetivo Recusar bloqueio com data final anterior à inicial
   * @resultadoEsperado criarBloqueio lança 400 VALIDACAO
   */
  test('recusa data final anterior à inicial', () => {
    expect(() =>
      ctx.agendaService.criarBloqueio(recepcao, ctx.medicos[0].id, { dataInicio: '2026-11-06', dataFim: '2026-11-02' }),
    ).toThrow(expect.objectContaining({ status: 400, message: 'A data final do bloqueio não pode ser anterior à inicial.' }));
  });

  /**
   * @caso CT-INT-113
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN12
   * @objetivo Recusar bloqueio que começa no passado
   * @resultadoEsperado criarBloqueio lança 422 REGRA_NEGOCIO
   */
  test('recusa bloqueio no passado', () => {
    expect(() =>
      ctx.agendaService.criarBloqueio(recepcao, ctx.medicos[0].id, { dataInicio: '2026-10-18', dataFim: '2026-10-20' }),
    ).toThrow(expect.objectContaining({ status: 422, message: 'O bloqueio não pode começar no passado.' }));
  });

  /**
   * @caso CT-INT-114
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN12
   * @objetivo Permitir bloqueio que começa hoje
   * @resultadoEsperado O bloqueio de hoje é criado com sucesso
   */
  test('permite bloqueio começando hoje', () => {
    const bloqueio = ctx.agendaService.criarBloqueio(recepcao, ctx.medicos[0].id, { dataInicio: '2026-10-19', dataFim: '2026-10-19' });
    expect(bloqueio.dataInicio).toBe('2026-10-19');
  });

  /**
   * @caso CT-INT-115
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN13
   * @objetivo Recusar bloqueio em período com consulta ativa
   * @resultadoEsperado criarBloqueio lança 422 citando a consulta existente
   */
  test('recusa bloqueio com consulta ativa no período', () => {
    agendarCarlos('2026-10-20 09:00');
    expect(() =>
      ctx.agendaService.criarBloqueio(recepcao, ctx.medicos[0].id, { dataInicio: '2026-10-20', dataFim: '2026-10-21' }),
    ).toThrow(expect.objectContaining({ status: 422, message: 'Existem 1 consulta(s) agendada(s) no período. Cancele ou remarque antes de bloquear.' }));
  });

  /**
   * @caso CT-INT-116
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN13
   * @objetivo Permitir bloqueio após o cancelamento da consulta do período
   * @resultadoEsperado O bloqueio é criado quando a única consulta do período está cancelada
   */
  test('consulta cancelada não impede bloqueio', () => {
    const consulta = agendarCarlos('2026-10-20 09:00');
    ctx.consultasService.cancelar(recepcao, consulta.id, { motivo: 'Paciente pediu' });
    const bloqueio = ctx.agendaService.criarBloqueio(recepcao, ctx.medicos[0].id, { dataInicio: '2026-10-20', dataFim: '2026-10-21' });
    expect(bloqueio.dataFim).toBe('2026-10-21');
  });

  /**
   * @caso CT-INT-117
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF06.1
   * @objetivo Aceitar bloqueio sem motivo informado
   * @resultadoEsperado O motivo é gravado como nulo
   */
  test('motivo é opcional', () => {
    const bloqueio = ctx.agendaService.criarBloqueio(recepcao, ctx.medicos[0].id, { dataInicio: '2026-11-02', dataFim: '2026-11-03' });
    expect(bloqueio.motivo).toBeNull();
  });

  /**
   * @caso CT-INT-118
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN12, RNF04
   * @objetivo Recusar datas em formato inválido
   * @resultadoEsperado criarBloqueio lança 400 citando AAAA-MM-DD
   */
  test('recusa datas malformadas', () => {
    expect(() =>
      ctx.agendaService.criarBloqueio(recepcao, ctx.medicos[0].id, { dataInicio: '02/11/2026', dataFim: '2026-11-03' }),
    ).toThrow(expect.objectContaining({ status: 400, message: 'Datas do bloqueio devem estar no formato AAAA-MM-DD.' }));
  });

  /**
   * @caso CT-INT-119
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF06.1, RN30
   * @objetivo Permitir que o médico crie bloqueio na própria agenda
   * @resultadoEsperado O bloqueio do médico logado é criado
   */
  test('médico cria bloqueio na própria agenda', () => {
    const bloqueio = ctx.agendaService.criarBloqueio(carlos, carlos.medicoId, { dataInicio: '2026-11-02', dataFim: '2026-11-02', motivo: 'Folga' });
    expect(bloqueio.medicoId).toBe(carlos.medicoId);
  });

  /**
   * @caso CT-INT-120
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir bloqueio na agenda de outro médico
   * @resultadoEsperado criarBloqueio lança 403 SEM_PERMISSAO
   */
  test('médico não cria bloqueio na agenda de outro', () => {
    expect(() =>
      ctx.agendaService.criarBloqueio(carlos, beatriz.medicoId, { dataInicio: '2026-11-02', dataFim: '2026-11-02' }),
    ).toThrow(expect.objectContaining({ status: 403 }));
  });
});

describe('removerBloqueio', () => {
  /**
   * @caso CT-INT-121
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.2
   * @objetivo Remover um bloqueio existente
   * @resultadoEsperado Depois da remoção a lista de bloqueios fica vazia
   */
  test('remove bloqueio', () => {
    const bloqueio = ctx.agendaService.criarBloqueio(recepcao, ctx.medicos[0].id, { dataInicio: '2026-11-02', dataFim: '2026-11-03' });
    ctx.agendaService.removerBloqueio(recepcao, ctx.medicos[0].id, bloqueio.id);
    expect(ctx.agendaService.listarBloqueios(recepcao, ctx.medicos[0].id)).toEqual([]);
  });

  /**
   * @caso CT-INT-122
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Recusar remoção de bloqueio de outro médico como 404
   * @resultadoEsperado removerBloqueio lança 404 NAO_ENCONTRADO
   */
  test('bloqueio de outro médico não é encontrado', () => {
    const bloqueio = ctx.agendaService.criarBloqueio(recepcao, ctx.medicos[0].id, { dataInicio: '2026-11-02', dataFim: '2026-11-03' });
    expect(() => ctx.agendaService.removerBloqueio(recepcao, ctx.medicos[1].id, bloqueio.id)).toThrow(
      expect.objectContaining({ status: 404, message: 'Bloqueio não encontrado.' }),
    );
  });

  /**
   * @caso CT-INT-123
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF06.2, RNF04
   * @objetivo Recusar remoção de bloqueio inexistente
   * @resultadoEsperado removerBloqueio lança 404 NAO_ENCONTRADO
   */
  test('bloqueio inexistente devolve 404', () => {
    expect(() => ctx.agendaService.removerBloqueio(recepcao, ctx.medicos[0].id, 9999)).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });
});
```
