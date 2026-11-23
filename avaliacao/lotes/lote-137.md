# lote-137

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 11 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0245 | CT-INT-040 | horários da segunda respeitam antecedência mínima | passou |  |
| mimo-0246 | CT-INT-041 | dia sem bloco na grade devolve lista vazia | passou |  |
| mimo-0247 | CT-INT-042 | médico de terça e quinta não oferece horário na segunda | passou |  |
| mimo-0248 | CT-INT-043 | sábado do pediatra gera slots de 15 minutos | passou |  |
| mimo-0249 | CT-INT-044 | data dentro de bloqueio não oferece horários | passou |  |
| mimo-0250 | CT-INT-045 | consulta ativa ocupa o horário na lista de livres | passou |  |
| mimo-0251 | CT-INT-046 | consulta cancelada devolve o horário à lista | passou |  |
| mimo-0252 | CT-INT-047 | horário ocupado por qualquer paciente deixa de ser livre | passou |  |
| mimo-0253 | CT-INT-048 | médico inativo não oferece horários | passou |  |
| mimo-0254 | CT-INT-049 | data malformada é rejeitada | passou |  |
| mimo-0255 | CT-INT-050 | horários de médico inexistente devolvem 404 | passou |  |

## Arquivo: backend/__testes__/integracao/horarios-livres.test.js

```js
/**
 * Consulta de horários livres (RF07) com as regras RN14, RN15 e RN16.
 * Relógio fixado em 2026-10-19 08:00 (segunda-feira).
 */
const clock = require('../../src/utils/clock');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');

const AGORA = '2026-10-19 08:00';

let db;
let servicos;
let carlos;
let eduardo;
let fernanda;
let ana;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  const dados = semear(db);
  servicos = criarServicos(db);
  [carlos, , eduardo, fernanda] = dados.medicos;
  [ana] = dados.pacientes;
});

afterEach(() => {
  clock.definirAgora(null);
  db.close();
});

function criarConsulta({ pacienteId, medicoId, inicio, fim, status = 'AGENDADA' }) {
  const id = servicos.repos.consultas.inserir({
    pacienteId,
    medicoId,
    inicio,
    fim,
    valorCentavos: 15000,
    retornoDe: null,
    agora: AGORA,
  });
  if (status !== 'AGENDADA') db.prepare('UPDATE consultas SET status = ? WHERE id = ?').run(status, id);
  return id;
}

describe('RF07 — listagem de horários livres', () => {
  /**
   * @caso CT-INT-040
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1, RN14, RN16
   * @objetivo Gerar os slots da segunda-feira respeitando grade, duração e antecedência
   * @resultadoEsperado a lista começa em 10:00 (mínimo de 2 horas) e termina em 17:30 com 12 horários
   */
  test('horários da segunda respeitam antecedência mínima', () => {
    const horarios = servicos.agendaService.horariosLivres(carlos.id, '2026-10-19');
    expect(horarios).toHaveLength(12);
    expect(horarios[0]).toBe('2026-10-19 10:00');
    expect(horarios[horarios.length - 1]).toBe('2026-10-19 17:30');
    expect(horarios).not.toContain('2026-10-19 09:30');
    expect(horarios).toContain('2026-10-19 14:00');
  });

  /**
   * @caso CT-INT-041
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN14
   * @objetivo Não oferecer horário em dia sem bloco da grade
   * @resultadoEsperado domingo devolve lista vazia para o médico de segunda a sexta
   */
  test('dia sem bloco na grade devolve lista vazia', () => {
    expect(servicos.agendaService.horariosLivres(carlos.id, '2026-10-25')).toEqual([]);
  });

  /**
   * @caso CT-INT-042
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN14
   * @objetivo Não oferecer horário em dia da semana em que o médico não atende
   * @resultadoEsperado segunda-feira devolve lista vazia para o médico de terça e quinta
   */
  test('médico de terça e quinta não oferece horário na segunda', () => {
    expect(servicos.agendaService.horariosLivres(eduardo.id, '2026-10-19')).toEqual([]);
  });

  /**
   * @caso CT-INT-043
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN14
   * @objetivo Gerar slots de 15 minutos no sábado para o pediatra
   * @resultadoEsperado o sábado tem 16 horários de 08:00 a 11:45
   */
  test('sábado do pediatra gera slots de 15 minutos', () => {
    const horarios = servicos.agendaService.horariosLivres(fernanda.id, '2026-10-24');
    expect(horarios).toHaveLength(16);
    expect(horarios[0]).toBe('2026-10-24 08:00');
    expect(horarios[15]).toBe('2026-10-24 11:45');
  });

  /**
   * @caso CT-INT-044
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN15
   * @objetivo Esconder todos os horários de uma data coberta por bloqueio
   * @resultadoEsperado a data bloqueada devolve lista vazia e a vizinha continua com horários
   */
  test('data dentro de bloqueio não oferece horários', () => {
    servicos.agendaService.criarBloqueio({ perfil: 'RECEPCAO' }, carlos.id, {
      dataInicio: '2026-11-02',
      dataFim: '2026-11-03',
      motivo: 'Férias',
    });
    expect(servicos.agendaService.horariosLivres(carlos.id, '2026-11-02')).toEqual([]);
    expect(servicos.agendaService.horariosLivres(carlos.id, '2026-11-04')).not.toHaveLength(0);
  });

  /**
   * @caso CT-INT-045
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN15
   * @objetivo Excluir o horário coberto por consulta ativa do médico
   * @resultadoEsperado 14:00 desaparece da lista enquanto as demais permanecem
   */
  test('consulta ativa ocupa o horário na lista de livres', () => {
    const antes = servicos.agendaService.horariosLivres(carlos.id, '2026-10-19');
    criarConsulta({ pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-19 14:00', fim: '2026-10-19 14:30' });
    const depois = servicos.agendaService.horariosLivres(carlos.id, '2026-10-19');
    expect(depois).toHaveLength(antes.length - 1);
    expect(depois).not.toContain('2026-10-19 14:00');
    expect(depois).toContain('2026-10-19 14:30');
  });

  /**
   * @caso CT-INT-046
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN15
   * @objetivo Liberar o horário quando a consulta que o ocupava é cancelada
   * @resultadoEsperado o horário volta a aparecer após o cancelamento
   */
  test('consulta cancelada devolve o horário à lista', () => {
    const id = criarConsulta({ pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-19 14:00', fim: '2026-10-19 14:30' });
    expect(servicos.agendaService.horariosLivres(carlos.id, '2026-10-19')).not.toContain('2026-10-19 14:00');
    db.prepare("UPDATE consultas SET status = 'CANCELADA' WHERE id = ?").run(id);
    expect(servicos.agendaService.horariosLivres(carlos.id, '2026-10-19')).toContain('2026-10-19 14:00');
  });

  /**
   * @caso CT-INT-047
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN15
   * @objetivo Tratar consulta de outro paciente como indisponibilidade do horário
   * @resultadoEsperado o horário deixa de ser oferecido mesmo com paciente diferente
   */
  test('horário ocupado por qualquer paciente deixa de ser livre', () => {
    const lucas = servicos.repos.pacientes.buscarPorId(3);
    criarConsulta({ pacienteId: lucas.id, medicoId: carlos.id, inicio: '2026-10-19 15:00', fim: '2026-10-19 15:30' });
    expect(servicos.agendaService.horariosLivres(carlos.id, '2026-10-19')).not.toContain('2026-10-19 15:00');
  });

  /**
   * @caso CT-INT-048
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN21
   * @objetivo Não oferecer horários de médico com conta inativa
   * @resultadoEsperado a lista vem vazia após desativar o usuário do médico
   */
  test('médico inativo não oferece horários', () => {
    expect(servicos.agendaService.horariosLivres(carlos.id, '2026-10-26')).not.toHaveLength(0);
    servicos.repos.usuarios.definirAtivo(carlos.usuarioId, false);
    expect(servicos.agendaService.horariosLivres(carlos.id, '2026-10-26')).toEqual([]);
  });

  /**
   * @caso CT-INT-049
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF07.1, RNF04
   * @objetivo Rejeitar data no formato errado com mensagem em português
   * @resultadoEsperado a consulta falha com 400 VALIDACAO explicando o formato
   */
  test('data malformada é rejeitada', () => {
    let erro;
    try {
      servicos.agendaService.horariosLivres(carlos.id, '19/10/2026');
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Data inválida. Use o formato AAAA-MM-DD.');
  });

  /**
   * @caso CT-INT-050
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN30
   * @objetivo Devolver 404 ao pedir horários de médico inexistente
   * @resultadoEsperado a consulta falha com 404 NAO_ENCONTRADO
   */
  test('horários de médico inexistente devolvem 404', () => {
    let erro;
    try {
      servicos.agendaService.horariosLivres(99999, '2026-10-26');
    } catch (e) {
      erro = e;
    }
    expect(erro.status).toBe(404);
    expect(erro.codigo).toBe('NAO_ENCONTRADO');
  });
});
```
