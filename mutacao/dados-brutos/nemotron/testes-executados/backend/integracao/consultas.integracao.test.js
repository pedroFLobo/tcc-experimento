// Testes de integração — serviço de consultas (RF08, RF09, RN16–RN29)
// Atributos: Adequação funcional, Confiabilidade
const { abrirBanco, limparBanco } = require('../../src/db/connection');
const semear = require('../../src/db/seed').semear;
const clock = require('../../src/utils/clock');
const { criarServicos } = require('../../src/services');

const AGORA = new Date('2026-10-19T08:00:00'); // segunda-feira

let db, servicos, recepcaoAtor, medicoCarlos, pacienteAna, pacienteJoao;

beforeEach(() => {
  clock.definirAgora(AGORA);
  db = abrirBanco(':memory:');
  semear(db);
  servicos = criarServicos(db);
  recepcaoAtor = { perfil: 'RECEPCAO' };
  medicoCarlos = servicos.medicos.buscarPorCrm('123456/SP');
  pacienteAna = servicos.pacientes.buscarPorCpf('52998224725');
  pacienteJoao = servicos.pacientes.buscarPorCpf('11144477735');
});

afterEach(() => {
  limparBanco(db);
  db.close();
  clock.definirAgora(null);
});

function agendar(ator, overrides = {}) {
  return servicos.consultasService.agendar(ator, {
    pacienteId: pacienteAna.id,
    medicoId: medicoCarlos.id,
    inicio: '2026-10-20 10:00',
    ...overrides,
  });
}

describe('consultasService.agendar (RF08, RN16–RN21, RN22–RN24)', () => {
  test.skip('agenda consulta para o próprio paciente', () => {
    const c = agendar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id });
    expect(c.status).toBe('AGENDADA');
    expect(c.valorCentavos).toBe(15000); // preço base Clínica Geral
  });

  test.skip('recepção agenda para qualquer paciente (RF08.1)', () => {
    const c = servicos.consultasService.agendar(recepcaoAtor, {
      pacienteId: pacienteJoao.id,
      medicoId: medicoCarlos.id,
      inicio: '2026-10-20 11:00',
    });
    expect(c.pacienteId).toBe(pacienteJoao.id);
  });

  test.skip('calcula e grava o valor no agendamento (RF08.2, RN22)', () => {
    const c = agendar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id });
    expect(c.valorCentavos).toBe(15000);
  });

  test.skip('aplica desconto de 10% para paciente 60+ (RN23)', () => {
    // João nasceu em 1958 -> 68 anos em 2026
    const c = servicos.consultasService.agendar(recepcaoAtor, {
      pacienteId: pacienteJoao.id,
      medicoId: medicoCarlos.id,
      inicio: '2026-10-20 11:00',
    });
    expect(c.valorCentavos).toBe(13500); // 15000 * 0.9
  });

  test.skip('retorno gratuito quando paciente teve consulta realizada com mesmo médico em 30 dias (RN24)', () => {
    // cria uma consulta realizada de Ana com Carlos em 2026-09-20
    const realizada = servicos.consultasService.agendar(recepcaoAtor, {
      pacienteId: pacienteAna.id,
      medicoId: medicoCarlos.id,
      inicio: '2026-09-20 10:00',
    });
    servicos.consultasService.registrarRealizada(
      { perfil: 'MEDICO', medicoId: medicoCarlos.id },
      realizada.id
    );
    // nova consulta em 2026-10-15 (dentro de 30 dias da realizada)
    const c = servicos.consultasService.agendar(recepcaoAtor, {
      pacienteId: pacienteAna.id,
      medicoId: medicoCarlos.id,
      inicio: '2026-10-15 10:00',
    });
    expect(c.valorCentavos).toBe(0);
  });

  test.skip('retorno e desconto de idade não se somam: retorno prevalece (RN24)', () => {
    const realizada = servicos.consultasService.agendar(recepcaoAtor, {
      pacienteId: pacienteJoao.id, // idoso
      medicoId: medicoCarlos.id,
      inicio: '2026-09-20 10:00',
    });
    servicos.consultasService.registrarRealizada(
      { perfil: 'MEDICO', medicoId: medicoCarlos.id },
      realizada.id
    );
    const c = servicos.consultasService.agendar(recepcaoAtor, {
      pacienteId: pacienteJoao.id,
      medicoId: medicoCarlos.id,
      inicio: '2026-10-15 10:00',
    });
    expect(c.valorCentavos).toBe(0);
  });

  test.skip('rejeita antecedência menor que 2h (RN16)', () => {
    expect(() =>
      agendar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, { inicio: '2026-10-19 09:00' })
    ).toThrow(/no mínimo 2 horas/);
  });

  test.skip('rejeita antecedência maior que 60 dias (RN16)', () => {
    expect(() =>
      agendar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, { inicio: '2026-12-20 10:00' })
    ).toThrow(/no máximo 60 dias/);
  });

  test.skip('rejeita horário que não é um horário livre (RN17)', () => {
    expect(() =>
      agendar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, { inicio: '2026-10-20 12:15' })
    ).toThrow(/indisponível/);
  });

  test.skip('rejeita paciente com outra consulta ativa no mesmo horário (RN18)', () => {
    agendar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id });
    expect(() =>
      agendar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, { inicio: '2026-10-20 10:30' })
    ).toThrow(/outra consulta/);
  });

  test.skip('rejeita mais de 3 consultas ativas futuras (RN19)', () => {
    // 3 consultas ativas de Ana em diferentes especialidades
    const medicoCardio = servicos.medicos.buscarPorCrm('654321/RJ');
    const medicoDerma = servicos.medicos.buscarPorCrm('11223/MG');
    servicos.consultasService.agendar(recepcaoAtor, { pacienteId: pacienteAna.id, medicoId: medicoCarlos.id, inicio: '2026-10-20 08:00' });
    servicos.consultasService.agendar(recepcaoAtor, { pacienteId: pacienteAna.id, medicoId: medicoCardio.id, inicio: '2026-10-21 09:00' });
    servicos.consultasService.agendar(recepcaoAtor, { pacienteId: pacienteAna.id, medicoId: medicoDerma.id, inicio: '2026-10-22 13:00' });
    expect(() =>
      servicos.consultasService.agendar(recepcaoAtor, { pacienteId: pacienteAna.id, medicoId: medicoCarlos.id, inicio: '2026-10-23 10:00' })
    ).toThrow(/limite/);
  });

  test.skip('rejeita mais de 1 consulta ativa futura por especialidade (RN19)', () => {
    servicos.consultasService.agendar(recepcaoAtor, { pacienteId: pacienteAna.id, medicoId: medicoCarlos.id, inicio: '2026-10-20 08:00' });
    expect(() =>
      servicos.consultasService.agendar(recepcaoAtor, { pacienteId: pacienteAna.id, medicoId: medicoCarlos.id, inicio: '2026-10-21 09:00' })
    ).toThrow(/mesma especialidade/);
  });

  test.skip('rejeita paciente inativo (RN21)', () => {
    servicos.cadastroService.definirUsuarioAtivo(pacienteAna.usuarioId, false);
    expect(() => agendar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id })).toThrow(/inativo/);
  });

  test.skip('rejeita médico inativo (RN21)', () => {
    const medico = servicos.medicos.buscarPorCrm('123456/SP');
    servicos.cadastroService.definirUsuarioAtivo(medico.usuarioId, false);
    expect(() => agendar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id })).toThrow(/inativo/);
  });

  test.skip('paciente não pode agendar para outro paciente', () => {
    expect(() =>
      servicos.consultasService.agendar(
        { perfil: 'PACIENTE', pacienteId: pacienteAna.id },
        { pacienteId: pacienteJoao.id, medicoId: medicoCarlos.id, inicio: '2026-10-20 11:00' }
      )
    ).toThrow(/si mesmo/);
  });

  test.skip('médico não pode agendar consultas', () => {
    expect(() =>
      servicos.consultasService.agendar(
        { perfil: 'MEDICO', medicoId: medicoCarlos.id },
        { pacienteId: pacienteAna.id, medicoId: medicoCarlos.id, inicio: '2026-10-20 11:00' }
      )
    ).toThrow(/Médicos não agendam/);
  });

  test.skip('rejeita paciente suspenso por faltas (RN20)', () => {
    // cria 3 faltas recentes para Ana
    for (const dia of ['2026-09-01', '2026-09-15', '2026-10-01']) {
      const c = servicos.consultasService.agendar(recepcaoAtor, {
        pacienteId: pacienteAna.id,
        medicoId: medicoCarlos.id,
        inicio: `${dia} 10:00`,
      });
      servicos.consultasService.registrarFalta(recepcaoAtor, c.id);
    }
    // agora na suspensão (30 dias após última falta em 2026-10-01 -> até 2026-10-31)
    expect(() => agendar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id })).toThrow(/suspenso/);
  });
});

describe('consultasService.confirmar / cancelar / remarcar / realizar / falta (RF09, RN25–RN29)', () => {
  let consulta;

  beforeEach(() => {
    consulta = agendar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id });
  });

  test.skip('confirmar (RN25)', () => {
    const c = servicos.consultasService.confirmar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, consulta.id);
    expect(c.status).toBe('CONFIRMADA');
  });

  test.skip('paciente não pode confirmar fora das 48h (RN25)', () => {
    clock.definirAgora(new Date('2026-10-18T08:00:00')); // mais de 48h antes de 2026-10-20 10:00
    expect(() =>
      servicos.consultasService.confirmar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, consulta.id)
    ).toThrow(/48 horas/);
  });

  test.skip('cancelar pelo paciente com 24h+ (RN26)', () => {
    const c = servicos.consultasService.cancelar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, consulta.id);
    expect(c.status).toBe('CANCELADA');
  });

  test.skip('paciente não pode cancelar com menos de 24h (RN26)', () => {
    clock.definirAgora(new Date('2026-10-19T09:00:00')); // menos de 24h antes de 2026-10-20 10:00
    expect(() =>
      servicos.consultasService.cancelar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, consulta.id)
    ).toThrow(/24 horas/);
  });

  test.skip('recepção cancela a qualquer hora antes do início com motivo (RN26)', () => {
    clock.definirAgora(new Date('2026-10-19T09:00:00'));
    const c = servicos.consultasService.cancelar(recepcaoAtor, consulta.id, { motivo: 'Desistiu' });
    expect(c.status).toBe('CANCELADA');
    expect(c.motivoCancelamento).toBe('Desistiu');
  });

  test.skip('recepção precisa de motivo para cancelar (RN26)', () => {
    expect(() => servicos.consultasService.cancelar(recepcaoAtor, consulta.id, {})).toThrow(/motivo/);
  });

  test.skip('remarcar para outro horário (RN27)', () => {
    const c = servicos.consultasService.remarcar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, consulta.id, { inicio: '2026-10-21 10:00' });
    expect(c.inicio).toBe('2026-10-21 10:00');
    expect(c.status).toBe('AGENDADA');
    expect(c.remarcacoes).toBe(1);
  });

  test.skip('remarcação recalcula o valor (RN27)', () => {
    const c = servicos.consultasService.remarcar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, consulta.id, { inicio: '2026-10-21 10:00' });
    expect(c.valorCentavos).toBe(15000);
  });

  test.skip('limite de 2 remarcações (RN27)', () => {
    servicos.consultasService.remarcar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, consulta.id, { inicio: '2026-10-21 10:00' });
    servicos.consultasService.remarcar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, consulta.id, { inicio: '2026-10-22 10:00' });
    expect(() =>
      servicos.consultasService.remarcar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, consulta.id, { inicio: '2026-10-23 10:00' })
    ).toThrow(/limite de 2 remarcações/);
  });

  test.skip('registrar atendimento realizado pelo médico dono (RN28)', () => {
    servicos.consultasService.confirmar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, consulta.id);
    clock.definirAgora(new Date('2026-10-20T10:00:00'));
    const c = servicos.consultasService.registrarRealizada(
      { perfil: 'MEDICO', medicoId: medicoCarlos.id },
      consulta.id,
      { observacoes: 'Paciente está bem.' }
    );
    expect(c.status).toBe('REALIZADA');
    expect(c.observacoes).toBe('Paciente está bem.');
  });

  test.skip('só o médico da consulta pode realizar (RN28)', () => {
    clock.definirAgora(new Date('2026-10-20T10:00:00'));
    expect(() =>
      servicos.consultasService.registrarRealizada(
        { perfil: 'MEDICO', medicoId: 999 },
        consulta.id
      )
    ).toThrow(/não pode/);
  });

  test.skip('registrar falta a partir de 15 min após o início (RN29)', () => {
    clock.definirAgora(new Date('2026-10-20T10:15:00'));
    const c = servicos.consultasService.registrarFalta(recepcaoAtor, consulta.id);
    expect(c.status).toBe('FALTA');
  });

  test.skip('não registra falta antes de 15 min após o início (RN29)', () => {
    clock.definirAgora(new Date('2026-10-20T10:10:00'));
    expect(() => servicos.consultasService.registrarFalta(recepcaoAtor, consulta.id)).toThrow(/15 minutos/);
  });

  test.skip('transições de estado são finais (RN25–RN29)', () => {
    servicos.consultasService.cancelar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, consulta.id);
    expect(() =>
      servicos.consultasService.confirmar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id }, consulta.id)
    ).toThrow();
  });
});

describe('consultasService.obter / listar (RF10, RN30)', () => {
  beforeEach(() => {
    agendar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id });
    servicos.consultasService.agendar(recepcaoAtor, {
      pacienteId: pacienteJoao.id,
      medicoId: medicoCarlos.id,
      inicio: '2026-10-21 10:00',
    });
  });

  test.skip('paciente vê só as próprias consultas (RF10.1)', () => {
    const lista = servicos.consultasService.listar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id });
    expect(lista.length).toBe(1);
    expect(lista[0].pacienteId).toBe(pacienteAna.id);
  });

  test.skip('médico vê só as consultas da própria agenda (RF10.2)', () => {
    const lista = servicos.consultasService.listar({ perfil: 'MEDICO', medicoId: medicoCarlos.id });
    expect(lista.every((c) => c.medicoId === medicoCarlos.id)).toBe(true);
  });

  test.skip('recepção vê todas as consultas (RF10.3)', () => {
    const lista = servicos.consultasService.listar({ perfil: 'RECEPCAO' });
    expect(lista.length).toBe(2);
  });

  test.skip('obter consulta de outro paciente rejeita 403 (RN30)', () => {
    const c = servicos.consultasService.listar({ perfil: 'PACIENTE', pacienteId: pacienteAna.id })[0];
    expect(() =>
      servicos.consultasService.obter({ perfil: 'PACIENTE', pacienteId: pacienteJoao.id }, c.id)
    ).toThrow(/não tem acesso/);
  });
});
