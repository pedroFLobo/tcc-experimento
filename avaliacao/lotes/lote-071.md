# lote-071

Modelo: gemini

Avalie com a skill `juiz-casos-teste` **somente os 12 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| gemini-0014 | CT-API-030 | POST /api/consultas - paciente agenda consulta com sucesso | passou |  |
| gemini-0015 | CT-API-031 | POST /api/consultas - paciente recebe 403 ao tentar agendar para outro paciente | passou |  |
| gemini-0016 | CT-API-032 | POST /api/consultas - médico recebe 403 ao tentar agendar consulta | passou |  |
| gemini-0017 | CT-API-033 | POST /api/consultas - responde 422 para antecedência inferior a 2 horas | passou |  |
| gemini-0018 | CT-API-034 | GET /api/consultas - paciente lista apenas as próprias consultas | passou |  |
| gemini-0019 | CT-API-035 | GET /api/consultas/:id - paciente recebe 403 ao acessar consulta de outro paciente | passou |  |
| gemini-0020 | CT-API-036 | POST /api/consultas/:id/confirmar - confirma consulta com sucesso | passou |  |
| gemini-0021 | CT-API-037 | POST /api/consultas/:id/cancelar - paciente cancela consulta com antecedência | passou |  |
| gemini-0022 | CT-API-038 | POST /api/consultas/:id/cancelar - recepção deve informar motivo | passou |  |
| gemini-0023 | CT-API-039 | POST /api/consultas/:id/remarcar - remarca consulta com sucesso | passou |  |
| gemini-0024 | CT-API-040 | POST /api/consultas/:id/realizar - médico registra atendimento | passou |  |
| gemini-0025 | CT-API-041 | POST /api/consultas/:id/falta - registra falta após tolerância de 15 minutos | passou |  |

## Arquivo: backend/__testes__/api/consultas-api.test.js

```js
const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear, SENHA_PADRAO } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');
const clock = require('../../src/utils/clock');

describe('API: Consultas (/api/consultas)', () => {
  let db;
  let app;
  let tokenRecepcao;
  let tokenMedico1;
  let tokenPacienteAna;
  let tokenPacienteJoao;
  const agoraFixo = new Date('2026-10-19T08:00:00'); // Segunda-feira 08:00

  beforeEach(async () => {
    clock.definirAgora(agoraFixo);
    db = abrirBanco(':memory:');
    semear(db);
    app = criarApp({ db });

    const lRec = await request(app).post('/api/auth/login').send({ email: 'recepcao@clinica.com', senha: SENHA_PADRAO });
    tokenRecepcao = lRec.body.token;

    const lMed1 = await request(app).post('/api/auth/login').send({ email: 'carlos@clinica.com', senha: SENHA_PADRAO });
    tokenMedico1 = lMed1.body.token; // Médico 1

    const lAna = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: SENHA_PADRAO });
    tokenPacienteAna = lAna.body.token; // Paciente 1

    const lJoao = await request(app).post('/api/auth/login').send({ email: 'joao@email.com', senha: SENHA_PADRAO });
    tokenPacienteJoao = lJoao.body.token; // Paciente 2
  });

  afterEach(() => {
    clock.definirAgora(null);
    db.close();
  });

  /**
   * @caso CT-API-030
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1, RF08.2
   * @objetivo Agendar consulta via POST /api/consultas por paciente autenticado
   * @resultadoEsperado Status 201 com dados da consulta criada
   */
  test('POST /api/consultas - paciente agenda consulta com sucesso', async () => {
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenPacienteAna}`)
      .send({
        medicoId: 1,
        inicio: '2026-10-20 09:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('AGENDADA');
    expect(res.body.valorCentavos).toBe(15000);
  });

  /**
   * @caso CT-API-031
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF08.1, RN30
   * @objetivo Impedir paciente de agendar consulta em nome de outro paciente
   * @resultadoEsperado Status 403 com erro.codigo = SEM_PERMISSAO
   */
  test('POST /api/consultas - paciente recebe 403 ao tentar agendar para outro paciente', async () => {
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenPacienteAna}`)
      .send({
        pacienteId: 2, // ID de João
        medicoId: 1,
        inicio: '2026-10-20 09:30',
      });

    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-032
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RF08.1, RN30
   * @objetivo Impedir perfil MÉDICO de agendar consultas diretamente pela API
   * @resultadoEsperado Status 403 com erro.codigo = SEM_PERMISSAO
   */
  test('POST /api/consultas - médico recebe 403 ao tentar agendar consulta', async () => {
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenMedico1}`)
      .send({
        pacienteId: 1,
        medicoId: 1,
        inicio: '2026-10-20 10:00',
      });

    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-033
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN16, RNF04
   * @objetivo Rejeitar agendamento com menos de 2 horas de antecedência
   * @resultadoEsperado Status 422 com erro.codigo = REGRA_NEGOCIO
   */
  test('POST /api/consultas - responde 422 para antecedência inferior a 2 horas', async () => {
    // Agora é 2026-10-19 08:00 -> tenta 2026-10-19 09:00 (1h depois)
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenPacienteAna}`)
      .send({
        medicoId: 1,
        inicio: '2026-10-19 09:00',
      });

    expect(res.status).toBe(422);
    expect(res.body.erro.codigo).toBe('REGRA_NEGOCIO');
    expect(res.body.erro.mensagem).toMatch(/mínimo 2 horas de antecedência/i);
  });

  /**
   * @caso CT-API-034
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.1, RN30
   * @objetivo Paciente visualiza somente as próprias consultas na listagem
   * @resultadoEsperado Lista contém apenas consultas associadas ao paciente autenticado
   */
  test('GET /api/consultas - paciente lista apenas as próprias consultas', async () => {
    // Agenda consulta para Ana
    await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenPacienteAna}`)
      .send({ medicoId: 1, inicio: '2026-10-20 09:00' });

    // Agenda consulta para João via Recepção
    await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ pacienteId: 2, medicoId: 1, inicio: '2026-10-20 09:30' });

    // Ana consulta lista
    const res = await request(app)
      .get('/api/consultas')
      .set('Authorization', `Bearer ${tokenPacienteAna}`);

    expect(res.status).toBe(200);
    expect(res.body.every((c) => c.pacienteNome === 'Ana Pereira')).toBe(true);
  });

  /**
   * @caso CT-API-035
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.1, RN30
   * @objetivo Impedir paciente de obter detalhes de consulta de outro paciente
   * @resultadoEsperado Status 403 com erro.codigo = SEM_PERMISSAO
   */
  test('GET /api/consultas/:id - paciente recebe 403 ao acessar consulta de outro paciente', async () => {
    // Cria consulta para João
    const cRes = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ pacienteId: 2, medicoId: 1, inicio: '2026-10-20 09:30' });

    // Ana tenta acessar
    const res = await request(app)
      .get(`/api/consultas/${cRes.body.id}`)
      .set('Authorization', `Bearer ${tokenPacienteAna}`);

    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-036
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.1, RN25
   * @objetivo Confirmar consulta agendada nas 48h anteriores
   * @resultadoEsperado Status 200 com consulta no status CONFIRMADA
   */
  test('POST /api/consultas/:id/confirmar - confirma consulta com sucesso', async () => {
    const cRes = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenPacienteAna}`)
      .send({ medicoId: 1, inicio: '2026-10-20 09:00' }); // em 25h

    const res = await request(app)
      .post(`/api/consultas/${cRes.body.id}/confirmar`)
      .set('Authorization', `Bearer ${tokenPacienteAna}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CONFIRMADA');
  });

  /**
   * @caso CT-API-037
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.2, RN26
   * @objetivo Cancelar consulta pelo paciente com mais de 24 horas de antecedência
   * @resultadoEsperado Status 200 com consulta no status CANCELADA
   */
  test('POST /api/consultas/:id/cancelar - paciente cancela consulta com antecedência', async () => {
    const cRes = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenPacienteAna}`)
      .send({ medicoId: 1, inicio: '2026-10-21 09:00' }); // em 49h

    const res = await request(app)
      .post(`/api/consultas/${cRes.body.id}/cancelar`)
      .set('Authorization', `Bearer ${tokenPacienteAna}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELADA');
    expect(res.body.canceladoPor).toBe('PACIENTE');
  });

  /**
   * @caso CT-API-038
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF09.2, RN26
   * @objetivo Exigir motivo no cancelamento efetuado pela recepção
   * @resultadoEsperado Status 422 REGRA_NEGOCIO se motivo for omitido
   */
  test('POST /api/consultas/:id/cancelar - recepção deve informar motivo', async () => {
    const cRes = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ pacienteId: 1, medicoId: 1, inicio: '2026-10-20 09:00' });

    const resSemMotivo = await request(app)
      .post(`/api/consultas/${cRes.body.id}/cancelar`)
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ motivo: '' });

    expect(resSemMotivo.status).toBe(422);
    expect(resSemMotivo.body.erro.mensagem).toMatch(/Informe o motivo do cancelamento/i);

    const resComMotivo = await request(app)
      .post(`/api/consultas/${cRes.body.id}/cancelar`)
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ motivo: 'Imprevisto na recepção' });

    expect(resComMotivo.status).toBe(200);
    expect(resComMotivo.body.motivoCancelamento).toBe('Imprevisto na recepção');
  });

  /**
   * @caso CT-API-039
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.3, RN27
   * @objetivo Remarcar consulta com novo horário válido
   * @resultadoEsperado Status 200 com horário atualizado e remarcacoes incrementado
   */
  test('POST /api/consultas/:id/remarcar - remarca consulta com sucesso', async () => {
    const cRes = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenPacienteAna}`)
      .send({ medicoId: 1, inicio: '2026-10-21 09:00' });

    const res = await request(app)
      .post(`/api/consultas/${cRes.body.id}/remarcar`)
      .set('Authorization', `Bearer ${tokenPacienteAna}`)
      .send({ inicio: '2026-10-21 10:00' });

    expect(res.status).toBe(200);
    expect(res.body.inicio).toBe('2026-10-21 10:00');
    expect(res.body.remarcacoes).toBe(1);
  });

  /**
   * @caso CT-API-040
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.4, RN28
   * @objetivo Médico dono registra atendimento realizado com observações
   * @resultadoEsperado Status 200 com status REALIZADA e observações salvas
   */
  test('POST /api/consultas/:id/realizar - médico registra atendimento', async () => {
    // Insere consulta no banco com início no horário atual
    const cId = app.locals.servicos.repos.consultas.inserir({
      pacienteId: 1,
      medicoId: 1,
      inicio: '2026-10-19 08:00',
      fim: '2026-10-19 08:30',
      valorCentavos: 15000,
      agora: '2026-10-18 08:00',
    });

    const res = await request(app)
      .post(`/api/consultas/${cId}/realizar`)
      .set('Authorization', `Bearer ${tokenMedico1}`)
      .send({ observacoes: 'Consulta de rotina concluída.' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REALIZADA');
    expect(res.body.observacoes).toBe('Consulta de rotina concluída.');
  });

  /**
   * @caso CT-API-041
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.5, RN29
   * @objetivo Registrar falta do paciente após decorridos 15 minutos do horário de início
   * @resultadoEsperado Status 200 com status FALTA
   */
  test('POST /api/consultas/:id/falta - registra falta após tolerância de 15 minutos', async () => {
    // Consulta iniciada há 20 minutos (07:40)
    const cId = app.locals.servicos.repos.consultas.inserir({
      pacienteId: 1,
      medicoId: 1,
      inicio: '2026-10-19 07:40',
      fim: '2026-10-19 08:10',
      valorCentavos: 15000,
      agora: '2026-10-18 08:00',
    });

    const res = await request(app)
      .post(`/api/consultas/${cId}/falta`)
      .set('Authorization', `Bearer ${tokenRecepcao}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('FALTA');
  });
});
```
