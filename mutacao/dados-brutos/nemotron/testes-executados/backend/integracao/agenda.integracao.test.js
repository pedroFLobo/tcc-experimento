// Testes de integração — serviço de agenda (RF05, RF06, RF07, RN10–RN15)
// Atributos: Adequação funcional, Confiabilidade
const { abrirBanco, limparBanco } = require('../../src/db/connection');
const semear = require('../../src/db/seed').semear;
const clock = require('../../src/utils/clock');
const { criarServicos } = require('../../src/services');

const AGORA = new Date('2026-10-19T08:00:00'); // segunda-feira

let db, servicos, recepcaoAtor, medicoCarlos;

beforeEach(() => {
  clock.definirAgora(AGORA);
  db = abrirBanco(':memory:');
  semear(db);
  servicos = criarServicos(db);
  recepcaoAtor = { perfil: 'RECEPCAO' };
  medicoCarlos = servicos.medicos.buscarPorCrm('123456/SP');
});

afterEach(() => {
  limparBanco(db);
  db.close();
  clock.definirAgora(null);
});

describe('agendaService.salvarGrade (RF05, RN10, RN11)', () => {
  test.skip('salva grade semanal para o médico', () => {
    const r = servicos.agendaService.salvarGrade(recepcaoAtor, medicoCarlos.id, [
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 1, horaInicio: '14:00', horaFim: '18:00' },
    ]);
    expect(r.ok).toBe(true);
  });

  test.skip('salvar substitui a grade anterior por inteiro (RF05.2)', () => {
    servicos.agendaService.salvarGrade(recepcaoAtor, medicoCarlos.id, [
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
    ]);
    servicos.agendaService.salvarGrade(recepcaoAtor, medicoCarlos.id, [
      { diaSemana: 2, horaInicio: '09:00', horaFim: '11:00' },
    ]);
    const slots = servicos.agendaService.horariosLivres(medicoCarlos.id, '2026-10-20'); // terça
    expect(slots.length).toBeGreaterThan(0);
    const segundas = servicos.agendaService.horariosLivres(medicoCarlos.id, '2026-10-19'); // segunda
    expect(segundas.length).toBe(0);
  });

  test.skip('rejeita bloco com dia inválido', () => {
    expect(() =>
      servicos.agendaService.salvarGrade(recepcaoAtor, medicoCarlos.id, [
        { diaSemana: 7, horaInicio: '08:00', horaFim: '12:00' },
      ])
    ).toThrow(/Dia da semana/);
  });

  test.skip('rejeita blocos sobrepostos no mesmo dia (RN11)', () => {
    expect(() =>
      servicos.agendaService.salvarGrade(recepcaoAtor, medicoCarlos.id, [
        { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
        { diaSemana: 1, horaInicio: '10:00', horaFim: '14:00' },
      ])
    ).toThrow(/sobrepost/);
  });

  test.skip('permite blocos que encostam (RN11)', () => {
    const r = servicos.agendaService.salvarGrade(recepcaoAtor, medicoCarlos.id, [
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 1, horaInicio: '12:00', horaFim: '14:00' },
    ]);
    expect(r.ok).toBe(true);
  });

  test.skip('rejeita horário fora do expediente 07-20', () => {
    expect(() =>
      servicos.agendaService.salvarGrade(recepcaoAtor, medicoCarlos.id, [
        { diaSemana: 1, horaInicio: '06:00', horaFim: '12:00' },
      ])
    ).toThrow(/entre 07:00 e 20:00/);
  });
});

describe('agendaService.criar/removerBloqueio (RF06, RN12, RN13)', () => {
  test.skip('cria bloqueio por período', () => {
    const r = servicos.agendaService.criarBloqueio(recepcaoAtor, medicoCarlos.id, {
      dataInicio: '2026-10-25',
      dataFim: '2026-10-27',
      motivo: 'Congresso',
    });
    expect(r.id).toBeDefined();
    expect(r.motivo).toBe('Congresso');
  });

  test.skip('rejeita data final anterior à inicial (RN12)', () => {
    expect(() =>
      servicos.agendaService.criarBloqueio(recepcaoAtor, medicoCarlos.id, {
        dataInicio: '2026-10-27',
        dataFim: '2026-10-25',
        motivo: 'X',
      })
    ).toThrow(/data final/);
  });

  test.skip('rejeita bloqueio no passado (RN12)', () => {
    expect(() =>
      servicos.agendaService.criarBloqueio(recepcaoAtor, medicoCarlos.id, {
        dataInicio: '2026-10-18',
        dataFim: '2026-10-19',
        motivo: 'X',
      })
    ).toThrow(/passado/);
  });

  test.skip('remove bloqueio existente', () => {
    const criado = servicos.agendaService.criarBloqueio(recepcaoAtor, medicoCarlos.id, {
      dataInicio: '2026-10-25',
      dataFim: '2026-10-27',
      motivo: 'Congresso',
    });
    const r = servicos.agendaService.removerBloqueio(recepcaoAtor, medicoCarlos.id, criado.id);
    expect(r.ok).toBe(true);
  });

  test.skip('rejeita remoção de bloqueio inexistente', () => {
    expect(() => servicos.agendaService.removerBloqueio(recepcaoAtor, medicoCarlos.id, 999)).toThrow(/não encontrado/);
  });

  test.skip('rejeita bloqueio em período com consulta ativa (RN13)', () => {
    // agendar uma consulta ativa do Carlos em 2026-10-20
    servicos.agendaService.salvarGrade(recepcaoAtor, medicoCarlos.id, [
      { diaSemana: 2, horaInicio: '08:00', horaFim: '12:00' },
    ]);
    servicos.consultasService.agendar(
      { perfil: 'RECEPCAO' },
      { pacienteId: 1, medicoId: medicoCarlos.id, inicio: '2026-10-20 08:00' }
    );
    expect(() =>
      servicos.agendaService.criarBloqueio(recepcaoAtor, medicoCarlos.id, {
        dataInicio: '2026-10-20',
        dataFim: '2026-10-20',
        motivo: 'Férias',
      })
    ).toThrow(/consulta ativa/);
  });
});

describe('agendaService.horariosLivres (RF07, RN14, RN15)', () => {
  beforeEach(() => {
    servicos.agendaService.salvarGrade(recepcaoAtor, medicoCarlos.id, [
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 1, horaInicio: '14:00', horaFim: '18:00' },
    ]);
  });

  test.skip('lista horários livres de uma segunda-feira', () => {
    const livres = servicos.agendaService.horariosLivres(medicoCarlos.id, '2026-10-19');
    expect(livres).toContain('08:00');
    expect(livres).toContain('08:30');
    expect(livres).toContain('11:30');
    expect(livres).not.toContain('12:00'); // fora do bloco
    expect(livres).not.toContain('13:00'); // fora do expediente do bloco da tarde começa 14
  });

  test.skip('exclui horários com consulta ativa (RN15)', () => {
    servicos.consultasService.agendar(
      { perfil: 'RECEPCAO' },
      { pacienteId: 1, medicoId: medicoCarlos.id, inicio: '2026-10-19 09:00' }
    );
    const livres = servicos.agendaService.horariosLivres(medicoCarlos.id, '2026-10-19');
    expect(livres).not.toContain('09:00');
    expect(livres).toContain('08:00');
    expect(livres).toContain('09:30');
  });

  test.skip('exclui datas dentro de bloqueio (RN15)', () => {
    servicos.agendaService.criarBloqueio(recepcaoAtor, medicoCarlos.id, {
      dataInicio: '2026-10-19',
      dataFim: '2026-10-19',
      motivo: 'Folga',
    });
    const livres = servicos.agendaService.horariosLivres(medicoCarlos.id, '2026-10-19');
    expect(livres.length).toBe(0);
  });

  test.skip('retorna vazio para médico sem grade no dia', () => {
    const livres = servicos.agendaService.horariosLivres(medicoCarlos.id, '2026-10-24'); // sábado
    expect(livres.length).toBe(0);
  });

  test.skip('retorna vazio para médico inexistente', () => {
    const livres = servicos.agendaService.horariosLivres(999, '2026-10-19');
    expect(livres.length).toBe(0);
  });
});
