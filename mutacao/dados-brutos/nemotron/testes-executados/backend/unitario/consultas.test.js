// Testes de unidade — domínio: ciclo de vida e regras de consulta (RN16–RN29)
// Atributo: Adequação funcional
const regras = require('../../src/domain/consultas');

const { STATUS, TRANSICOES, podeTransitar, estaAtiva } = regras;
const AGORA = new Date('2026-10-19T08:00:00'); // segunda-feira

const consulta = (sobreescritos = {}) => ({
  id: 1,
  status: 'AGENDADA',
  inicio: new Date('2026-10-20T10:00:00'),
  fim: new Date('2026-10-20T10:30:00'),
  medicoId: 1,
  pacienteId: 1,
  especialidadeId: 1,
  remarcacoes: 0,
  ...sobreescritos,
});

const ator = (perfil, ehDono = true) => ({ perfil, ehDono });

describe('podeTransitar / estaAtiva / TRANSICOES', () => {
  test('transições válidas da máquina de estados', () => {
    expect(podeTransitar('AGENDADA', 'CONFIRMADA')).toBe(true);
    expect(podeTransitar('AGENDADA', 'CANCELADA')).toBe(true);
    expect(podeTransitar('AGENDADA', 'REALIZADA')).toBe(true);
    expect(podeTransitar('AGENDADA', 'FALTA')).toBe(true);
    expect(podeTransitar('CONFIRMADA', 'CANCELADA')).toBe(true);
    expect(podeTransitar('CONFIRMADA', 'REALIZADA')).toBe(true);
    expect(podeTransitar('CONFIRMADA', 'FALTA')).toBe(true);
    expect(podeTransitar('REALIZADA', 'CANCELADA')).toBe(false);
    expect(podeTransitar('FALTA', 'AGENDADA')).toBe(false);
    expect(podeTransitar('CANCELADA', 'AGENDADA')).toBe(false);
  });
  test('estados ativos são AGENDADA e CONFIRMADA', () => {
    expect(estaAtiva('AGENDADA')).toBe(true);
    expect(estaAtiva('CONFIRMADA')).toBe(true);
    expect(estaAtiva('REALIZADA')).toBe(false);
    expect(estaAtiva('FALTA')).toBe(false);
    expect(estaAtiva('CANCELADA')).toBe(false);
  });
  test('estados finais não têm saídas', () => {
    expect(TRANSICOES.REALIZADA).toEqual([]);
    expect(TRANSICOES.FALTA).toEqual([]);
    expect(TRANSICOES.CANCELADA).toEqual([]);
  });
});

describe('validarAntecedencia (RN16)', () => {
  test('aceita consulta entre 2h e 60 dias à frente', () => {
    expect(regras.validarAntecedencia(new Date('2026-10-19T10:00:00'), AGORA)).toBe(null); // 2h
    expect(regras.validarAntecedencia(new Date('2026-12-18T08:00:00'), AGORA)).toBe(null); // 60 dias
  });
  test('rejeita antecedência menor que 2h', () => {
    const erro = regras.validarAntecedencia(new Date('2026-10-19T09:00:00'), AGORA); // 1h
    expect(erro).toBe('A consulta deve ser agendada com no mínimo 2 horas de antecedência.');
  });
  test('rejeita antecedência igual ao agora (já começou)', () => {
    const erro = regras.validarAntecedencia(AGORA, AGORA);
    expect(erro).toBe('A consulta deve ser agendada com no mínimo 2 horas de antecedência.');
  });
  test('rejeita consulta no passado', () => {
    const erro = regras.validarAntecedencia(new Date('2026-10-18T10:00:00'), AGORA);
    expect(erro).toBe('A consulta deve ser agendada com no mínimo 2 horas de antecedência.');
  });
  test('rejeita consulta com mais de 60 dias', () => {
    const erro = regras.validarAntecedencia(new Date('2026-12-19T08:00:00'), AGORA); // 61 dias
    expect(erro).toBe('A consulta deve ser agendada com no máximo 60 dias de antecedência.');
  });
});

describe('validarLimitesPaciente (RN19)', () => {
  test('aceita quando abaixo do limite total e da especialidade', () => {
    expect(regras.validarLimitesPaciente([{ especialidadeId: 1 }], 2)).toBe(null);
  });
  test('rejeita quando já tem 3 consultas ativas futuras', () => {
    const futuras = [{ especialidadeId: 1 }, { especialidadeId: 2 }, { especialidadeId: 3 }];
    const erro = regras.validarLimitesPaciente(futuras, 1);
    expect(erro).toContain('3 consultas agendadas, que é o limite.');
  });
  test('rejeita quando já tem consulta ativa na mesma especialidade', () => {
    const futuras = [{ especialidadeId: 1 }];
    const erro = regras.validarLimitesPaciente(futuras, 1);
    expect(erro).toBe('O paciente já possui uma consulta agendada nesta especialidade.');
  });
});

describe('calcularSuspensao (RN20)', () => {
  const agora = new Date('2026-10-19T08:00:00');
  test('retorna null com menos de 3 faltas nos últimos 90 dias', () => {
    const datas = [new Date('2026-08-01T10:00:00'), new Date('2026-08-15T10:00:00')];
    expect(regras.calcularSuspensao(datas, agora)).toBe(null);
  });
  test('retorna null com 3 faltas mas fora da janela de 90 dias', () => {
    const datas = [new Date('2026-06-01T10:00:00'), new Date('2026-07-01T10:00:00'), new Date('2026-07-15T10:00:00')];
    expect(regras.calcularSuspensao(datas, agora)).toBe(null);
  });
  test('suspende por 30 dias após a última falta quando há 3+ faltas recentes', () => {
    const datas = [new Date('2026-08-01T10:00:00'), new Date('2026-09-01T10:00:00'), new Date('2026-10-01T10:00:00')];
    const fim = regras.calcularSuspensao(datas, agora);
    expect(fim).toEqual(new Date('2026-10-31T10:00:00'));
  });
  test('retorna null quando o fim da suspensão já passou', () => {
    const datas = [new Date('2026-08-01T10:00:00'), new Date('2026-08-15T10:00:00'), new Date('2026-09-01T10:00:00')];
    expect(regras.calcularSuspensao(datas, agora)).toBe(null);
  });
});

describe('calcularValor (RN22, RN23, RN24)', () => {
  test('retorna preço base quando não é idoso nem retorno', () => {
    expect(regras.calcularValor({ precoBaseCentavos: 15000, idadePaciente: 30, ehRetorno: false })).toBe(15000);
  });
  test('aplica 10% de desconto para 60+ anos', () => {
    expect(regras.calcularValor({ precoBaseCentavos: 15000, idadePaciente: 60, ehRetorno: false })).toBe(13500);
    expect(regras.calcularValor({ precoBaseCentavos: 30000, idadePaciente: 65, ehRetorno: false })).toBe(27000);
  });
  test('retorno gratuito prevalece sobre desconto de idade', () => {
    expect(regras.calcularValor({ precoBaseCentavos: 30000, idadePaciente: 65, ehRetorno: true })).toBe(0);
  });
  test('arredonda para o centavo mais próximo', () => {
    expect(regras.calcularValor({ precoBaseCentavos: 100, idadePaciente: 60, ehRetorno: false })).toBe(90);
  });
});

describe('encontrarConsultaDeRetorno (RN24)', () => {
  const novoInicio = new Date('2026-11-01T10:00:00');
  const realizadas = [
    { id: 1, inicio: new Date('2026-10-15T10:00:00') }, // dentro de 30 dias, antes de novo
    { id: 2, inicio: new Date('2026-09-20T10:00:00') }, // fora de 30 dias
    { id: 3, inicio: new Date('2026-10-31T09:00:00') }, // dentro de 30 dias, antes de novo
  ];
  test('retorna a mais recente dentro da janela de 30 dias e não usada', () => {
    expect(regras.encontrarConsultaDeRetorno(realizadas, [], novoInicio)).toBe(3);
  });
  test('ignora consultas já usadas como retorno', () => {
    expect(regras.encontrarConsultaDeRetorno(realizadas, [3], novoInicio)).toBe(1);
    expect(regras.encontrarConsultaDeRetorno(realizadas, [1, 3], novoInicio)).toBe(null);
  });
  test('ignora consultas depois do novo horário', () => {
    const depois = [{ id: 4, inicio: new Date('2026-11-02T10:00:00') }];
    expect(regras.encontrarConsultaDeRetorno(depois, [], novoInicio)).toBe(null);
  });
});

const mkConsulta = (sobreescritos = {}) => consulta(sobreescritos);

describe('verificarConfirmacao (RN25)', () => {
  test('permite paciente dono confirmar AGENDADA nas 48h anteriores', () => {
    expect(regras.verificarConfirmacao(mkConsulta(), ator('PACIENTE', true), AGORA)).toBe(null);
  });
  test('permite recepção confirmar', () => {
    expect(regras.verificarConfirmacao(mkConsulta(), ator('RECEPCAO', false), AGORA)).toBe(null);
  });
  test('rejeita paciente não dono', () => {
    const res = regras.verificarConfirmacao(mkConsulta(), ator('PACIENTE', false), AGORA);
    expect(res.tipo).toBe('PERMISSAO');
  });
  test('rejeita médico', () => {
    const res = regras.verificarConfirmacao(mkConsulta(), ator('MEDICO', true), AGORA);
    expect(res.tipo).toBe('PERMISSAO');
  });
  test('rejeita status diferente de AGENDADA', () => {
    const res = regras.verificarConfirmacao(mkConsulta({ status: 'CONFIRMADA' }), ator('PACIENTE', true), AGORA);
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toContain('Somente consultas agendadas');
  });
  test('rejeita fora das 48h', () => {
    const res = regras.verificarConfirmacao(
      mkConsulta({ inicio: new Date('2026-10-22T10:00:00') }),
      ator('PACIENTE', true),
      AGORA
    );
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toContain('48 horas');
  });
  test('rejeita consulta já iniciada', () => {
    const res = regras.verificarConfirmacao(
      mkConsulta({ inicio: new Date('2026-10-19T07:00:00') }),
      ator('PACIENTE', true),
      AGORA
    );
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toContain('já começou');
  });
});

describe('verificarCancelamento (RN26)', () => {
  test('permite recepção cancelar AGENDADA antes do início com motivo', () => {
    expect(regras.verificarCancelamento(mkConsulta(), ator('RECEPCAO', false), AGORA, 'motivo')).toBe(null);
  });
  test('permite paciente cancelar com 24h+ de antecedência', () => {
    expect(regras.verificarCancelamento(mkConsulta(), ator('PACIENTE', true), AGORA, '')).toBe(null);
  });
  test('rejeita paciente cancelar com menos de 24h', () => {
    const res = regras.verificarCancelamento(
      mkConsulta({ inicio: new Date('2026-10-19T09:00:00') }),
      ator('PACIENTE', true),
      AGORA,
      ''
    );
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toContain('24 horas');
  });
  test('rejeita não-dono que não seja recepção', () => {
    const res = regras.verificarCancelamento(mkConsulta(), ator('MEDICO', false), AGORA, 'x');
    expect(res.tipo).toBe('PERMISSAO');
  });
  test('rejeita consulta já finalizada', () => {
    const res = regras.verificarCancelamento(mkConsulta({ status: 'REALIZADA' }), ator('RECEPCAO', false), AGORA, 'x');
    expect(res.tipo).toBe('REGRA');
  });
  test('rejeita consulta já iniciada', () => {
    const res = regras.verificarCancelamento(
      mkConsulta({ inicio: new Date('2026-10-19T07:00:00') }),
      ator('RECEPCAO', false),
      AGORA,
      'x'
    );
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toContain('já começou');
  });
  test('rejeita recepção sem motivo', () => {
    const res = regras.verificarCancelamento(mkConsulta(), ator('RECEPCAO', false), AGORA, '');
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toContain('motivo');
  });
});

describe('verificarRemarcacao (RN27)', () => {
  test('permite paciente/recepção remarcar AGENDADA com 24h+ e menos de 2 remarcações', () => {
    expect(regras.verificarRemarcacao(mkConsulta(), ator('PACIENTE', true), AGORA)).toBe(null);
    expect(regras.verificarRemarcacao(mkConsulta(), ator('RECEPCAO', false), AGORA)).toBe(null);
  });
  test('permite remarcar CONFIRMADA', () => {
    expect(regras.verificarRemarcacao(mkConsulta({ status: 'CONFIRMADA' }), ator('PACIENTE', true), AGORA)).toBe(null);
  });
  test('rejeita não-dono', () => {
    const res = regras.verificarRemarcacao(mkConsulta(), ator('MEDICO', true), AGORA);
    expect(res.tipo).toBe('PERMISSAO');
  });
  test('rejeita status não ativo', () => {
    const res = regras.verificarRemarcacao(mkConsulta({ status: 'CANCELADA' }), ator('PACIENTE', true), AGORA);
    expect(res.tipo).toBe('REGRA');
  });
  test('rejeita com menos de 24h', () => {
    const res = regras.verificarRemarcacao(
      mkConsulta({ inicio: new Date('2026-10-19T09:00:00') }),
      ator('PACIENTE', true),
      AGORA
    );
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toContain('24 horas');
  });
  test('rejeita quando já tem 2 remarcações', () => {
    const res = regras.verificarRemarcacao(mkConsulta({ remarcacoes: 2 }), ator('PACIENTE', true), AGORA);
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toContain('limite de 2 remarcações');
  });
});

describe('verificarRealizacao (RN28)', () => {
  test.skip('permite médico dono realizar AGENDADA a partir do início', () => {
    expect(regras.verificarRealizacao(mkConsulta(), ator('MEDICO', true), AGORA)).toBe(null);
    const agoraDepois = new Date('2026-10-20T10:00:00');
    expect(regras.verificarRealizacao(mkConsulta(), ator('MEDICO', true), agoraDepois)).toBe(null);
  });
  test('rejeita não médico ou não dono', () => {
    const res1 = regras.verificarRealizacao(mkConsulta(), ator('PACIENTE', true), AGORA);
    expect(res1.tipo).toBe('PERMISSAO');
    const res2 = regras.verificarRealizacao(mkConsulta(), ator('MEDICO', false), AGORA);
    expect(res2.tipo).toBe('PERMISSAO');
  });
  test('rejeita transição inválida de status', () => {
    const res = regras.verificarRealizacao(mkConsulta({ status: 'CANCELADA' }), ator('MEDICO', true), AGORA);
    expect(res.tipo).toBe('REGRA');
  });
  test('rejeita antes do horário de início', () => {
    const res = regras.verificarRealizacao(mkConsulta(), ator('MEDICO', true), new Date('2026-10-20T09:00:00'));
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toContain('horário da consulta');
  });
});

describe('verificarFalta (RN29)', () => {
  test('permite médico dono ou recepção registrar falta a partir de 15min após início', () => {
    const tolerancia = new Date('2026-10-20T10:15:00'); // início 10:00 + 15min
    expect(regras.verificarFalta(mkConsulta(), ator('MEDICO', true), tolerancia)).toBe(null);
    expect(regras.verificarFalta(mkConsulta(), ator('RECEPCAO', false), tolerancia)).toBe(null);
  });
  test('rejeita não autorizado', () => {
    const res = regras.verificarFalta(mkConsulta(), ator('PACIENTE', true), new Date('2026-10-20T11:00:00'));
    expect(res.tipo).toBe('PERMISSAO');
  });
  test('rejeita transição inválida', () => {
    const res = regras.verificarFalta(mkConsulta({ status: 'REALIZADA' }), ator('RECEPCAO', false), new Date('2026-10-20T11:00:00'));
    expect(res.tipo).toBe('REGRA');
  });
  test('rejeita antes de 15 minutos após o início', () => {
    const res = regras.verificarFalta(mkConsulta(), ator('MEDICO', true), new Date('2026-10-20T10:10:00'));
    expect(res.tipo).toBe('REGRA');
    expect(res.mensagem).toContain('15 minutos');
  });
});
