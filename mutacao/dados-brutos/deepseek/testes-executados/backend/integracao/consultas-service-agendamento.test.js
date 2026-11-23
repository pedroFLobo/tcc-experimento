// Integração: agendamento de consultas pelo fluxo de serviços (RF08, RN16–RN19).
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');
const clock = require('../../src/utils/clock');

let ctx;
let recepcao;
let carlos;
let beatriz;
let ana;
let joao;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  const db = abrirBanco(':memory:');
  const dados = semear(db);
  ctx = { db, ...dados, ...criarServicos(db) };
  recepcao = { perfil: 'RECEPCAO' };
  [carlos, beatriz] = ctx.medicos;
  [ana, joao] = ctx.pacientes;
});

afterEach(() => {
  ctx.db.close();
  clock.definirAgora(null);
});

function agendar(pacienteId, medicoId, inicio) {
  return ctx.consultasService.agendar(recepcao, { pacienteId, medicoId, inicio });
}

describe('agendar — criação da consulta', () => {
  /**
   * @caso CT-INT-148
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1
   * @objetivo Agendar uma consulta pela recepção
   * @resultadoEsperado A consulta é gravada como AGENDADA com médico, paciente e valor
   */
  test('cria consulta AGENDADA com os dados informados', () => {
    const consulta = agendar(ana.id, carlos.id, '2026-10-20 09:00');
    expect(consulta).toMatchObject({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-20 09:00',
      fim: '2026-10-20 09:30',
      status: 'AGENDADA',
      valorCentavos: 15000,
      retornoDe: null,
      remarcacoes: 0,
    });
  });

  /**
   * @caso CT-INT-149
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1, RN08
   * @objetivo Calcular o fim da consulta pela duração do médico
   * @resultadoEsperado Uma consulta de 45 minutos termina 45 minutos depois
   */
  test('fim respeita a duração do médico', () => {
    const consulta = agendar(ana.id, beatriz.id, '2026-10-21 09:45');
    expect(consulta.fim).toBe('2026-10-21 10:30');
  });

  /**
   * @caso CT-INT-150
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.2, RN22
   * @objetivo Aplicar o preço da especialidade ao valor da consulta
   * @resultadoEsperado A consulta de cardiologia custa 30000 centavos
   */
  test('valor vem do preço da especialidade', () => {
    expect(agendar(ana.id, beatriz.id, '2026-10-21 09:00').valorCentavos).toBe(30000);
  });

  /**
   * @caso CT-INT-151
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.2, RN23
   * @objetivo Aplicar 10% de desconto para paciente idoso
   * @resultadoEsperado A consulta de João custa 13500 centavos
   */
  test('paciente idoso recebe desconto de 10%', () => {
    expect(agendar(joao.id, carlos.id, '2026-10-20 10:00').valorCentavos).toBe(13500);
  });

  /**
   * @caso CT-INT-152
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RF08.1
   * @objetivo Registrar a data de criação com o relógio do sistema
   * @resultadoEsperado criadoEm e atualizadoEm valem 2026-10-19 08:00
   */
  test('grava criadoEm e atualizadoEm com o agora do relógio', () => {
    const consulta = agendar(ana.id, carlos.id, '2026-10-20 09:00');
    expect(consulta.criadoEm).toBe('2026-10-19 08:00');
    expect(consulta.atualizadoEm).toBe('2026-10-19 08:00');
  });

  /**
   * @caso CT-INT-153
   * @nivel integracao
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF08.1
   * @objetivo Persistir a consulta e permitir recuperá-la pelo id
   * @resultadoEsperado obter devolve o mesmo registro criado
   */
  test('consulta fica disponível para leitura após o agendamento', () => {
    const consulta = agendar(ana.id, carlos.id, '2026-10-20 09:00');
    expect(ctx.consultasService.obter(recepcao, consulta.id)).toMatchObject({ id: consulta.id, inicio: '2026-10-20 09:00' });
  });

  /**
   * @caso CT-INT-154
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1
   * @objetivo Aceitar pacienteId enviado como texto
   * @resultadoEsperado A consulta é criada para o paciente convertido para número
   */
  test('aceita pacienteId como texto', () => {
    const consulta = agendar(String(ana.id), String(carlos.id), '2026-10-20 09:00');
    expect(consulta.pacienteId).toBe(ana.id);
    expect(consulta.medicoId).toBe(carlos.id);
  });
});

describe('agendar — permissões por perfil', () => {
  /**
   * @caso CT-INT-155
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF08.1, RN30
   * @objetivo Permitir que o paciente agende para si mesmo omitindo o id
   * @resultadoEsperado A consulta é criada com pacienteId do próprio ator
   */
  test('paciente agenda para si mesmo', () => {
    const ator = { perfil: 'PACIENTE', pacienteId: ana.id };
    const consulta = ctx.consultasService.agendar(ator, { medicoId: carlos.id, inicio: '2026-10-20 09:00' });
    expect(consulta.pacienteId).toBe(ana.id);
  });

  /**
   * @caso CT-INT-156
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir que o paciente agende para outra pessoa
   * @resultadoEsperado agendar lança 403 SEM_PERMISSAO
   */
  test('paciente não agenda para outro paciente', () => {
    const ator = { perfil: 'PACIENTE', pacienteId: ana.id };
    expect(() => ctx.consultasService.agendar(ator, { pacienteId: joao.id, medicoId: carlos.id, inicio: '2026-10-20 09:00' })).toThrow(
      expect.objectContaining({ status: 403, codigo: 'SEM_PERMISSAO', message: 'Você só pode agendar consultas para si mesmo.' }),
    );
  });

  /**
   * @caso CT-INT-157
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir que o médico crie consultas
   * @resultadoEsperado agendar lança 403 SEM_PERMISSAO
   */
  test('médico não agenda consultas', () => {
    const ator = { perfil: 'MEDICO', medicoId: carlos.id };
    expect(() => ctx.consultasService.agendar(ator, { pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-20 09:00' })).toThrow(
      expect.objectContaining({ status: 403, message: 'Médicos não agendam consultas. Procure a recepção.' }),
    );
  });

  /**
   * @caso CT-INT-158
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF08.1
   * @objetivo Obrigar a recepção a informar o paciente
   * @resultadoEsperado agendar lança 400 com a mensagem "Informe o paciente."
   */
  test('recepção precisa informar o paciente', () => {
    expect(() => ctx.consultasService.agendar(recepcao, { medicoId: carlos.id, inicio: '2026-10-20 09:00' })).toThrow(
      expect.objectContaining({ status: 400, codigo: 'VALIDACAO', message: 'Informe o paciente.' }),
    );
  });

  /**
   * @caso CT-INT-159
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF08.1
   * @objetivo Obrigar a informar o médico
   * @resultadoEsperado agendar lança 400 com a mensagem "Informe o médico."
   */
  test('agendamento exige médico', () => {
    expect(() => ctx.consultasService.agendar(recepcao, { pacienteId: ana.id, inicio: '2026-10-20 09:00' })).toThrow(
      expect.objectContaining({ status: 400, message: 'Informe o médico.' }),
    );
  });
});

describe('agendar — validações de cadastro', () => {
  /**
   * @caso CT-INT-160
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF08.1, RNF04
   * @objetivo Recusar paciente inexistente
   * @resultadoEsperado agendar lança 404 NAO_ENCONTRADO
   */
  test('paciente inexistente devolve 404', () => {
    expect(() => agendar(9999, carlos.id, '2026-10-20 09:00')).toThrow(
      expect.objectContaining({ status: 404, message: 'Paciente não encontrado.' }),
    );
  });

  /**
   * @caso CT-INT-161
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF08.1, RNF04
   * @objetivo Recusar médico inexistente
   * @resultadoEsperado agendar lança 404 NAO_ENCONTRADO
   */
  test('médico inexistente devolve 404', () => {
    expect(() => agendar(ana.id, 9999, '2026-10-20 09:00')).toThrow(
      expect.objectContaining({ status: 404, message: 'Médico não encontrado.' }),
    );
  });

  /**
   * @caso CT-INT-162
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Recusar agendamento para paciente inativo
   * @resultadoEsperado agendar lança 422 REGRA_NEGOCIO
   */
  test('paciente inativo não agenda', () => {
    ctx.cadastroService.definirUsuarioAtivo(ana.usuarioId, false);
    expect(() => agendar(ana.id, carlos.id, '2026-10-20 09:00')).toThrow(
      expect.objectContaining({ status: 422, message: 'Paciente inativo não pode agendar consultas.' }),
    );
  });

  /**
   * @caso CT-INT-163
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Recusar agendamento com médico inativo
   * @resultadoEsperado agendar lança 422 REGRA_NEGOCIO
   */
  test('médico inativo não recebe agendamento', () => {
    ctx.cadastroService.definirUsuarioAtivo(carlos.usuarioId, false);
    expect(() => agendar(ana.id, carlos.id, '2026-10-20 09:00')).toThrow(
      expect.objectContaining({ status: 422, message: 'Médico inativo não recebe agendamentos.' }),
    );
  });
});

describe('agendar — antecedência e disponibilidade', () => {
  /**
   * @caso CT-INT-164
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04, RNF03
   * @objetivo Recusar horário com formato inválido
   * @resultadoEsperado agendar lança 400 VALIDACAO
   */
  test.skip('horário malformado devolve 400', () => {
    expect(() => agendar(ana.id, carlos.id, '2026-10-20T09:00')).toThrow(
      expect.objectContaining({ status: 400, message: 'Horário inválido. Use o formato AAAA-MM-DD HH:mm.' }),
    );
  });

  /**
   * @caso CT-INT-165
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Recusar agendamento com menos de 2 horas de antecedência
   * @resultadoEsperado agendar lança 422 citando a antecedência mínima
   */
  test('recusa horário a menos de 2 horas', () => {
    expect(() => agendar(ana.id, carlos.id, '2026-10-19 09:30')).toThrow(
      expect.objectContaining({ status: 422, message: 'A consulta deve ser agendada com no mínimo 2 horas de antecedência.' }),
    );
  });

  /**
   * @caso CT-INT-166
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Aceitar agendamento no limite de 2 horas de antecedência
   * @resultadoEsperado A consulta das 10:00 é criada
   */
  test('aceita exatamente 2 horas de antecedência', () => {
    expect(agendar(ana.id, carlos.id, '2026-10-19 10:00').inicio).toBe('2026-10-19 10:00');
  });

  /**
   * @caso CT-INT-167
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Recusar agendamento com mais de 60 dias de antecedência
   * @resultadoEsperado agendar lança 422 citando a antecedência máxima
   */
  test('recusa horário a mais de 60 dias', () => {
    expect(() => agendar(ana.id, carlos.id, '2026-12-18 09:00')).toThrow(
      expect.objectContaining({ status: 422, message: 'A consulta deve ser agendada com no máximo 60 dias de antecedência.' }),
    );
  });

  /**
   * @caso CT-INT-168
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN17
   * @objetivo Recusar horário fora da grade do médico
   * @resultadoEsperado agendar lança 409 CONFLITO
   */
  test('recusa horário que não está na grade', () => {
    expect(() => agendar(ana.id, carlos.id, '2026-10-20 09:07')).toThrow(
      expect.objectContaining({ status: 409, codigo: 'CONFLITO', message: 'Horário indisponível para este médico.' }),
    );
  });

  /**
   * @caso CT-INT-169
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN17
   * @objetivo Recusar horário em dia sem atendimento do médico
   * @resultadoEsperado agendar lança 409 CONFLITO
   */
  test('recusa dia sem grade do médico', () => {
    expect(() => agendar(ana.id, beatriz.id, '2026-10-20 09:00')).toThrow(
      expect.objectContaining({ status: 409, codigo: 'CONFLITO' }),
    );
  });

  /**
   * @caso CT-INT-170
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN17
   * @objetivo Recusar horário já ocupado por outra consulta do médico
   * @resultadoEsperado agendar lança 409 CONFLITO
   */
  test('recusa horário ocupado', () => {
    agendar(ana.id, carlos.id, '2026-10-20 09:00');
    expect(() => agendar(joao.id, carlos.id, '2026-10-20 09:00')).toThrow(
      expect.objectContaining({ status: 409, message: 'Horário indisponível para este médico.' }),
    );
  });

  /**
   * @caso CT-INT-171
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN18
   * @objetivo Impedir que o paciente tenha duas consultas no mesmo horário
   * @resultadoEsperado agendar lança 409 citando a consulta simultânea
   */
  test('paciente não pode ter duas consultas no mesmo horário', () => {
    agendar(ana.id, carlos.id, '2026-10-20 08:00');
    expect(() => agendar(ana.id, ctx.medicos[3].id, '2026-10-20 08:00')).toThrow(
      expect.objectContaining({ status: 409, message: 'O paciente já possui outra consulta neste horário.' }),
    );
  });

  /**
   * @caso CT-INT-172
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Manter o banco sem a consulta quando o agendamento falha
   * @resultadoEsperado listar continua vazio após uma tentativa em horário ocupado
   */
  test('agendamento recusado não grava registro', () => {
    expect(() => agendar(ana.id, carlos.id, '2026-10-20 09:07')).toThrow();
    expect(ctx.consultasService.listar(recepcao)).toEqual([]);
  });

  /**
   * @caso CT-INT-173
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Não considerar consulta cancelada como ocupante do horário
   * @resultadoEsperado O mesmo horário pode ser reagendado após o cancelamento
   */
  test('horário cancelado volta a ser agendável', () => {
    const primeira = agendar(ana.id, carlos.id, '2026-10-20 09:00');
    ctx.consultasService.cancelar(recepcao, primeira.id, { motivo: 'Imprevisto' });
    expect(agendar(joao.id, carlos.id, '2026-10-20 09:00').status).toBe('AGENDADA');
  });
});

describe('agendar — limites por paciente', () => {
  /**
   * @caso CT-INT-174
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Impedir uma segunda consulta ativa na mesma especialidade
   * @resultadoEsperado agendar lança 422 citando a especialidade
   */
  test('recusa segunda consulta na mesma especialidade', () => {
    agendar(ana.id, carlos.id, '2026-10-20 08:00');
    expect(() => agendar(ana.id, carlos.id, '2026-10-20 09:00')).toThrow(
      expect.objectContaining({ status: 422, message: 'O paciente já possui uma consulta agendada nesta especialidade.' }),
    );
  });

  /**
   * @caso CT-INT-175
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Impedir a quarta consulta ativa do paciente
   * @resultadoEsperado agendar lança 422 citando o limite de 3 consultas
   */
  test('recusa a quarta consulta ativa', () => {
    agendar(ana.id, ctx.medicos[0].id, '2026-10-20 08:00');
    agendar(ana.id, ctx.medicos[1].id, '2026-10-21 09:00');
    agendar(ana.id, ctx.medicos[2].id, '2026-10-20 13:00');
    expect(() => agendar(ana.id, ctx.medicos[3].id, '2026-10-20 09:00')).toThrow(
      expect.objectContaining({ status: 422, message: 'O paciente já possui 3 consultas agendadas, que é o limite.' }),
    );
  });

  /**
   * @caso CT-INT-176
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Permitir uma consulta por especialidade em especialidades diferentes
   * @resultadoEsperado As três consultas são criadas com sucesso
   */
  test('aceita consultas em especialidades diferentes', () => {
    agendar(ana.id, ctx.medicos[0].id, '2026-10-20 08:00');
    agendar(ana.id, ctx.medicos[1].id, '2026-10-21 09:00');
    agendar(ana.id, ctx.medicos[2].id, '2026-10-20 13:00');
    expect(ctx.consultasService.listar(recepcao)).toHaveLength(3);
  });

  /**
   * @caso CT-INT-177
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Liberar a vaga de especialidade depois do cancelamento
   * @resultadoEsperado Uma nova consulta na mesma especialidade é aceita
   */
  test('cancelamento libera a vaga da especialidade', () => {
    const consulta = agendar(ana.id, carlos.id, '2026-10-20 08:00');
    ctx.consultasService.cancelar(recepcao, consulta.id, { motivo: 'Mudança de planos' });
    expect(agendar(ana.id, carlos.id, '2026-10-20 09:00').status).toBe('AGENDADA');
  });
});
