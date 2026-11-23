// Testes unitários da máquina de estados, antecedência, limites e suspensão (RN16, RN19, RN20, RN25–RN29).
const {
  podeTransitar, estaAtiva, validarAntecedencia, validarLimitesPaciente, calcularSuspensao,
} = require('../../src/domain/consultas');

const AGORA = new Date(2026, 9, 19, 8, 0); // 2026-10-19 08:00 (segunda-feira)

describe('máquina de estados (RN25–RN29)', () => {
  /**
   * @caso CT-UNI-057
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25, RN26, RN27, RN28, RN29
   * @objetivo Permitir todas as transições previstas a partir de AGENDADA
   * @resultadoEsperado podeTransitar aceita CONFIRMADA, CANCELADA, REALIZADA e FALTA a partir de AGENDADA
   */
  test('AGENDADA transiciona para CONFIRMADA, CANCELADA, REALIZADA e FALTA', () => {
    expect(podeTransitar('AGENDADA', 'CONFIRMADA')).toBe(true);
    expect(podeTransitar('AGENDADA', 'CANCELADA')).toBe(true);
    expect(podeTransitar('AGENDADA', 'REALIZADA')).toBe(true);
    expect(podeTransitar('AGENDADA', 'FALTA')).toBe(true);
  });

  /**
   * @caso CT-UNI-058
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Proibir a volta de CONFIRMADA para AGENDADA
   * @resultadoEsperado podeTransitar retorna false para CONFIRMADA → AGENDADA
   */
  test('CONFIRMADA não volta para AGENDADA', () => {
    expect(podeTransitar('CONFIRMADA', 'AGENDADA')).toBe(false);
  });

  /**
   * @caso CT-UNI-059
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25, RN26, RN27, RN28, RN29
   * @objetivo Proibir qualquer transição a partir dos estados finais
   * @resultadoEsperado podeTransitar retorna false para REALIZADA, FALTA e CANCELADA tentando voltar a AGENDADA
   */
  test('estados finais não transicionam', () => {
    expect(podeTransitar('REALIZADA', 'AGENDADA')).toBe(false);
    expect(podeTransitar('FALTA', 'AGENDADA')).toBe(false);
    expect(podeTransitar('CANCELADA', 'AGENDADA')).toBe(false);
  });

  /**
   * @caso CT-UNI-060
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25, RN19
   * @objetivo Considerar apenas AGENDADA e CONFIRMADA como consultas ativas
   * @resultadoEsperado estaAtiva retorna true para AGENDADA e CONFIRMADA, false para os demais status
   */
  test('apenas AGENDADA e CONFIRMADA são ativas', () => {
    expect(estaAtiva('AGENDADA')).toBe(true);
    expect(estaAtiva('CONFIRMADA')).toBe(true);
    expect(estaAtiva('REALIZADA')).toBe(false);
    expect(estaAtiva('FALTA')).toBe(false);
    expect(estaAtiva('CANCELADA')).toBe(false);
  });
});

describe('validarAntecedencia (RN16)', () => {
  /**
   * @caso CT-UNI-061
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Aceitar agendamento com exatamente 2 horas de antecedência (valor-limite)
   * @resultadoEsperado validarAntecedencia retorna null para início às 10:00 com agora às 08:00
   */
  test('aceita exatamente 2 horas de antecedência', () => {
    expect(validarAntecedencia(new Date(2026, 9, 19, 10, 0), AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-062
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Rejeitar agendamento com 1 minuto a menos que a antecedência mínima
   * @resultadoEsperado validarAntecedencia retorna mensagem de antecedência mínima para início às 09:59
   */
  test('rejeita antecedência de 1h59', () => {
    const mensagem = validarAntecedencia(new Date(2026, 9, 19, 9, 59), AGORA);
    expect(mensagem).toBe('A consulta deve ser agendada com no mínimo 2 horas de antecedência.');
  });

  /**
   * @caso CT-UNI-063
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Rejeitar agendamento no passado
   * @resultadoEsperado validarAntecedencia retorna mensagem de antecedência mínima para início às 07:00 do mesmo dia
   */
  test('rejeita horário no passado', () => {
    const mensagem = validarAntecedencia(new Date(2026, 9, 19, 7, 0), AGORA);
    expect(mensagem).toBe('A consulta deve ser agendada com no mínimo 2 horas de antecedência.');
  });

  /**
   * @caso CT-UNI-064
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Aceitar agendamento com exatamente 60 dias de antecedência (valor-limite)
   * @resultadoEsperado validarAntecedencia retorna null para 2026-12-18 08:00
   */
  test('aceita exatamente 60 dias de antecedência', () => {
    expect(validarAntecedencia(new Date(2026, 11, 18, 8, 0), AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-065
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Rejeitar agendamento além de 60 dias
   * @resultadoEsperado validarAntecedencia retorna mensagem de antecedência máxima para 2026-12-21 08:00
   */
  test('rejeita mais de 60 dias de antecedência', () => {
    const mensagem = validarAntecedencia(new Date(2026, 11, 21, 8, 0), AGORA);
    expect(mensagem).toBe('A consulta deve ser agendada com no máximo 60 dias de antecedência.');
  });
});

describe('validarLimitesPaciente (RN19)', () => {
  /**
   * @caso CT-UNI-066
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Aceitar nova consulta quando o paciente não tem nenhuma ativa
   * @resultadoEsperado validarLimitesPaciente retorna null para lista vazia
   */
  test('aceita agendamento sem consultas ativas', () => {
    expect(validarLimitesPaciente([], 1)).toBeNull();
  });

  /**
   * @caso CT-UNI-067
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Aceitar a terceira consulta ativa, no limite permitido (valor-limite)
   * @resultadoEsperado validarLimitesPaciente retorna null com 2 consultas ativas de especialidades distintas
   */
  test('aceita a terceira consulta ativa', () => {
    const ativas = [{ especialidadeId: 1 }, { especialidadeId: 2 }];
    expect(validarLimitesPaciente(ativas, 3)).toBeNull();
  });

  /**
   * @caso CT-UNI-068
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Rejeitar a quarta consulta ativa futura do paciente
   * @resultadoEsperado validarLimitesPaciente retorna mensagem de limite com 3 consultas ativas
   */
  test('rejeita a quarta consulta ativa', () => {
    const ativas = [{ especialidadeId: 1 }, { especialidadeId: 2 }, { especialidadeId: 3 }];
    const mensagem = validarLimitesPaciente(ativas, 4);
    expect(mensagem).toBe('O paciente já possui 3 consultas agendadas, que é o limite.');
  });

  /**
   * @caso CT-UNI-069
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Rejeitar segunda consulta ativa na mesma especialidade
   * @resultadoEsperado validarLimitesPaciente retorna mensagem de especialidade quando já existe ativa nela
   */
  test('rejeita segunda consulta na mesma especialidade', () => {
    const ativas = [{ especialidadeId: 2 }];
    expect(validarLimitesPaciente(ativas, 2)).toBe('O paciente já possui uma consulta agendada nesta especialidade.');
  });
});

describe('calcularSuspensao (RN20)', () => {
  const falta = (dia, mes) => new Date(2026, mes - 1, dia, 9, 0);

  /**
   * @caso CT-UNI-070
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Suspender paciente com 3 faltas nos últimos 90 dias até 30 dias após a última
   * @resultadoEsperado calcularSuspensao retorna 2026-11-14 (última falta 2026-10-15 + 30 dias)
   */
  test('suspende com 3 faltas na janela de 90 dias', () => {
    const fim = calcularSuspensao([falta('05', 10), falta('10', 10), falta('15', 10)], AGORA);
    expect(fim).toEqual(new Date(2026, 10, 14, 9, 0));
  });

  /**
   * @caso CT-UNI-071
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Não suspender paciente com apenas 2 faltas na janela (valor-limite)
   * @resultadoEsperado calcularSuspensao retorna null com 2 faltas
   */
  test('não suspende com 2 faltas', () => {
    expect(calcularSuspensao([falta('05', 10), falta('10', 10)], AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-072
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Desconsiderar falta ocorrida há mais de 90 dias (fora da janela)
   * @resultadoEsperado calcularSuspensao retorna null quando só 2 das 3 faltas estão na janela
   */
  test('ignora falta fora da janela de 90 dias', () => {
    const faltas = [new Date(2026, 6, 1, 9, 0), falta('10', 10), falta('15', 10)];
    expect(calcularSuspensao(faltas, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-073
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Encerrar a suspensão quando os 30 dias após a última falta já passaram
   * @resultadoEsperado calcularSuspensao retorna null quando a última falta (08-01) venceu a suspensão
   */
  test('não suspende quando a suspensão já venceu', () => {
    const faltas = [falta('25', 7), falta('30', 7), falta('01', 8)];
    expect(calcularSuspensao(faltas, AGORA)).toBeNull();
  });
});
