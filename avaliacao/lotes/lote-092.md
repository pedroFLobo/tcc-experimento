# lote-092

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 16 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0001 | CT-API-040 | lista horários livres do dia | passou |  |
| glm-0002 | CT-API-041 | exclui horários com menos de 2 horas de antecedência | passou |  |
| glm-0003 | CT-API-042 | data ausente ou inválida retorna 400 | passou |  |
| glm-0004 | CT-API-043 | horários sem token retorna 401 | passou |  |
| glm-0005 | CT-API-044 | médico salva a própria grade | passou |  |
| glm-0006 | CT-API-045 | médico não altera grade de colega | passou |  |
| glm-0007 | CT-API-046 | blocos sobrepostos retornam 400 | passou |  |
| glm-0008 | CT-API-047 | consulta a grade do médico | passou |  |
| glm-0009 | CT-API-048 | recepção cria bloqueio | passou |  |
| glm-0010 | CT-API-049 | médico cria bloqueio na própria agenda | passou |  |
| glm-0011 | CT-API-050 | médico não cria bloqueio de colega | passou |  |
| glm-0012 | CT-API-051 | bloqueio sobre consulta ativa retorna 422 | falhou | Error: expect(received).toBe(expected) // Object.is equality Expected: 201 Received: 409 at Object.toBe (C:\Users\pedro\AppData\Local\Temp\clinica-experimento\g |
| glm-0013 | CT-API-052 | lista bloqueios do médico | passou |  |
| glm-0014 | CT-API-053 | remove bloqueio existente | passou |  |
| glm-0015 | CT-API-054 | remover bloqueio inexistente retorna 404 | passou |  |
| glm-0016 | CT-API-055 | data bloqueada devolve lista vazia | passou |  |

## Arquivo: backend/__testes__/api/agenda-api.test.js

```js
// Testes de API de grade, bloqueios e horários livres (RF05–RF07, RN10–RN15, RN30, RNF04).
const clock = require('../../src/utils/clock');
const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');

let db, app, tokenRecepcao, tokenPaciente, tokenMedico, tokenBeatriz;

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
  tokenBeatriz = await entrar('beatriz@clinica.com');
});

afterAll(() => {
  clock.definirAgora(null);
  db.close();
});

describe('horários livres (RF07, RN14, RN15)', () => {
  /**
   * @caso CT-API-040
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1, RN14
   * @objetivo Devolver os horários livres do dia em passos da duração do médico
   * @resultadoEsperado 200 com data ecoada e 16 horários de Carlos na terça 2026-10-20
   */
  test('lista horários livres do dia', async () => {
    const r = await request(app)
      .get('/api/medicos/1/horarios?data=2026-10-20')
      .set('Authorization', `Bearer ${tokenPaciente}`);
    expect(r.status).toBe(200);
    expect(r.body.data).toBe('2026-10-20');
    expect(r.body.horarios).toHaveLength(16);
    expect(r.body.horarios[0]).toBe('2026-10-20 08:00');
    expect(r.body.horarios[15]).toBe('2026-10-20 17:30');
  });

  /**
   * @caso CT-API-041
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15, RN16
   * @objetivo Excluir horários sem a antecedência mínima de 2 horas
   * @resultadoEsperado para Beatriz hoje, o primeiro horário retornado é 10:30
   */
  test('exclui horários com menos de 2 horas de antecedência', async () => {
    const r = await request(app)
      .get('/api/medicos/2/horarios?data=2026-10-19')
      .set('Authorization', `Bearer ${tokenPaciente}`);
    expect(r.status).toBe(200);
    expect(r.body.horarios[0]).toBe('2026-10-19 10:30');
    expect(r.body.horarios).not.toContain('2026-10-19 09:00');
  });

  /**
   * @caso CT-API-042
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF07.1, RNF04
   * @objetivo Tratar data ausente ou fora do formato na consulta de horários
   * @resultadoEsperado resposta 400 VALIDACAO pedindo o formato AAAA-MM-DD
   */
  test('data ausente ou inválida retorna 400', async () => {
    const semData = await request(app)
      .get('/api/medicos/1/horarios')
      .set('Authorization', `Bearer ${tokenPaciente}`);
    expect(semData.status).toBe(400);
    expect(semData.body.erro.mensagem).toBe('Data inválida. Use o formato AAAA-MM-DD.');
    const dataRuim = await request(app)
      .get('/api/medicos/1/horarios?data=31/10/2026')
      .set('Authorization', `Bearer ${tokenPaciente}`);
    expect(dataRuim.status).toBe(400);
  });

  /**
   * @caso CT-API-043
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2
   * @objetivo Exigir token para consultar horários
   * @resultadoEsperado requisição anônima devolve 401 NAO_AUTENTICADO
   */
  test('horários sem token retorna 401', async () => {
    const r = await request(app).get('/api/medicos/1/horarios?data=2026-10-20');
    expect(r.status).toBe(401);
    expect(r.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });
});

describe('grade semanal (RF05, RN10, RN11, RN30)', () => {
  /**
   * @caso CT-API-044
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.1, RF05.2
   * @objetivo Salvar a grade pelo próprio médico substituindo a anterior
   * @resultadoEsperado 200 com a nova grade de 1 bloco devolvida
   */
  test('médico salva a própria grade', async () => {
    const r = await request(app).put('/api/medicos/1/disponibilidades')
      .set('Authorization', `Bearer ${tokenMedico}`)
      .send({ blocos: [{ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' }] });
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(1);
    expect(r.body[0].diaSemana).toBe(1);
  });

  /**
   * @caso CT-API-045
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir que médico altere a grade de colega
   * @resultadoEsperado PUT do médico 2 sobre o médico 1 devolve 403 SEM_PERMISSAO
   */
  test('médico não altera grade de colega', async () => {
    const r = await request(app).put('/api/medicos/1/disponibilidades')
      .set('Authorization', `Bearer ${tokenBeatriz}`)
      .send({ blocos: [] });
    expect(r.status).toBe(403);
    expect(r.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-046
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN11, RNF04
   * @objetivo Recusar grade com blocos sobrepostos no mesmo dia
   * @resultadoEsperado resposta 400 VALIDACAO citando sobreposição
   */
  test('blocos sobrepostos retornam 400', async () => {
    const r = await request(app).put('/api/medicos/2/disponibilidades')
      .set('Authorization', `Bearer ${tokenBeatriz}`)
      .send({
        blocos: [
          { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
          { diaSemana: 1, horaInicio: '11:00', horaFim: '14:00' },
        ],
      });
    expect(r.status).toBe(400);
    expect(r.body.erro.mensagem).toContain('sobrepostos');
  });

  /**
   * @caso CT-API-047
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.1
   * @objetivo Consultar a grade vigente do médico
   * @resultadoEsperado GET disponibilidades devolve 200 com 1 bloco de segunda
   */
  test('consulta a grade do médico', async () => {
    const r = await request(app).get('/api/medicos/1/disponibilidades')
      .set('Authorization', `Bearer ${tokenPaciente}`);
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(1);
    expect(r.body[0]).toEqual({ id: expect.any(Number), diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' });
  });
});

describe('bloqueios (RF06, RN12, RN13, RN30)', () => {
  /**
   * @caso CT-API-048
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.1, RN12
   * @objetivo Criar bloqueio por período com motivo pela recepção
   * @resultadoEsperado resposta 201 com id, período e motivo 'Congresso'
   */
  test('recepção cria bloqueio', async () => {
    const r = await request(app).post('/api/medicos/1/bloqueios')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ dataInicio: '2026-11-05', dataFim: '2026-11-06', motivo: 'Congresso' });
    expect(r.status).toBe(201);
    expect(r.body.id).toBeGreaterThan(0);
    expect(r.body.motivo).toBe('Congresso');
    expect(r.body.dataFim).toBe('2026-11-06');
  });

  /**
   * @caso CT-API-049
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.1
   * @objetivo Criar bloqueio pelo próprio médico
   * @resultadoEsperado resposta 201 do bloqueio de férias em 2026-10-26
   */
  test('médico cria bloqueio na própria agenda', async () => {
    const r = await request(app).post('/api/medicos/1/bloqueios')
      .set('Authorization', `Bearer ${tokenMedico}`)
      .send({ dataInicio: '2026-10-26', dataFim: '2026-10-27', motivo: 'Férias' });
    expect(r.status).toBe(201);
    expect(r.body.motivo).toBe('Férias');
  });

  /**
   * @caso CT-API-050
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir que médico crie bloqueio na agenda de colega
   * @resultadoEsperado resposta 403 SEM_PERMISSAO
   */
  test('médico não cria bloqueio de colega', async () => {
    const r = await request(app).post('/api/medicos/1/bloqueios')
      .set('Authorization', `Bearer ${tokenBeatriz}`)
      .send({ dataInicio: '2026-11-10', dataFim: '2026-11-11', motivo: 'Alheio' });
    expect(r.status).toBe(403);
    expect(r.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-051
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN13
   * @objetivo Recusar bloqueio em período com consulta ativa do médico
   * @resultadoEsperado com consulta agendada em 2026-10-20, bloqueio nesse período devolve 422 citando 1 consulta
   */
  test('bloqueio sobre consulta ativa retorna 422', async () => {
    const agendar = await request(app).post('/api/consultas')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ pacienteId: 1, medicoId: 1, inicio: '2026-10-20 08:00' });
    expect(agendar.status).toBe(201);
    const r = await request(app).post('/api/medicos/1/bloqueios')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ dataInicio: '2026-10-20', dataFim: '2026-10-21', motivo: 'Reforma' });
    expect(r.status).toBe(422);
    expect(r.body.erro.mensagem).toContain('1 consulta');
  });

  /**
   * @caso CT-API-052
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.1
   * @objetivo Listar os bloqueios do médico
   * @resultadoEsperado resposta 200 com os 2 bloqueios criados
   */
  test('lista bloqueios do médico', async () => {
    const r = await request(app).get('/api/medicos/1/bloqueios')
      .set('Authorization', `Bearer ${tokenRecepcao}`);
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(2);
  });

  /**
   * @caso CT-API-053
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.2
   * @objetivo Remover bloqueio existente
   * @resultadoEsperado DELETE devolve 204 e a listagem passa a ter 1 bloqueio
   */
  test('remove bloqueio existente', async () => {
    const lista = await request(app).get('/api/medicos/1/bloqueios')
      .set('Authorization', `Bearer ${tokenRecepcao}`);
    const id = lista.body.find((b) => b.motivo === 'Congresso').id;
    const r = await request(app).delete(`/api/medicos/1/bloqueios/${id}`)
      .set('Authorization', `Bearer ${tokenRecepcao}`);
    expect(r.status).toBe(204);
    const depois = await request(app).get('/api/medicos/1/bloqueios')
      .set('Authorization', `Bearer ${tokenRecepcao}`);
    expect(depois.body).toHaveLength(1);
  });

  /**
   * @caso CT-API-054
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF06.2, RNF04
   * @objetivo Retornar 404 ao remover bloqueio inexistente
   * @resultadoEsperado DELETE de bloqueio 9999 devolve 404 NAO_ENCONTRADO
   */
  test('remover bloqueio inexistente retorna 404', async () => {
    const r = await request(app).delete('/api/medicos/1/bloqueios/9999')
      .set('Authorization', `Bearer ${tokenRecepcao}`);
    expect(r.status).toBe(404);
    expect(r.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });

  /**
   * @caso CT-API-055
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15, RN12
   * @objetivo Não devolver horários em data dentro de bloqueio
   * @resultadoEsperado GET horários de 2026-10-26 (segunda com grade) devolve lista vazia por bloqueio
   */
  test('data bloqueada devolve lista vazia', async () => {
    const r = await request(app)
      .get('/api/medicos/1/horarios?data=2026-10-26')
      .set('Authorization', `Bearer ${tokenPaciente}`);
    expect(r.status).toBe(200);
    expect(r.body.horarios).toEqual([]);
  });
});
```
