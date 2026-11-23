// Integração: geração de horários livres (RF07, RN14, RN15, RN16).
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
  carlos = ctx.medicos[0];
  beatriz = ctx.medicos[1];
});

afterEach(() => {
  ctx.db.close();
  clock.definirAgora(null);
});

function agendar(paciente, medico, inicio) {
  return ctx.consultasService.agendar(recepcao, { pacienteId: paciente.id, medicoId: medico.id, inicio });
}

describe('horariosLivres — geração a partir da grade', () => {
  /**
   * @caso CT-INT-124
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF07.1, RN14
   * @objetivo Gerar todos os horários de um dia útil sem consultas
   * @resultadoEsperado A terça-feira de Carlos tem 16 horários de 30 minutos
   */
  test('gera 16 horários na terça de Carlos', () => {
    const horarios = ctx.agendaService.horariosLivres(carlos.id, '2026-10-20');
    expect(horarios).toHaveLength(16);
    expect(horarios[0]).toBe('2026-10-20 08:00');
    expect(horarios[15]).toBe('2026-10-20 17:30');
  });

  /**
   * @caso CT-INT-125
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Excluir do dia atual os horários com menos de 2 horas de antecedência
   * @resultadoEsperado A segunda-feira começa às 10:00 e tem 12 horários
   */
  test('filtra horários com menos de 2 horas no dia atual', () => {
    const horarios = ctx.agendaService.horariosLivres(carlos.id, '2026-10-19');
    expect(horarios).toHaveLength(12);
    expect(horarios[0]).toBe('2026-10-19 10:00');
    expect(horarios).not.toContain('2026-10-19 09:30');
  });

  /**
   * @caso CT-INT-126
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN16
   * @objetivo Incluir exatamente o horário que completa 2 horas de antecedência
   * @resultadoEsperado O horário das 10:00 está disponível
   */
  test('inclui horário no limite exato de 2 horas', () => {
    expect(ctx.agendaService.horariosLivres(carlos.id, '2026-10-19')).toContain('2026-10-19 10:00');
  });

  /**
   * @caso CT-INT-127
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1, RN14
   * @objetivo Devolver lista vazia em dia sem grade do médico
   * @resultadoEsperado A terça-feira de Beatriz não tem horários
   */
  test('dia sem grade devolve lista vazia', () => {
    expect(ctx.agendaService.horariosLivres(beatriz.id, '2026-10-20')).toEqual([]);
  });

  /**
   * @caso CT-INT-128
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1, RN14
   * @objetivo Devolver lista vazia no domingo
   * @resultadoEsperado O domingo de Carlos não tem horários
   */
  test('domingo devolve lista vazia', () => {
    expect(ctx.agendaService.horariosLivres(carlos.id, '2026-10-25')).toEqual([]);
  });

  /**
   * @caso CT-INT-129
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN14
   * @objetivo Gerar horários de 45 minutos respeitando a duração do médico
   * @resultadoEsperado A quarta-feira de Beatriz tem 8 horários de 45 minutos
   */
  test('respeita a duração de 45 minutos da Beatriz', () => {
    const horarios = ctx.agendaService.horariosLivres(beatriz.id, '2026-10-21');
    expect(horarios).toHaveLength(8);
    expect(horarios).toEqual([
      '2026-10-21 09:00',
      '2026-10-21 09:45',
      '2026-10-21 10:30',
      '2026-10-21 11:15',
      '2026-10-21 12:00',
      '2026-10-21 12:45',
      '2026-10-21 13:30',
      '2026-10-21 14:15',
    ]);
  });

  /**
   * @caso CT-INT-130
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN14
   * @objetivo Gerar horários apenas na grade de terça e quinta do Eduardo
   * @resultadoEsperado A terça-feira do Eduardo tem 12 horários a partir das 13:00
   */
  test('Eduardo só atende terça e quinta à tarde', () => {
    const horarios = ctx.agendaService.horariosLivres(ctx.medicos[2].id, '2026-10-20');
    expect(horarios).toHaveLength(12);
    expect(horarios[0]).toBe('2026-10-20 13:00');
    expect(horarios[11]).toBe('2026-10-20 18:30');
  });

  /**
   * @caso CT-INT-131
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN14
   * @objetivo Gerar horários de 15 minutos inclusive no sábado
   * @resultadoEsperado O sábado da Fernanda tem 16 horários
   */
  test('Fernanda atende no sábado com slots de 15 minutos', () => {
    const horarios = ctx.agendaService.horariosLivres(ctx.medicos[3].id, '2026-10-24');
    expect(horarios).toHaveLength(16);
    expect(horarios[1]).toBe('2026-10-24 08:15');
  });

  /**
   * @caso CT-INT-132
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Não gerar slot que não cabe inteiro no bloco de grade
   * @resultadoEsperado Um bloco de 08:00–09:45 com 30 minutos gera 3 horários
   */
  test('não gera slot que ultrapassa o fim do bloco', () => {
    ctx.agendaService.salvarGrade(recepcao, carlos.id, [{ diaSemana: 2, horaInicio: '08:00', horaFim: '09:45' }]);
    expect(ctx.agendaService.horariosLivres(carlos.id, '2026-10-20')).toEqual([
      '2026-10-20 08:00',
      '2026-10-20 08:30',
      '2026-10-20 09:00',
    ]);
  });

  /**
   * @caso CT-INT-133
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Devolver lista vazia para data além da janela de 60 dias
   * @resultadoEsperado 2026-12-31 não tem horários
   */
  test('data além de 60 dias devolve lista vazia', () => {
    expect(ctx.agendaService.horariosLivres(carlos.id, '2026-12-31')).toEqual([]);
  });

  /**
   * @caso CT-INT-134
   * @nivel integracao
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF07.1
   * @objetivo Entregar os horários no formato de data-hora completo
   * @resultadoEsperado Cada horário casa com AAAA-MM-DD HH:mm
   */
  test('horários saem no formato AAAA-MM-DD HH:mm', () => {
    const horarios = ctx.agendaService.horariosLivres(carlos.id, '2026-10-20');
    expect(horarios.every((h) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(h))).toBe(true);
  });
});

describe('horariosLivres — consultas ocupando a agenda', () => {
  /**
   * @caso CT-INT-135
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Remover do dia o horário já ocupado por consulta agendada
   * @resultadoEsperado O dia fica com 15 horários e sem o horário das 09:00
   */
  test('consulta agendada ocupa o horário', () => {
    agendar(ctx.pacientes[0], carlos, '2026-10-20 09:00');
    const horarios = ctx.agendaService.horariosLivres(carlos.id, '2026-10-20');
    expect(horarios).toHaveLength(15);
    expect(horarios).not.toContain('2026-10-20 09:00');
  });

  /**
   * @caso CT-INT-136
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Manter ocupado o horário de consulta confirmada
   * @resultadoEsperado O horário de uma consulta confirmada não aparece livre
   */
  test('consulta confirmada continua ocupando o horário', () => {
    const consulta = agendar(ctx.pacientes[0], carlos, '2026-10-20 09:00');
    ctx.consultasService.confirmar(recepcao, consulta.id);
    expect(ctx.agendaService.horariosLivres(carlos.id, '2026-10-20')).not.toContain('2026-10-20 09:00');
  });

  /**
   * @caso CT-INT-137
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Liberar o horário após o cancelamento da consulta
   * @resultadoEsperado O dia volta a ter 16 horários, incluindo o das 09:00
   */
  test('consulta cancelada libera o horário', () => {
    const consulta = agendar(ctx.pacientes[0], carlos, '2026-10-20 09:00');
    ctx.consultasService.cancelar(recepcao, consulta.id, { motivo: 'Paciente pediu' });
    const horarios = ctx.agendaService.horariosLivres(carlos.id, '2026-10-20');
    expect(horarios).toHaveLength(16);
    expect(horarios).toContain('2026-10-20 09:00');
  });

  /**
   * @caso CT-INT-138
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Remover somente o slot ocupado quando a consulta é no fim do bloco
   * @resultadoEsperado O dia tem 15 horários e ainda oferece 11:00
   */
  test('consulta no último slot remove apenas aquele horário', () => {
    agendar(ctx.pacientes[0], carlos, '2026-10-20 11:30');
    const horarios = ctx.agendaService.horariosLivres(carlos.id, '2026-10-20');
    expect(horarios).toHaveLength(15);
    expect(horarios).toContain('2026-10-20 11:00');
    expect(horarios).not.toContain('2026-10-20 11:30');
  });

  /**
   * @caso CT-INT-139
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Ignorar a consulta indicada ao calcular horários para remarcação
   * @resultadoEsperado O próprio horário da consulta volta a aparecer como livre
   */
  test('ignorarConsultaId devolve o horário da própria consulta', () => {
    const consulta = agendar(ctx.pacientes[0], carlos, '2026-10-20 09:00');
    const horarios = ctx.agendaService.horariosLivres(carlos.id, '2026-10-20', { ignorarConsultaId: consulta.id });
    expect(horarios).toHaveLength(16);
    expect(horarios).toContain('2026-10-20 09:00');
  });

  /**
   * @caso CT-INT-140
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Não afetar a agenda de um médico por consulta de outro
   * @resultadoEsperado A terça de Carlos mantém 16 horários após consulta com Eduardo
   */
  test('consulta de outro médico não afeta a agenda', () => {
    agendar(ctx.pacientes[0], ctx.medicos[2], '2026-10-20 13:00');
    expect(ctx.agendaService.horariosLivres(carlos.id, '2026-10-20')).toHaveLength(16);
  });
});

describe('horariosLivres — bloqueios e validações', () => {
  /**
   * @caso CT-INT-141
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Devolver lista vazia em data coberta por bloqueio
   * @resultadoEsperado O dia bloqueado não oferece horários
   */
  test('dia em bloqueio devolve lista vazia', () => {
    ctx.agendaService.criarBloqueio(recepcao, carlos.id, { dataInicio: '2026-10-20', dataFim: '2026-10-20', motivo: 'Congresso' });
    expect(ctx.agendaService.horariosLivres(carlos.id, '2026-10-20')).toEqual([]);
  });

  /**
   * @caso CT-INT-142
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN15
   * @objetivo Manter os horários de um dia fora do período bloqueado
   * @resultadoEsperado A terça continua com 16 horários quando o bloqueio é na quinta
   */
  test('bloqueio em outro dia não afeta os horários', () => {
    ctx.agendaService.criarBloqueio(recepcao, carlos.id, { dataInicio: '2026-10-22', dataFim: '2026-10-23', motivo: 'Férias' });
    expect(ctx.agendaService.horariosLivres(carlos.id, '2026-10-20')).toHaveLength(16);
  });

  /**
   * @caso CT-INT-143
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Não oferecer horários de médico inativo
   * @resultadoEsperado horariosLivres devolve lista vazia
   */
  test('médico inativo não tem horários livres', () => {
    ctx.cadastroService.definirUsuarioAtivo(carlos.usuarioId, false);
    expect(ctx.agendaService.horariosLivres(carlos.id, '2026-10-20')).toEqual([]);
  });

  /**
   * @caso CT-INT-144
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04, RNF03
   * @objetivo Recusar data em formato inválido
   * @resultadoEsperado horariosLivres lança 400 VALIDACAO
   */
  test('data inválida devolve 400', () => {
    expect(() => ctx.agendaService.horariosLivres(carlos.id, '20/10/2026')).toThrow(
      expect.objectContaining({ status: 400, codigo: 'VALIDACAO', message: 'Data inválida. Use o formato AAAA-MM-DD.' }),
    );
  });

  /**
   * @caso CT-INT-145
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar data inexistente no calendário
   * @resultadoEsperado horariosLivres lança 400 VALIDACAO para 2026-02-30
   */
  test('data inexistente devolve 400', () => {
    expect(() => ctx.agendaService.horariosLivres(carlos.id, '2026-02-30')).toThrow(
      expect.objectContaining({ status: 400, codigo: 'VALIDACAO' }),
    );
  });

  /**
   * @caso CT-INT-146
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar médico inexistente
   * @resultadoEsperado horariosLivres lança 404 NAO_ENCONTRADO
   */
  test('médico inexistente devolve 404', () => {
    expect(() => ctx.agendaService.horariosLivres(9999, '2026-10-20')).toThrow(
      expect.objectContaining({ status: 404, codigo: 'NAO_ENCONTRADO', message: 'Médico não encontrado.' }),
    );
  });

  /**
   * @caso CT-INT-147
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo disponibilidade
   * @requisito RNF04
   * @objetivo Manter o estado do banco após uma falha de consulta de horários
   * @resultadoEsperado Uma nova chamada válida continua devolvendo 16 horários
   */
  test('falha de validação não corrompe a agenda', () => {
    expect(() => ctx.agendaService.horariosLivres(carlos.id, 'data-ruim')).toThrow();
    expect(ctx.agendaService.horariosLivres(carlos.id, '2026-10-20')).toHaveLength(16);
  });
});
