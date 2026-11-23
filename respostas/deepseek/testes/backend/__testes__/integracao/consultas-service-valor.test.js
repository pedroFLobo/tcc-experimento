// Integração: cálculo de valor da consulta, retorno e desconto de idoso (RF08, RN22–RN24).
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

function agendar(paciente, medico, inicio) {
  return ctx.consultasService.agendar(recepcao, { pacienteId: paciente.id, medicoId: medico.id, inicio });
}

// Cria uma consulta e a marca como REALIZADA no mesmo dia, pelo fluxo normal do serviço.
function realizar(inicioTexto, paciente = ana, medico = carlos) {
  const inicio = new Date(`${inicioTexto.replace(' ', 'T')}:00`);
  clock.definirAgora(new Date(inicio.getTime() - 120 * 60000));
  const consulta = agendar(paciente, medico, inicioTexto);
  clock.definirAgora(inicio);
  ctx.consultasService.registrarRealizada({ perfil: 'MEDICO', medicoId: medico.id }, consulta.id);
  return consulta;
}

function inserirFalta(inicioTexto) {
  const [data, hora] = inicioTexto.split(' ');
  const [h, m] = hora.split(':').map(Number);
  const fim = `${data} ${String(h).padStart(2, '0')}:${String(m + 30).padStart(2, '0')}`;
  ctx.db
    .prepare(`INSERT INTO consultas (paciente_id, medico_id, inicio, fim, status, valor_centavos, criado_em, atualizado_em)
              VALUES (?, ?, ?, ?, 'FALTA', 15000, ?, ?)`)
    .run(ana.id, carlos.id, inicioTexto, fim, inicioTexto, inicioTexto);
}

function novoPaciente({ cpf, dataNascimento, email }) {
  return ctx.cadastroService.registrarPaciente({
    nome: 'Paciente Teste',
    email,
    senha: 'Senha123',
    cpf,
    dataNascimento,
  });
}

describe('retorno em 30 dias', () => {
  /**
   * @caso CT-INT-189
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Dar retorno gratuito dentro de 30 dias da consulta realizada
   * @resultadoEsperado A nova consulta tem valor 0
   */
  test('retorno dentro de 30 dias é gratuito', () => {
    realizar('2026-09-25 10:00');
    clock.definirAgora(new Date('2026-10-19T08:00:00'));
    const retorno = agendar(ana, carlos, '2026-10-20 09:00');
    expect(retorno.valorCentavos).toBe(0);
  });

  /**
   * @caso CT-INT-190
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN24
   * @objetivo Registrar qual consulta deu origem ao retorno
   * @resultadoEsperado retornoDe aponta para a consulta realizada
   */
  test('retornoDe identifica a consulta de origem', () => {
    const origem = realizar('2026-09-25 10:00');
    clock.definirAgora(new Date('2026-10-19T08:00:00'));
    expect(agendar(ana, carlos, '2026-10-20 09:00').retornoDe).toBe(origem.id);
  });

  /**
   * @caso CT-INT-191
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Não conceder retorno para consulta com outro médico
   * @resultadoEsperado A consulta com Beatriz é cobrada pelo valor cheio
   */
  test('retorno exige o mesmo médico', () => {
    realizar('2026-09-25 10:00');
    clock.definirAgora(new Date('2026-10-19T08:00:00'));
    const consulta = agendar(ana, beatriz, '2026-10-21 09:00');
    expect(consulta.valorCentavos).toBe(30000);
    expect(consulta.retornoDe).toBeNull();
  });

  /**
   * @caso CT-INT-192
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Negar retorno após a janela de 30 dias
   * @resultadoEsperado A consulta realizada em 2026-09-01 não gera retorno em 2026-10-20
   */
  test('consulta realizada há mais de 30 dias não gera retorno', () => {
    realizar('2026-09-01 10:00');
    clock.definirAgora(new Date('2026-10-19T08:00:00'));
    expect(agendar(ana, carlos, '2026-10-20 09:00').valorCentavos).toBe(15000);
  });

  /**
   * @caso CT-INT-193
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Aceitar retorno exatamente no limite de 30 dias
   * @resultadoEsperado A consulta de 2026-10-21 é gratuita por causa da realizada em 2026-09-21
   */
  test('limite exato de 30 dias ainda concede retorno', () => {
    realizar('2026-09-21 09:00');
    clock.definirAgora(new Date('2026-10-19T08:00:00'));
    expect(agendar(ana, carlos, '2026-10-21 09:00').valorCentavos).toBe(0);
  });

  /**
   * @caso CT-INT-194
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Não reutilizar a mesma consulta como origem de dois retornos
   * @resultadoEsperado O segundo retorno aponta para a consulta mais recente, não para a original
   */
  test('consulta de origem não é reutilizada', () => {
    const origem = realizar('2026-09-25 10:00');
    clock.definirAgora(new Date('2026-10-19T08:00:00'));
    const primeiro = agendar(ana, carlos, '2026-10-20 09:00');
    clock.definirAgora(new Date('2026-10-20T09:00:00'));
    ctx.consultasService.registrarRealizada({ perfil: 'MEDICO', medicoId: carlos.id }, primeiro.id);
    clock.definirAgora(new Date('2026-10-20T10:00:00'));
    const segundo = agendar(ana, carlos, '2026-10-22 09:00');
    expect(segundo.retornoDe).toBe(primeiro.id);
    expect(segundo.retornoDe).not.toBe(origem.id);
  });

  /**
   * @caso CT-INT-195
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Não conceder retorno com base em consulta cancelada
   * @resultadoEsperado A nova consulta é cobrada pelo valor cheio
   */
  test('consulta cancelada não gera retorno', () => {
    const cancelada = agendar(ana, carlos, '2026-10-20 08:00');
    ctx.consultasService.cancelar(recepcao, cancelada.id, { motivo: 'Paciente desmarcou' });
    expect(agendar(ana, carlos, '2026-10-20 09:00').valorCentavos).toBe(15000);
  });

  /**
   * @caso CT-INT-196
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Não conceder retorno com base em consulta de falta
   * @resultadoEsperado A nova consulta é cobrada pelo valor cheio
   */
  test('falta não gera retorno', () => {
    inserirFalta('2026-09-25 10:00');
    expect(agendar(ana, carlos, '2026-10-20 09:00').valorCentavos).toBe(15000);
  });

  /**
   * @caso CT-INT-197
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Escolher a consulta realizada mais recente como origem do retorno
   * @resultadoEsperado retornoDe aponta para a realizada de 2026-09-25
   */
  test('retorno usa a realizada mais recente', () => {
    realizar('2026-09-10 10:00');
    const recente = realizar('2026-09-25 10:00');
    clock.definirAgora(new Date('2026-10-19T08:00:00'));
    expect(agendar(ana, carlos, '2026-10-20 09:00').retornoDe).toBe(recente.id);
  });

  /**
   * @caso CT-INT-198
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24, RN23
   * @objetivo Garantir valor zero no retorno de paciente idoso
   * @resultadoEsperado O retorno de João também custa 0
   */
  test('retorno de paciente idoso também é gratuito', () => {
    realizar('2026-09-25 10:00', joao);
    clock.definirAgora(new Date('2026-10-19T08:00:00'));
    expect(agendar(joao, carlos, '2026-10-20 09:00').valorCentavos).toBe(0);
  });
});

describe('desconto de idoso', () => {
  /**
   * @caso CT-INT-199
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Aplicar 10% de desconto a paciente com exatamente 60 anos
   * @resultadoEsperado A consulta custa 13500 centavos
   */
  test('desconto vale a partir de 60 anos completos', () => {
    const paciente = novoPaciente({ cpf: '12345678909', dataNascimento: '1966-10-20', email: 'sessenta@email.com' });
    expect(agendar(paciente, carlos, '2026-10-20 09:00').valorCentavos).toBe(13500);
  });

  /**
   * @caso CT-INT-200
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Não aplicar desconto a paciente com 59 anos
   * @resultadoEsperado A consulta custa 15000 centavos
   */
  test('paciente com 59 anos paga o valor cheio', () => {
    const paciente = novoPaciente({ cpf: '98765432100', dataNascimento: '1966-10-21', email: 'cinquentaenove@email.com' });
    expect(agendar(paciente, carlos, '2026-10-20 09:00').valorCentavos).toBe(15000);
  });

  /**
   * @caso CT-INT-201
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Calcular o desconto sobre o preço da especialidade do médico
   * @resultadoEsperado A consulta de cardiologia de João custa 27000 centavos
   */
  test('desconto é calculado sobre o preço da especialidade', () => {
    expect(agendar(joao, beatriz, '2026-10-21 09:00').valorCentavos).toBe(27000);
  });

  /**
   * @caso CT-INT-202
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Manter o valor em centavos inteiros após o desconto
   * @resultadoEsperado valorCentavos é um número inteiro
   */
  test('valor permanece inteiro em centavos', () => {
    expect(Number.isInteger(agendar(joao, ctx.medicos[3].id, '2026-10-20 09:00').valorCentavos)).toBe(true);
  });
});
