# lote-181

Modelo: nemotron

Avalie com a skill `juiz-casos-teste` **somente os 21 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| nemotron-0106 | (sem @caso) | cadastra paciente adulto com sucesso | falhou | Error: CPF inválido. at Object.validacao (C:\Users\pedro\AppData\Local\Temp\clinica-experimento\nemotron\backend\src\utils\errors.js:9:28) at Object.validacao [ |
| nemotron-0107 | (sem @caso) | cadastra paciente menor com responsável (RN06) | passou |  |
| nemotron-0108 | (sem @caso) | rejeita menor sem responsável | passou |  |
| nemotron-0109 | (sem @caso) | rejeita e-mail duplicado (RN01) | passou |  |
| nemotron-0110 | (sem @caso) | rejeita CPF duplicado (RN03) | passou |  |
| nemotron-0111 | (sem @caso) | rejeita senha fraca (RN02) | falhou | Error: expect(received).toThrow(expected) Expected pattern: /Senha/ Received message: "Nome deve ter pelo menos 3 caracteres." [0m [90m 7 \|[39m } [90m 8 \| |
| nemotron-0112 | (sem @caso) | rejeita CPF inválido (RN03) | falhou | Error: expect(received).toThrow(expected) Expected pattern: /CPF inválido/ Received message: "Nome deve ter pelo menos 3 caracteres." [0m [90m 7 \|[39m } [9 |
| nemotron-0113 | (sem @caso) | rejeita data de nascimento futura (RN05) | falhou | Error: expect(received).toThrow(expected) Expected pattern: /futura/ Received message: "Nome deve ter pelo menos 3 caracteres." [0m [90m 7 \|[39m } [90m 8 \ |
| nemotron-0114 | (sem @caso) | normaliza CPF gravando só dígitos (RN03) | falhou | Error: Nome deve ter pelo menos 3 caracteres. at Object.validacao (C:\Users\pedro\AppData\Local\Temp\clinica-experimento\nemotron\backend\src\utils\errors.js:9: |
| nemotron-0115 | (sem @caso) | cadastra médico com CRM válido | passou |  |
| nemotron-0116 | (sem @caso) | usa duração padrão 30 quando não informada (RN08) | passou |  |
| nemotron-0117 | (sem @caso) | rejeita CRM duplicado (RN07) | falhou | Error: expect(received).toThrow(expected) Expected pattern: /CRM já cadastrado/ Received message: "Nome deve ter pelo menos 3 caracteres." [0m [90m 7 \|[39m  |
| nemotron-0118 | (sem @caso) | rejeita CRM inválido (RN07) | falhou | Error: expect(received).toThrow(expected) Expected pattern: /CRM inválido/ Received message: "Nome deve ter pelo menos 3 caracteres." [0m [90m 7 \|[39m } [9 |
| nemotron-0119 | (sem @caso) | rejeita duração inválida (RN08) | falhou | Error: expect(received).toThrow(expected) Expected pattern: /Duração/ Received message: "Nome deve ter pelo menos 3 caracteres." [0m [90m 7 \|[39m } [90m 8  |
| nemotron-0120 | (sem @caso) | rejeita especialidade inexistente | falhou | Error: expect(received).toThrow(expected) Expected pattern: /Especialidade inexistente/ Received message: "Nome deve ter pelo menos 3 caracteres." [0m [90m 7  |
| nemotron-0121 | (sem @caso) | cadastra especialidade com preço > 0 | passou |  |
| nemotron-0122 | (sem @caso) | rejeita nome duplicado (RN09) | passou |  |
| nemotron-0123 | (sem @caso) | rejeita preço menor ou igual a zero (RN09) | falhou | Error: expect(received).toThrow(expected) Expected pattern: /maior que zero/ Received message: "Nome da especialidade deve ter pelo menos 3 caracteres." [0m [ |
| nemotron-0124 | (sem @caso) | ativa e inativa usuário | falhou | TypeError: Cannot read properties of undefined (reading 'buscarPorEmail') at Object.buscarPorEmail (C:\Users\pedro\AppData\Local\Temp\clinica-experimento\nemotr |
| nemotron-0125 | (sem @caso) | rejeita ativo não booleano | passou |  |
| nemotron-0126 | (sem @caso) | rejeita usuário inexistente | passou |  |

## Arquivo: backend/__testes__/integracao/cadastro.integracao.test.js

```js
// Testes de integração — serviço de cadastro (RF02, RF03, RF04, RN01–RN09)
// Atributos: Adequação funcional, Segurança, Confiabilidade, Usabilidade
const { abrirBanco, limparBanco } = require('../../src/db/connection');
const semear = require('../../src/db/seed').semear;
const clock = require('../../src/utils/clock');
const { criarServicos } = require('../../src/services');

const AGORA = new Date('2026-10-19T08:00:00');

let db, servicos;

beforeEach(() => {
  clock.definirAgora(AGORA);
  db = abrirBanco(':memory:');
  semear(db);
  servicos = criarServicos(db);
});

afterEach(() => {
  limparBanco(db);
  db.close();
  clock.definirAgora(null);
});

describe('cadastroService.registrarPaciente (RF02)', () => {
  test('cadastra paciente adulto com sucesso', () => {
    const p = servicos.cadastroService.registrarPaciente({
      nome: 'Maria Silva',
      email: 'maria@email.com',
      senha: 'Senha123',
      cpf: '733.769.628-50',
      dataNascimento: '1985-03-10',
      telefone: '(11) 99999-0000',
    });
    expect(p.nome).toBe('Maria Silva');
    expect(p.cpf).toBe('73376962850');
    expect(p.responsavelNome).toBeNull();
  });

  test('cadastra paciente menor com responsável (RN06)', () => {
    const p = servicos.cadastroService.registrarPaciente({
      nome: 'Lucas Oliveira',
      email: 'lucas2@email.com',
      senha: 'Senha123',
      cpf: '123.456.789-09',
      dataNascimento: '2010-01-01',
      responsavelNome: 'Marta Oliveira',
    });
    expect(p.responsavelNome).toBe('Marta Oliveira');
  });

  test('rejeita menor sem responsável', () => {
    expect(() =>
      servicos.cadastroService.registrarPaciente({
        nome: 'Menor',
        email: 'menor@email.com',
        senha: 'Senha123',
        cpf: '987.654.321-00',
        dataNascimento: '2015-01-01',
      })
    ).toThrow(/responsável/);
  });

  test('rejeita e-mail duplicado (RN01)', () => {
    expect(() =>
      servicos.cadastroService.registrarPaciente({
        nome: 'Dup',
        email: 'ana@email.com',
        senha: 'Senha123',
        cpf: '111.222.333-44',
        dataNascimento: '1990-01-01',
      })
    ).toThrow(/E-mail já cadastrado/);
  });

  test('rejeita CPF duplicado (RN03)', () => {
    expect(() =>
      servicos.cadastroService.registrarPaciente({
        nome: 'Dup',
        email: 'dup@email.com',
        senha: 'Senha123',
        cpf: '529.982.247-25', // CPF da Ana
        dataNascimento: '1990-01-01',
      })
    ).toThrow(/CPF já cadastrado/);
  });

  test('rejeita senha fraca (RN02)', () => {
    expect(() =>
      servicos.cadastroService.registrarPaciente({
        nome: 'X',
        email: 'x@email.com',
        senha: '123',
        cpf: '111.222.333-44',
        dataNascimento: '1990-01-01',
      })
    ).toThrow(/Senha/);
  });

  test('rejeita CPF inválido (RN03)', () => {
    expect(() =>
      servicos.cadastroService.registrarPaciente({
        nome: 'X',
        email: 'x@email.com',
        senha: 'Senha123',
        cpf: '111.111.111-11',
        dataNascimento: '1990-01-01',
      })
    ).toThrow(/CPF inválido/);
  });

  test('rejeita data de nascimento futura (RN05)', () => {
    expect(() =>
      servicos.cadastroService.registrarPaciente({
        nome: 'X',
        email: 'x@email.com',
        senha: 'Senha123',
        cpf: '111.222.333-44',
        dataNascimento: '2030-01-01',
      })
    ).toThrow(/futura/);
  });

  test('normaliza CPF gravando só dígitos (RN03)', () => {
    const p = servicos.cadastroService.registrarPaciente({
      nome: 'Y',
      email: 'y@email.com',
      senha: 'Senha123',
      cpf: '733.769.628-50',
      dataNascimento: '1990-01-01',
    });
    expect(p.cpf).toBe('73376962850');
  });
});

describe('cadastroService.criarMedico (RF04, RN07, RN08)', () => {
  const especialidadeId = 1; // Clínica Geral

  test('cadastra médico com CRM válido', () => {
    const m = servicos.cadastroService.criarMedico({
      nome: 'Dr. Novo',
      email: 'novo@clinica.com',
      senha: 'Senha123',
      crm: '54321/SP',
      especialidadeId,
      duracaoConsultaMin: 30,
    });
    expect(m.crm).toBe('54321/SP');
    expect(m.duracaoConsultaMin).toBe(30);
  });

  test('usa duração padrão 30 quando não informada (RN08)', () => {
    const m = servicos.cadastroService.criarMedico({
      nome: 'Dr. Novo',
      email: 'novo2@clinica.com',
      senha: 'Senha123',
      crm: '54322/SP',
      especialidadeId,
    });
    expect(m.duracaoConsultaMin).toBe(30);
  });

  test('rejeita CRM duplicado (RN07)', () => {
    expect(() =>
      servicos.cadastroService.criarMedico({
        nome: 'X',
        email: 'x@clinica.com',
        senha: 'Senha123',
        crm: '123456/SP', // CRM do Carlos
        especialidadeId,
      })
    ).toThrow(/CRM já cadastrado/);
  });

  test('rejeita CRM inválido (RN07)', () => {
    expect(() =>
      servicos.cadastroService.criarMedico({
        nome: 'X',
        email: 'x@clinica.com',
        senha: 'Senha123',
        crm: '123/SP',
        especialidadeId,
      })
    ).toThrow(/CRM inválido/);
  });

  test('rejeita duração inválida (RN08)', () => {
    expect(() =>
      servicos.cadastroService.criarMedico({
        nome: 'X',
        email: 'x@clinica.com',
        senha: 'Senha123',
        crm: '54323/SP',
        especialidadeId,
        duracaoConsultaMin: 20,
      })
    ).toThrow(/Duração/);
  });

  test('rejeita especialidade inexistente', () => {
    expect(() =>
      servicos.cadastroService.criarMedico({
        nome: 'X',
        email: 'x@clinica.com',
        senha: 'Senha123',
        crm: '54323/SP',
        especialidadeId: 999,
      })
    ).toThrow(/Especialidade inexistente/);
  });
});

describe('cadastroService.criarEspecialidade (RF03, RN09)', () => {
  test('cadastra especialidade com preço > 0', () => {
    const e = servicos.cadastroService.criarEspecialidade({ nome: 'Ortopedia', precoCentavos: 20000 });
    expect(e.nome).toBe('Ortopedia');
    expect(e.precoCentavos).toBe(20000);
  });

  test('rejeita nome duplicado (RN09)', () => {
    expect(() =>
      servicos.cadastroService.criarEspecialidade({ nome: 'Clínica Geral', precoCentavos: 100 })
    ).toThrow(/já cadastrada/);
  });

  test('rejeita preço menor ou igual a zero (RN09)', () => {
    expect(() =>
      servicos.cadastroService.criarEspecialidade({ nome: 'X', precoCentavos: 0 })
    ).toThrow(/maior que zero/);
    expect(() =>
      servicos.cadastroService.criarEspecialidade({ nome: 'Y', precoCentavos: -50 })
    ).toThrow(/maior que zero/);
  });
});

describe('cadastroService.definirUsuarioAtivo (RF02.2, RN21)', () => {
  test('ativa e inativa usuário', () => {
    const usuario = servicos.usuarios.buscarPorEmail('ana@email.com');
    let r = servicos.cadastroService.definirUsuarioAtivo(usuario.id, false);
    expect(r.ativo).toBe(false);
    r = servicos.cadastroService.definirUsuarioAtivo(usuario.id, true);
    expect(r.ativo).toBe(true);
  });

  test('rejeita ativo não booleano', () => {
    expect(() => servicos.cadastroService.definirUsuarioAtivo(1, 'sim')).toThrow(/true ou false/);
  });

  test('rejeita usuário inexistente', () => {
    expect(() => servicos.cadastroService.definirUsuarioAtivo(999, true)).toThrow(/não encontrado/);
  });
});
```
