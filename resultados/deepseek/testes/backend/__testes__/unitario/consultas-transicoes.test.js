// Máquina de estados da consulta (RF09, RN25–RN29).
const {
  STATUS,
  STATUS_ATIVOS,
  TRANSICOES,
  REGRAS,
  podeTransitar,
  estaAtiva,
} = require('../../src/domain/consultas');

describe('podeTransitar', () => {
  /**
   * @caso CT-UNI-124
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Permitir a confirmação de uma consulta agendada
   * @resultadoEsperado podeTransitar(AGENDADA, CONFIRMADA) retorna true
   */
  test('permite AGENDADA → CONFIRMADA', () => {
    expect(podeTransitar(STATUS.AGENDADA, STATUS.CONFIRMADA)).toBe(true);
  });

  /**
   * @caso CT-UNI-125
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.4, RN28
   * @objetivo Permitir registrar atendimento direto de uma consulta agendada
   * @resultadoEsperado podeTransitar(AGENDADA, REALIZADA) retorna true
   */
  test('permite AGENDADA → REALIZADA', () => {
    expect(podeTransitar(STATUS.AGENDADA, STATUS.REALIZADA)).toBe(true);
  });

  /**
   * @caso CT-UNI-126
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.5, RN29
   * @objetivo Permitir registrar falta direto de uma consulta agendada
   * @resultadoEsperado podeTransitar(AGENDADA, FALTA) retorna true
   */
  test('permite AGENDADA → FALTA', () => {
    expect(podeTransitar(STATUS.AGENDADA, STATUS.FALTA)).toBe(true);
  });

  /**
   * @caso CT-UNI-127
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Permitir cancelar uma consulta agendada
   * @resultadoEsperado podeTransitar(AGENDADA, CANCELADA) retorna true
   */
  test('permite AGENDADA → CANCELADA', () => {
    expect(podeTransitar(STATUS.AGENDADA, STATUS.CANCELADA)).toBe(true);
  });

  /**
   * @caso CT-UNI-128
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09, RN25
   * @objetivo Recusar transição de AGENDADA para o mesmo status
   * @resultadoEsperado podeTransitar(AGENDADA, AGENDADA) retorna false
   */
  test('recusa AGENDADA → AGENDADA', () => {
    expect(podeTransitar(STATUS.AGENDADA, STATUS.AGENDADA)).toBe(false);
  });

  /**
   * @caso CT-UNI-129
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Permitir cancelar uma consulta confirmada
   * @resultadoEsperado podeTransitar(CONFIRMADA, CANCELADA) retorna true
   */
  test('permite CONFIRMADA → CANCELADA', () => {
    expect(podeTransitar(STATUS.CONFIRMADA, STATUS.CANCELADA)).toBe(true);
  });

  /**
   * @caso CT-UNI-130
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.4, RN28
   * @objetivo Permitir registrar atendimento de uma consulta confirmada
   * @resultadoEsperado podeTransitar(CONFIRMADA, REALIZADA) retorna true
   */
  test('permite CONFIRMADA → REALIZADA', () => {
    expect(podeTransitar(STATUS.CONFIRMADA, STATUS.REALIZADA)).toBe(true);
  });

  /**
   * @caso CT-UNI-131
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.5, RN29
   * @objetivo Permitir registrar falta de uma consulta confirmada
   * @resultadoEsperado podeTransitar(CONFIRMADA, FALTA) retorna true
   */
  test('permite CONFIRMADA → FALTA', () => {
    expect(podeTransitar(STATUS.CONFIRMADA, STATUS.FALTA)).toBe(true);
  });

  /**
   * @caso CT-UNI-132
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09, RN25
   * @objetivo Recusar reenvio de confirmação de uma consulta já confirmada
   * @resultadoEsperado podeTransitar(CONFIRMADA, CONFIRMADA) retorna false
   */
  test('recusa CONFIRMADA → CONFIRMADA', () => {
    expect(podeTransitar(STATUS.CONFIRMADA, STATUS.CONFIRMADA)).toBe(false);
  });

  /**
   * @caso CT-UNI-133
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25, RN26, RN28, RN29
   * @objetivo Bloquear qualquer transição a partir de REALIZADA
   * @resultadoEsperado podeTransitar(REALIZADA, X) retorna false para todos os status
   */
  test('REALIZADA é estado final', () => {
    Object.values(STATUS).forEach((destino) => {
      expect(podeTransitar(STATUS.REALIZADA, destino)).toBe(false);
    });
  });

  /**
   * @caso CT-UNI-134
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25, RN26, RN28, RN29
   * @objetivo Bloquear qualquer transição a partir de FALTA
   * @resultadoEsperado podeTransitar(FALTA, X) retorna false para todos os status
   */
  test('FALTA é estado final', () => {
    Object.values(STATUS).forEach((destino) => {
      expect(podeTransitar(STATUS.FALTA, destino)).toBe(false);
    });
  });

  /**
   * @caso CT-UNI-135
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25, RN26
   * @objetivo Bloquear qualquer transição a partir de CANCELADA
   * @resultadoEsperado podeTransitar(CANCELADA, X) retorna false para todos os status
   */
  test('CANCELADA é estado final', () => {
    Object.values(STATUS).forEach((destino) => {
      expect(podeTransitar(STATUS.CANCELADA, destino)).toBe(false);
    });
  });

  /**
   * @caso CT-UNI-136
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF09, RNF04
   * @objetivo Tratar status desconhecido como estado sem transições
   * @resultadoEsperado podeTransitar com status inexistente retorna false
   */
  test('status desconhecido não transita', () => {
    expect(podeTransitar('INEXISTENTE', STATUS.CONFIRMADA)).toBe(false);
  });

  /**
   * @caso CT-UNI-137
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF07
   * @objetivo Manter a tabela de transições imutável e completa
   * @resultadoEsperado TRANSICOES tem os 5 status, cada um congelado, e REGRAS expõe os limites
   */
  test('tabela de transições é imutável e cobre todos os status', () => {
    expect(Object.isFrozen(TRANSICOES)).toBe(true);
    expect(Object.keys(TRANSICOES).sort()).toEqual(Object.values(STATUS).sort());
    expect(REGRAS.ANTECEDENCIA_MINIMA_MIN).toBe(120);
    expect(REGRAS.MAX_CONSULTAS_ATIVAS).toBe(3);
    expect(REGRAS.MAX_REMARCACOES).toBe(2);
  });
});

describe('estaAtiva', () => {
  /**
   * @caso CT-UNI-138
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN13, RN15, RN19
   * @objetivo Considerar AGENDADA como consulta ativa
   * @resultadoEsperado estaAtiva(AGENDADA) retorna true e STATUS_ATIVOS a contém
   */
  test('AGENDADA é ativa', () => {
    expect(estaAtiva(STATUS.AGENDADA)).toBe(true);
    expect(STATUS_ATIVOS).toContain(STATUS.AGENDADA);
  });

  /**
   * @caso CT-UNI-139
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN13, RN15, RN19
   * @objetivo Considerar CONFIRMADA como consulta ativa
   * @resultadoEsperado estaAtiva(CONFIRMADA) retorna true
   */
  test('CONFIRMADA é ativa', () => {
    expect(estaAtiva(STATUS.CONFIRMADA)).toBe(true);
  });

  /**
   * @caso CT-UNI-140
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN13, RN15, RN19
   * @objetivo Não considerar consultas encerradas como ativas
   * @resultadoEsperado estaAtiva retorna false para REALIZADA, FALTA e CANCELADA
   */
  test('estados finais não são ativos', () => {
    expect(estaAtiva(STATUS.REALIZADA)).toBe(false);
    expect(estaAtiva(STATUS.FALTA)).toBe(false);
    expect(estaAtiva(STATUS.CANCELADA)).toBe(false);
  });

  /**
   * @caso CT-UNI-141
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN13, RNF04
   * @objetivo Tratar status desconhecido como inativo
   * @resultadoEsperado estaAtiva('QUALQUER') retorna false
   */
  test('status desconhecido não é ativo', () => {
    expect(estaAtiva('QUALQUER')).toBe(false);
  });
});
