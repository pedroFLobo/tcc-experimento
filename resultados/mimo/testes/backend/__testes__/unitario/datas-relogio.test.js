/**
 * Utilitários de data/hora, relógio injetável e modularidade das regras de negócio
 * (RNF07 — manutenibilidade/testabilidade; convenções de formato da SPEC).
 */
const fs = require('fs');
const path = require('path');
const {
  parseData,
  parseDataHora,
  formatarData,
  formatarDataHora,
  horaParaMinutos,
  minutosParaHora,
  somarMinutos,
  somarDias,
  minutosEntre,
  inicioDoDia,
} = require('../../src/utils/datas');
const clock = require('../../src/utils/clock');

describe('formatação e leitura de datas', () => {
  /**
   * @caso CT-UNI-115
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF07
   * @objetivo Converter texto 'AAAA-MM-DD' em data local válida
   * @resultadoEsperado parseData devolve um Date em 2026-10-19 e null para data inexistente
   */
  test('parseData aceita data válida e rejeita data inexistente', () => {
    const d = parseData('2026-10-19');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(19);
    expect(parseData('2026-02-30')).toBe(null);
    expect(parseData('19/10/2026')).toBe(null);
    expect(parseData('')).toBe(null);
    expect(parseData(null)).toBe(null);
  });

  /**
   * @caso CT-UNI-116
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF07
   * @objetivo Aceitar data e hora separadas por espaço ou por T
   * @resultadoEsperado parseDataHora devolve Date nas duas formas e null para hora inválida
   */
  test('parseDataHora aceita espaço e T e rejeita hora fora de 24h', () => {
    expect(formatarDataHora(parseDataHora('2026-10-19 08:00'))).toBe('2026-10-19 08:00');
    expect(formatarDataHora(parseDataHora('2026-10-19T08:00'))).toBe('2026-10-19 08:00');
    expect(parseDataHora('2026-10-19 25:00')).toBe(null);
    expect(parseDataHora('2026-10-19 08:60')).toBe(null);
    expect(parseDataHora('2026-13-01 08:00')).toBe(null);
    expect(parseDataHora('')).toBe(null);
  });

  /**
   * @caso CT-UNI-117
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF07
   * @objetivo Devolver a data no formato ISO usado pela API e pelo frontend
   * @resultadoEsperado formatarData produz '2026-10-19' com zeros à esquerda
   */
  test('formatarData usa zeros à esquerda', () => {
    expect(formatarData(new Date(2026, 9, 19))).toBe('2026-10-19');
    expect(formatarData(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  /**
   * @caso CT-UNI-118
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF07
   * @objetivo Formatar data com e sem hora no padrão da clínica
   * @resultadoEsperado formatarDataHora devolve 'AAAA-MM-DD HH:mm' e 'AAAA-MM-DD'
   */
  test('formatarDataHora cobre os dois formatos aceitos', () => {
    expect(formatarDataHora(new Date(2026, 9, 19, 10, 5))).toBe('2026-10-19 10:05');
    expect(formatarDataHora(new Date(2026, 9, 19))).toBe('2026-10-19');
  });

  /**
   * @caso CT-UNI-119
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF07
   * @objetivo Converter entre 'HH:mm' e minutos do dia
   * @resultadoEsperado horaParaMinutos e minutosParaHora são inversas nas pontas do dia
   */
  test('conversão entre hora e minutos é consistente', () => {
    expect(horaParaMinutos('07:00')).toBe(420);
    expect(horaParaMinutos('20:00')).toBe(1200);
    expect(horaParaMinutos('23:59')).toBe(1439);
    expect(horaParaMinutos('24:00')).toBe(null);
    expect(horaParaMinutos('07:60')).toBe(null);
    expect(horaParaMinutos(null)).toBe(null);
    expect(minutosParaHora(420)).toBe('07:00');
    expect(minutosParaHora(0)).toBe('00:00');
    expect(minutosParaHora(1439)).toBe('23:59');
  });

  /**
   * @caso CT-UNI-120
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Somar dias atravessando meses e anos
   * @resultadoEsperado somarDias devolve a data correta nas viradas de mês e de ano
   */
  test('somarDias cruza meses e anos', () => {
    expect(formatarData(somarDias(new Date(2026, 9, 19), 60))).toBe('2026-12-18');
    expect(formatarData(somarDias(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
    expect(formatarData(somarDias(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
    expect(formatarData(somarDias(new Date(2026, 9, 19), -90))).toBe('2026-07-21');
  });

  /**
   * @caso CT-UNI-121
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Medir a distância entre duas datas em minutos, inclusive negativa
   * @resultadoEsperado minutosEntre devolve valores exatos nos dois sentidos
   */
  test('minutosEntre devolve diferença arredondada em minutos', () => {
    expect(minutosEntre(new Date(2026, 9, 19, 8, 0), new Date(2026, 9, 19, 10, 0))).toBe(120);
    expect(minutosEntre(new Date(2026, 9, 19, 10, 0), new Date(2026, 9, 19, 8, 0))).toBe(-120);
    expect(minutosEntre(new Date(2026, 9, 19, 8, 0), somarMinutos(new Date(2026, 9, 19, 8, 0), 15))).toBe(15);
  });

  /**
   * @caso CT-UNI-122
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF07
   * @objetivo Zerar as horas ao extrair o início do dia
   * @resultadoEsperado inicioDoDia devolve 00:00 da mesma data
   */
  test('inicioDoDia zera hora, minuto e segundo', () => {
    const d = inicioDoDia(new Date(2026, 9, 19, 14, 37, 22));
    expect(formatarDataHora(d)).toBe('2026-10-19 00:00');
  });
});

describe('relógio injetável (RNF07)', () => {
  /**
   * @caso CT-UNI-123
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Permitir fixar o "agora" do sistema para tornar os testes determinísticos
   * @resultadoEsperado definirAgora fixa a data devolvida por clock.agora() e restaura com null
   */
  test('definirAgora fixa e restaura o relógio do sistema', () => {
    clock.definirAgora(new Date('2026-10-19T08:00:00'));
    expect(clock.agora()).toEqual(new Date('2026-10-19T08:00:00'));
    clock.definirAgora(null);
    expect(Math.abs(clock.agora().getTime() - Date.now())).toBeLessThan(5000);
  });

  /**
   * @caso CT-UNI-124
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Ler o "agora" fixo a partir da variável de ambiente CLINICA_AGORA
   * @resultadoEsperado carregarDoAmbiente aplica o valor do ambiente e devolve o horário esperado
   */
  test('CLINICA_AGORA fixa o relógio via ambiente', () => {
    const original = process.env.CLINICA_AGORA;
    try {
      process.env.CLINICA_AGORA = '2026-10-19 08:00';
      clock.carregarDoAmbiente();
      expect(clock.agora()).toEqual(new Date(2026, 9, 19, 8, 0));
    } finally {
      if (original === undefined) delete process.env.CLINICA_AGORA;
      else process.env.CLINICA_AGORA = original;
      clock.carregarDoAmbiente();
    }
  });

  /**
   * @caso CT-UNI-125
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF07
   * @objetivo Falhar com mensagem clara quando CLINICA_AGORA está mal formado
   * @resultadoEsperado carregarDoAmbiente lança erro explicando o formato esperado
   */
  test('CLINICA_AGORA inválido gera erro com o formato esperado', () => {
    const original = process.env.CLINICA_AGORA;
    try {
      process.env.CLINICA_AGORA = 'ontem';
      expect(() => clock.carregarDoAmbiente()).toThrow(
        'CLINICA_AGORA inválido: "ontem". Use o formato AAAA-MM-DD HH:mm.',
      );
    } finally {
      if (original === undefined) delete process.env.CLINICA_AGORA;
      else process.env.CLINICA_AGORA = original;
      clock.carregarDoAmbiente();
    }
  });
});

describe('RNF07 — regras puras sem dependência de infraestrutura', () => {
  const diretorio = path.join(__dirname, '..', '..', 'src', 'domain');
  const arquivos = ['validacoes.js', 'agenda.js', 'consultas.js'];

  /**
   * @caso CT-UNI-126
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF07
   * @objetivo Garantir que os módulos de regra não dependem de banco, HTTP ou relógio global
   * @resultadoEsperado nenhum arquivo de src/domain importa better-sqlite3, express ou utils/clock
   */
  test('domain não importa banco, HTTP nem relógio global', () => {
    arquivos.forEach((arquivo) => {
      const codigo = fs.readFileSync(path.join(diretorio, arquivo), 'utf8');
      expect(codigo).not.toMatch(/require\(['"][^'"]*(better-sqlite3|express|node:http|utils\/clock)/);
    });
  });

  /**
   * @caso CT-UNI-127
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Expor API estável e pura nos três módulos do domínio
   * @resultadoEsperado cada domínio exporta funções chamáveis sem abrir estado externo
   */
  test('módulos do domínio exportam funções puras chamáveis', () => {
    const validacoes = require('../../src/domain/validacoes');
    const agenda = require('../../src/domain/agenda');
    const consultas = require('../../src/domain/consultas');
    [validacoes, agenda, consultas].forEach((modulo) => {
      const funcoes = Object.values(modulo).filter((valor) => typeof valor === 'function');
      expect(funcoes.length).toBeGreaterThan(0);
    });
    expect(typeof validacoes.emailValido).toBe('function');
    expect(typeof agenda.gerarSlots).toBe('function');
    expect(typeof consultas.podeTransitar).toBe('function');
  });
});
