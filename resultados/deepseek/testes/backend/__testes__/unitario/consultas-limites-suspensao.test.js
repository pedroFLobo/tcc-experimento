// Regras puras de antecedência (RN16) e limites do paciente (RN19).
const {
  validarAntecedencia,
  validarLimitesPaciente,
  calcularSuspensao,
  REGRAS,
} = require('../../src/domain/consultas');

const AGORA = new Date(2026, 9, 19, 8, 0); // segunda, 19/10/2026 08:00

describe('validarAntecedencia', () => {
  /**
   * @caso CT-UNI-142
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Aceitar agendamento com exatamente 2 horas de antecedência
   * @resultadoEsperado validarAntecedencia devolve null para 10:00
   */
  test('aceita exatamente 2 horas de antecedência', () => {
    expect(validarAntecedencia(new Date(2026, 9, 19, 10, 0), AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-143
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Recusar agendamento com 1 minuto a menos que o mínimo
   * @resultadoEsperado validarAntecedencia devolve a mensagem de 2 horas
   */
  test('recusa 1 minuto abaixo do mínimo', () => {
    expect(validarAntecedencia(new Date(2026, 9, 19, 9, 59), AGORA)).toBe('A consulta deve ser agendada com no mínimo 2 horas de antecedência.');
  });

  /**
   * @caso CT-UNI-144
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Recusar agendamento no passado
   * @resultadoEsperado validarAntecedencia devolve a mensagem de 2 horas para 08:00 de ontem
   */
  test('recusa horário no passado', () => {
    expect(validarAntecedencia(new Date(2026, 9, 18, 8, 0), AGORA)).toContain('no mínimo 2 horas');
  });

  /**
   * @caso CT-UNI-145
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Recusar agendamento no exato instante atual
   * @resultadoEsperado validarAntecedencia devolve a mensagem de 2 horas para 08:00 de hoje
   */
  test('recusa horário igual a agora', () => {
    expect(validarAntecedencia(new Date(2026, 9, 19, 8, 0), AGORA)).toContain('no mínimo 2 horas');
  });

  /**
   * @caso CT-UNI-146
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Aceitar agendamento exatamente no limite de 60 dias
   * @resultadoEsperado validarAntecedencia devolve null para 18/12/2026 08:00
   */
  test('aceita exatamente 60 dias', () => {
    expect(validarAntecedencia(new Date(2026, 11, 18, 8, 0), AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-147
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Recusar agendamento 1 minuto além do limite de 60 dias
   * @resultadoEsperado validarAntecedencia devolve a mensagem de 60 dias
   */
  test('recusa 1 minuto acima de 60 dias', () => {
    expect(validarAntecedencia(new Date(2026, 11, 18, 8, 1), AGORA)).toBe('A consulta deve ser agendada com no máximo 60 dias de antecedência.');
  });

  /**
   * @caso CT-UNI-148
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Aceitar a maior antecedência ainda permitida, 59 dias
   * @resultadoEsperado validarAntecedencia devolve null para 17/12/2026
   */
  test('aceita 59 dias de antecedência', () => {
    expect(validarAntecedencia(new Date(2026, 11, 17, 8, 0), AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-149
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RN16, RNF06
   * @objetivo Informar em português o limite máximo de antecedência
   * @resultadoEsperado A mensagem de erro cita "60 dias"
   */
  test('mensagem de erro cita o limite em português', () => {
    expect(validarAntecedencia(new Date(2027, 0, 20, 8, 0), AGORA)).toContain('60 dias');
  });
});

describe('validarLimitesPaciente', () => {
  const clinicaGeral = { especialidadeId: 1 };
  const cardiologia = { especialidadeId: 2 };

  /**
   * @caso CT-UNI-150
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Permitir o primeiro agendamento do paciente
   * @resultadoEsperado validarLimitesPaciente devolve null com lista vazia
   */
  test('aceita primeiro agendamento', () => {
    expect(validarLimitesPaciente([], 1)).toBeNull();
  });

  /**
   * @caso CT-UNI-151
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Permitir a terceira consulta ativa
   * @resultadoEsperado validarLimitesPaciente devolve null com 2 consultas de especialidades diferentes
   */
  test('aceita segunda e terceira consultas ativas', () => {
    expect(validarLimitesPaciente([clinicaGeral, cardiologia], 3)).toBeNull();
  });

  /**
   * @caso CT-UNI-152
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Recusar a quarta consulta ativa
   * @resultadoEsperado validarLimitesPaciente devolve a mensagem de limite de 3
   */
  test('recusa a quarta consulta ativa', () => {
    const ativas = [clinicaGeral, cardiologia, { especialidadeId: 3 }];
    expect(validarLimitesPaciente(ativas, 4)).toBe('O paciente já possui 3 consultas agendadas, que é o limite.');
  });

  /**
   * @caso CT-UNI-153
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Recusar segunda consulta ativa na mesma especialidade
   * @resultadoEsperado validarLimitesPaciente devolve a mensagem de uma por especialidade
   */
  test('recusa segunda consulta na mesma especialidade', () => {
    expect(validarLimitesPaciente([clinicaGeral], 1)).toBe('O paciente já possui uma consulta agendada nesta especialidade.');
  });

  /**
   * @caso CT-UNI-154
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Permitir consulta em outra especialidade quando há uma ativa
   * @resultadoEsperado validarLimitesPaciente devolve null para Cardiologia
   */
  test('permite outra especialidade', () => {
    expect(validarLimitesPaciente([clinicaGeral], 2)).toBeNull();
  });

  /**
   * @caso CT-UNI-155
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Comparar especialidades por identificador, não por posição
   * @resultadoEsperado A mesma especialidade 2 em qualquer posição é recusada
   */
  test('detecta a especialidade repetida em qualquer posição', () => {
    expect(validarLimitesPaciente([{ especialidadeId: 2 }, { especialidadeId: 1 }], 2)).toBe('O paciente já possui uma consulta agendada nesta especialidade.');
  });
});

describe('calcularSuspensao', () => {
  /**
   * @caso CT-UNI-156
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Não suspender paciente com duas faltas
   * @resultadoEsperado calcularSuspensao devolve null
   */
  test('não suspende com duas faltas', () => {
    const faltas = [new Date(2026, 8, 1, 9, 0), new Date(2026, 8, 10, 9, 0)];
    expect(calcularSuspensao(faltas, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-157
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Suspender por 30 dias após a última das três faltas
   * @resultadoEsperado calcularSuspensao devolve 09/11/2026 para a última falta em 10/10/2026
   */
  test('suspende 30 dias após a última falta', () => {
    const faltas = [
      new Date(2026, 8, 1, 9, 0),
      new Date(2026, 9, 1, 9, 0),
      new Date(2026, 9, 10, 9, 0),
    ];
    const fim = calcularSuspensao(faltas, AGORA);
    expect(fim.getFullYear()).toBe(2026);
    expect(fim.getMonth()).toBe(10);
    expect(fim.getDate()).toBe(9);
  });

  /**
   * @caso CT-UNI-158
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Ignorar faltas com mais de 90 dias
   * @resultadoEsperado calcularSuspensao devolve null quando as faltas estão fora da janela
   */
  test('ignora faltas fora da janela de 90 dias', () => {
    const faltas = [
      new Date(2026, 5, 1, 9, 0),
      new Date(2026, 5, 10, 9, 0),
      new Date(2026, 5, 20, 9, 0),
    ];
    expect(calcularSuspensao(faltas, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-159
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Encerrar a suspensão 30 dias após a última falta
   * @resultadoEsperado calcularSuspensao devolve null quando a última falta foi há 40 dias
   */
  test('não suspende quando a última falta foi há 40 dias', () => {
    const faltas = [
      new Date(2026, 7, 1, 9, 0),
      new Date(2026, 8, 1, 9, 0),
      new Date(2026, 8, 10, 9, 0), // 40 dias antes de 19/10/2026
    ];
    expect(calcularSuspensao(faltas, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-160
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Contar falta exatamente no limite de 90 dias
   * @resultadoEsperado calcularSuspensao considera a falta de 21/07/2026 e suspende
   */
  test('conta falta no limite exato de 90 dias', () => {
    const faltas = [
      new Date(2026, 6, 21, 9, 0),
      new Date(2026, 8, 1, 9, 0),
      new Date(2026, 8, 10, 9, 0),
    ];
    expect(calcularSuspensao(faltas, AGORA)).not.toBeNull();
  });

  /**
   * @caso CT-UNI-161
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Desconsiderar faltas com data futura no relógio
   * @resultadoEsperado calcularSuspensao devolve null quando apenas 2 faltas já ocorreram
   */
  test('ignora faltas futuras', () => {
    const faltas = [
      new Date(2026, 8, 1, 9, 0),
      new Date(2026, 8, 10, 9, 0),
      new Date(2026, 9, 30, 9, 0),
    ];
    expect(calcularSuspensao(faltas, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-162
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Usar a falta mais recente como início da suspensão
   * @resultadoEsperado calcularSuspensao devolve 15/11/2026 quando a última falta é 16/10/2026
   */
  test('usa a falta mais recente', () => {
    const faltas = [
      new Date(2026, 8, 1, 9, 0),
      new Date(2026, 9, 1, 9, 0),
      new Date(2026, 9, 10, 9, 0),
      new Date(2026, 9, 16, 9, 0),
    ];
    const fim = calcularSuspensao(faltas, AGORA);
    expect(fim.getDate()).toBe(15);
    expect(fim.getMonth()).toBe(10);
  });

  /**
   * @caso CT-UNI-163
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN20
   * @objetivo Não suspender quando nenhuma falta foi registrada
   * @resultadoEsperado calcularSuspensao devolve null para lista vazia
   */
  test('não suspende sem faltas', () => {
    expect(calcularSuspensao([], AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-164
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07, RN20
   * @objetivo Permitir fixar "agora" sem depender da data real
   * @resultadoEsperado A mesma lista de faltas produz sempre o mesmo resultado
   */
  test('resultado depende apenas das datas e do relógio informado', () => {
    const faltas = [new Date(2026, 8, 1, 9, 0), new Date(2026, 8, 10, 9, 0), new Date(2026, 8, 20, 9, 0)];
    const primeira = calcularSuspensao(faltas, AGORA);
    const segunda = calcularSuspensao(faltas, AGORA);
    expect(primeira.getTime()).toBe(segunda.getTime());
    expect(REGRAS.JANELA_FALTAS_DIAS).toBe(90);
    expect(REGRAS.SUSPENSAO_DIAS).toBe(30);
  });
});
