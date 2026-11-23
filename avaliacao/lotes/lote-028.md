# lote-028

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 14 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0445 | CT-INT-011 | cria médicos e pacientes de exemplo | passou |  |
| deepseek-0446 | CT-INT-012 | cria especialidades com preços base | passou |  |
| deepseek-0447 | CT-INT-013 | cria os oito usuários com perfis corretos | passou |  |
| deepseek-0448 | CT-INT-014 | grava senhas apenas como hash bcrypt | passou |  |
| deepseek-0449 | CT-INT-015 | não expõe hash de senha nos retornos | passou |  |
| deepseek-0450 | CT-INT-016 | normaliza o CPF dos pacientes | passou |  |
| deepseek-0451 | CT-INT-017 | grava e-mails em minúsculas | passou |  |
| deepseek-0452 | CT-INT-018 | paciente menor tem responsável | passou |  |
| deepseek-0453 | CT-INT-019 | paciente idoso de exemplo tem mais de 60 anos | passou |  |
| deepseek-0454 | CT-INT-020 | cria as grades semanais de exemplo | passou |  |
| deepseek-0455 | CT-INT-021 | banco inicial não tem consultas nem bloqueios | passou |  |
| deepseek-0456 | CT-INT-022 | cria médicos com as durações configuradas | passou |  |
| deepseek-0457 | CT-INT-023 | CRMs são únicos e válidos | passou |  |
| deepseek-0458 | CT-INT-024 | semear é determinístico com o relógio fixo | passou |  |

## Arquivo: backend/__testes__/integracao/seed-dados.test.js

```js
// Integração: dados de exemplo criados por semear(db).
const bcrypt = require('bcryptjs');
const { abrirBanco } = require('../../src/db/connection');
const { semear, SENHA_PADRAO } = require('../../src/db/seed');
const { calcularIdade } = require('../../src/domain/validacoes');
const clock = require('../../src/utils/clock');

let db;
let dados;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  dados = semear(db);
});

afterEach(() => {
  db.close();
  clock.definirAgora(null);
});

describe('semear', () => {
  /**
   * @caso CT-INT-011
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04.1, RF02.2
   * @objetivo Criar os quatro médicos e três pacientes de exemplo
   * @resultadoEsperado semear devolve 4 médicos e 3 pacientes com identificadores
   */
  test('cria médicos e pacientes de exemplo', () => {
    expect(dados.medicos).toHaveLength(4);
    expect(dados.pacientes).toHaveLength(3);
    expect(dados.medicos.every((m) => Number.isInteger(m.id))).toBe(true);
  });

  /**
   * @caso CT-INT-012
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.1
   * @objetivo Criar as quatro especialidades com os preços da documentação
   * @resultadoEsperado Clínica Geral 15000, Cardiologia 30000, Dermatologia 25000 e Pediatria 20000
   */
  test('cria especialidades com preços base', () => {
    const precos = Object.fromEntries(
      db.prepare('SELECT nome, preco_centavos FROM especialidades').all().map((l) => [l.nome, l.preco_centavos]),
    );
    expect(precos).toEqual({
      'Clínica Geral': 15000,
      Cardiologia: 30000,
      Dermatologia: 25000,
      Pediatria: 20000,
    });
  });

  /**
   * @caso CT-INT-013
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF01.1, RF02.1, RF04.1
   * @objetivo Criar os oito usuários de exemplo
   * @resultadoEsperado Existem 1 recepção, 4 médicos e 3 pacientes no banco
   */
  test('cria os oito usuários com perfis corretos', () => {
    const perfis = db.prepare('SELECT perfil, COUNT(*) AS n FROM usuarios GROUP BY perfil').all();
    expect(perfis).toEqual(expect.arrayContaining([
      { perfil: 'RECEPCAO', n: 1 },
      { perfil: 'MEDICO', n: 4 },
      { perfil: 'PACIENTE', n: 3 },
    ]));
  });

  /**
   * @caso CT-INT-014
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF01
   * @objetivo Armazenar apenas o hash bcrypt da senha padrão
   * @resultadoEsperado Nenhuma senha em texto puro aparece e todas conferem com Senha123
   */
  test('grava senhas apenas como hash bcrypt', () => {
    const hashes = db.prepare('SELECT senha_hash FROM usuarios').all().map((l) => l.senha_hash);
    expect(hashes).toHaveLength(8);
    hashes.forEach((hash) => {
      expect(hash).not.toBe(SENHA_PADRAO);
      expect(bcrypt.compareSync(SENHA_PADRAO, hash)).toBe(true);
    });
  });

  /**
   * @caso CT-INT-015
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF01, RF04.1
   * @objetivo Nunca devolver o hash de senha nos dados de retorno do semear
   * @resultadoEsperado Os objetos de médicos e pacientes não possuem senhaHash
   */
  test('não expõe hash de senha nos retornos', () => {
    [...dados.medicos, ...dados.pacientes].forEach((registro) => {
      expect(registro).not.toHaveProperty('senhaHash');
      expect(registro).not.toHaveProperty('senha');
    });
  });

  /**
   * @caso CT-INT-016
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Gravar os CPFs normalizados, somente com dígitos
   * @resultadoEsperado Todos os CPFs dos pacientes têm 11 dígitos numéricos
   */
  test('normaliza o CPF dos pacientes', () => {
    dados.pacientes.forEach((p) => {
      expect(p.cpf).toMatch(/^\d{11}$/);
    });
  });

  /**
   * @caso CT-INT-017
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Gravar os e-mails em minúsculas
   * @resultadoEsperado Todos os e-mails do banco são iguais ao texto em minúsculas
   */
  test('grava e-mails em minúsculas', () => {
    db.prepare('SELECT email FROM usuarios').all().forEach((l) => {
      expect(l.email).toBe(l.email.toLowerCase());
    });
  });

  /**
   * @caso CT-INT-018
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Cadastrar o paciente menor de idade com responsável
   * @resultadoEsperado Lucas Oliveira tem menos de 18 anos em 19/10/2026 e responsável Marta Oliveira
   */
  test('paciente menor tem responsável', () => {
    const lucas = dados.pacientes.find((p) => p.nome === 'Lucas Oliveira');
    expect(calcularIdade(new Date(`${lucas.dataNascimento}T00:00:00`), new Date(2026, 9, 19))).toBeLessThan(18);
    expect(lucas.responsavelNome).toBe('Marta Oliveira');
  });

  /**
   * @caso CT-INT-019
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Ter um paciente idoso para exercitar o desconto de 10%
   * @resultadoEsperado João Santos nasceu em 1958-02-03 e tem mais de 60 anos em 19/10/2026
   */
  test('paciente idoso de exemplo tem mais de 60 anos', () => {
    const joao = dados.pacientes.find((p) => p.nome === 'João Santos');
    expect(joao.dataNascimento).toBe('1958-02-03');
    expect(calcularIdade(new Date(1958, 1, 3), new Date(2026, 9, 19))).toBeGreaterThanOrEqual(60);
  });

  /**
   * @caso CT-INT-020
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.1
   * @objetivo Criar a grade semanal dos quatro médicos
   * @resultadoEsperado Carlos 10 blocos, Beatriz 3, Eduardo 2 e Fernanda 6
   */
  test('cria as grades semanais de exemplo', () => {
    const blocos = (medicoId) => db.prepare('SELECT COUNT(*) AS n FROM disponibilidades WHERE medico_id = ?').get(medicoId).n;
    expect(blocos(dados.medicos[0].id)).toBe(10);
    expect(blocos(dados.medicos[1].id)).toBe(3);
    expect(blocos(dados.medicos[2].id)).toBe(2);
    expect(blocos(dados.medicos[3].id)).toBe(6);
  });

  /**
   * @caso CT-INT-021
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.2
   * @objetivo Começar com a agenda vazia
   * @resultadoEsperado Não existe nenhuma consulta nem bloqueio no banco inicial
   */
  test('banco inicial não tem consultas nem bloqueios', () => {
    expect(db.prepare('SELECT COUNT(*) AS n FROM consultas').get().n).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM bloqueios').get().n).toBe(0);
  });

  /**
   * @caso CT-INT-022
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF04.1, RN08
   * @objetivo Aplicar as durações de consulta de cada especialidade
   * @resultadoEsperado Carlos 30, Beatriz 45, Eduardo 30 e Fernanda 15 minutos
   */
  test('cria médicos com as durações configuradas', () => {
    expect(dados.medicos.map((m) => m.duracaoConsultaMin)).toEqual([30, 45, 30, 15]);
  });

  /**
   * @caso CT-INT-023
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF04.1, RN07
   * @objetivo Gravar CRMs únicos e no formato NNNNN/UF
   * @resultadoEsperado Os quatro CRMs seguem o padrão e não se repetem
   */
  test('CRMs são únicos e válidos', () => {
    const crms = dados.medicos.map((m) => m.crm);
    expect(new Set(crms).size).toBe(4);
    crms.forEach((crm) => expect(crm).toMatch(/^\d{4,6}\/[A-Z]{2}$/));
  });

  /**
   * @caso CT-INT-024
   * @nivel integracao
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Produzir sempre os mesmos dados com o relógio fixo
   * @resultadoEsperado Duas execuções em bancos distintos geram a mesma data de nascimento para o menor
   */
  test('semear é determinístico com o relógio fixo', () => {
    const outro = abrirBanco(':memory:');
    try {
      const outrosDados = semear(outro);
      expect(outrosDados.pacientes[2].dataNascimento).toBe(dados.pacientes[2].dataNascimento);
    } finally {
      outro.close();
    }
  });
});
```
