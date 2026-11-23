# lote-104

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 15 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0199 | CT-UNI-086 | paciente dono confirma dentro das 48 horas | passou |  |
| glm-0200 | CT-UNI-087 | aceita confirmação com exatamente 48 horas | passou |  |
| glm-0201 | CT-UNI-088 | recusa confirmação antes das 48 horas | passou |  |
| glm-0202 | CT-UNI-089 | recusa confirmação de consulta já confirmada | passou |  |
| glm-0203 | CT-UNI-090 | recusa confirmação de consulta já iniciada | passou |  |
| glm-0204 | CT-UNI-091 | recusa confirmação por terceiros | passou |  |
| glm-0205 | CT-UNI-092 | recepção pode confirmar qualquer consulta | passou |  |
| glm-0206 | CT-UNI-093 | paciente cancela com mais de 24 horas | passou |  |
| glm-0207 | CT-UNI-094 | aceita cancelamento com exatamente 24 horas | passou |  |
| glm-0208 | CT-UNI-095 | recusa cancelamento do paciente com menos de 24 horas | passou |  |
| glm-0209 | CT-UNI-096 | recepção precisa informar motivo | passou |  |
| glm-0210 | CT-UNI-097 | paciente pode cancelar sem motivo | falhou | Error: expect(received).toBeNull() Received: {"mensagem": "O paciente só pode cancelar com no mínimo 24 horas de antecedência. Procure a recepção.", "tipo": "RE |
| glm-0211 | CT-UNI-098 | recusa cancelamento por terceiros | passou |  |
| glm-0212 | CT-UNI-099 | recusa cancelamento de estado final | passou |  |
| glm-0213 | CT-UNI-100 | recusa cancelamento de consulta já iniciada | passou |  |

## Arquivo: backend/__testes__/unitario/consultas-confirmacao-cancelamento.test.js

```js
// Testes unitários das verificações de confirmação e cancelamento (RN25, RN26).
const { verificarConfirmacao, verificarCancelamento } = require('../../src/domain/consultas');

const AGORA = new Date(2026, 9, 19, 8, 0); // 2026-10-19 08:00 (segunda-feira)
const pacienteDono = { perfil: 'PACIENTE', ehDono: true };
const outroPaciente = { perfil: 'PACIENTE', ehDono: false };
const recepcao = { perfil: 'RECEPCAO' };
const medicoDono = { perfil: 'MEDICO', ehDono: true };
const consulta = (dia, hora, status = 'AGENDADA') => ({ id: 1, status, inicio: new Date(2026, 9, dia, hora, 0) });

describe('verificarConfirmacao (RN25)', () => {
  /**
   * @caso CT-UNI-086
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Permitir que o próprio paciente confirme consulta AGENDADA dentro das 48 horas
   * @resultadoEsperado verificarConfirmacao retorna null para paciente dono com consulta em 4 horas
   */
  test('paciente dono confirma dentro das 48 horas', () => {
    expect(verificarConfirmacao(consulta(19, 12), pacienteDono, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-087
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Aceitar confirmação com exatamente 48 horas de antecedência (valor-limite)
   * @resultadoEsperado verificarConfirmacao retorna null para consulta em 2026-10-21 08:00
   */
  test('aceita confirmação com exatamente 48 horas', () => {
    expect(verificarConfirmacao(consulta(21, 8), pacienteDono, AGORA)).toBeNull();
  });

  /**
   * @caso CT-UNI-088
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Recusar confirmação feita com mais de 48 horas de antecedência
   * @resultadoEsperado verificarConfirmacao retorna erro de regra para consulta em 2026-10-21 08:01
   */
  test('recusa confirmação antes das 48 horas', () => {
    const consultaTardia = { id: 1, status: 'AGENDADA', inicio: new Date(2026, 9, 21, 8, 1) };
    const resultado = verificarConfirmacao(consultaTardia, pacienteDono, AGORA);
    expect(resultado.tipo).toBe('REGRA');
    expect(resultado.mensagem).toBe('A confirmação só é permitida nas 48 horas anteriores à consulta.');
  });

  /**
   * @caso CT-UNI-089
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Recusar confirmação de consulta que já não está AGENDADA
   * @resultadoEsperado verificarConfirmacao retorna erro de regra para consulta CONFIRMADA
   */
  test('recusa confirmação de consulta já confirmada', () => {
    const resultado = verificarConfirmacao(consulta(19, 12, 'CONFIRMADA'), pacienteDono, AGORA);
    expect(resultado.tipo).toBe('REGRA');
    expect(resultado.mensagem).toBe('Somente consultas agendadas podem ser confirmadas.');
  });

  /**
   * @caso CT-UNI-090
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Recusar confirmação de consulta que já começou
   * @resultadoEsperado verificarConfirmacao retorna erro de regra para consulta iniciada às 07:00
   */
  test('recusa confirmação de consulta já iniciada', () => {
    const resultado = verificarConfirmacao(consulta(19, 7), pacienteDono, AGORA);
    expect(resultado.tipo).toBe('REGRA');
    expect(resultado.mensagem).toBe('A consulta já começou.');
  });

  /**
   * @caso CT-UNI-091
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN25, RN30
   * @objetivo Impedir que outro paciente ou um médico confirmem a consulta
   * @resultadoEsperado verificarConfirmacao retorna erro de permissão para paciente não dono e para médico
   */
  test('recusa confirmação por terceiros', () => {
    const porPaciente = verificarConfirmacao(consulta(19, 12), outroPaciente, AGORA);
    expect(porPaciente.tipo).toBe('PERMISSAO');
    const porMedico = verificarConfirmacao(consulta(19, 12), medicoDono, AGORA);
    expect(porMedico.tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-092
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN25, RF09.1
   * @objetivo Permitir que a recepção confirme a consulta de qualquer paciente
   * @resultadoEsperado verificarConfirmacao retorna null para ator RECEPCAO
   */
  test('recepção pode confirmar qualquer consulta', () => {
    expect(verificarConfirmacao(consulta(19, 12), recepcao, AGORA)).toBeNull();
  });
});

describe('verificarCancelamento (RN26)', () => {
  /**
   * @caso CT-UNI-093
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Permitir cancelamento pelo paciente com mais de 24 horas de antecedência
   * @resultadoEsperado verificarCancelamento retorna null para paciente dono 25 horas antes, sem motivo
   */
  test('paciente cancela com mais de 24 horas', () => {
    expect(verificarCancelamento(consulta(20, 9), pacienteDono, AGORA, null)).toBeNull();
  });

  /**
   * @caso CT-UNI-094
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Aceitar cancelamento com exatamente 24 horas de antecedência (valor-limite)
   * @resultadoEsperado verificarCancelamento retorna null para consulta em 2026-10-20 08:00
   */
  test('aceita cancelamento com exatamente 24 horas', () => {
    expect(verificarCancelamento(consulta(20, 8), pacienteDono, AGORA, null)).toBeNull();
  });

  /**
   * @caso CT-UNI-095
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Recusar cancelamento pelo paciente com menos de 24 horas
   * @resultadoEsperado verificarCancelamento retorna erro de regra orientando procurar a recepção
   */
  test('recusa cancelamento do paciente com menos de 24 horas', () => {
    const resultado = verificarCancelamento(consulta(19, 20), pacienteDono, AGORA, null);
    expect(resultado.tipo).toBe('REGRA');
    expect(resultado.mensagem).toBe('O paciente só pode cancelar com no mínimo 24 horas de antecedência. Procure a recepção.');
  });

  /**
   * @caso CT-UNI-096
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Exigir motivo no cancelamento feito pela recepção
   * @resultadoEsperado verificarCancelamento retorna erro de regra sem motivo e null com motivo preenchido
   */
  test('recepção precisa informar motivo', () => {
    const semMotivo = verificarCancelamento(consulta(19, 12), recepcao, AGORA, '   ');
    expect(semMotivo.tipo).toBe('REGRA');
    expect(semMotivo.mensagem).toBe('Informe o motivo do cancelamento.');
    expect(verificarCancelamento(consulta(19, 12), recepcao, AGORA, 'Remanejamento da clínica')).toBeNull();
  });

  /**
   * @caso CT-UNI-097
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN26
   * @objetivo Não exigir motivo quando quem cancela é o próprio paciente
   * @resultadoEsperado verificarCancelamento retorna null sem motivo para paciente dono
   */
  test('paciente pode cancelar sem motivo', () => {
    expect(verificarCancelamento(consulta(19, 12), pacienteDono, AGORA, null)).toBeNull();
  });

  /**
   * @caso CT-UNI-098
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN26, RN30
   * @objetivo Impedir cancelamento por quem não é dono nem recepção
   * @resultadoEsperado verificarCancelamento retorna erro de permissão para paciente não dono e médico não dono
   */
  test('recusa cancelamento por terceiros', () => {
    expect(verificarCancelamento(consulta(19, 12), outroPaciente, AGORA, 'x').tipo).toBe('PERMISSAO');
    const outroMedico = { perfil: 'MEDICO', ehDono: false };
    expect(verificarCancelamento(consulta(19, 12), outroMedico, AGORA, 'x').tipo).toBe('PERMISSAO');
  });

  /**
   * @caso CT-UNI-099
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Recusar cancelamento de consulta já cancelada ou realizada
   * @resultadoEsperado verificarCancelamento retorna erro de regra para status CANCELADA e REALIZADA
   */
  test('recusa cancelamento de estado final', () => {
    const cancelada = verificarCancelamento(consulta(19, 12, 'CANCELADA'), recepcao, AGORA, 'Motivo');
    expect(cancelada.mensagem).toBe('Esta consulta não pode mais ser cancelada.');
    const realizada = verificarCancelamento(consulta(19, 12, 'REALIZADA'), recepcao, AGORA, 'Motivo');
    expect(realizada.tipo).toBe('REGRA');
  });

  /**
   * @caso CT-UNI-100
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Recusar cancelamento após o início da consulta, mesmo pela recepção
   * @resultadoEsperado verificarCancelamento retorna erro de regra para consulta iniciada às 07:00
   */
  test('recusa cancelamento de consulta já iniciada', () => {
    const resultado = verificarCancelamento(consulta(19, 7), recepcao, AGORA, 'Motivo');
    expect(resultado.mensagem).toBe('A consulta já começou e não pode ser cancelada.');
  });
});
```
