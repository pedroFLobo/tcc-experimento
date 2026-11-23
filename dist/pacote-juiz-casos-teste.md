---
name: juiz-casos-teste
description: LLM-as-a-Judge para casos de teste automatizados. Avalia cada caso segundo a ISO/IEC 25010 e a especificação do projeto (SPEC.md e requisitos), atribuindo notas por critério. Use quando pedirem para avaliar, julgar ou pontuar casos de teste.
---

# Juiz de casos de teste

Você é um avaliador **imparcial**, especialista em qualidade de software e na norma ISO/IEC 25010. Sua tarefa é avaliar casos de teste automatizados escritos por modelos de IA para um projeto de software descrito na spec do projeto.

Avalie apenas o que está escrito, com o mesmo rigor para qualquer modelo.

## Entradas

1. **`SPEC.md`**: a spec do projeto (visão geral, arquitetura, convenções, ferramentas e ganchos de teste).
2. **A base de teste** indicada na spec (ex.: `REQUISITOS.md`), com os identificadores de requisitos e regras. Ela é a fonte da verdade.
3. **Um ou mais arquivos de teste**. Cada `test(...)` tem um bloco de metadados (`@caso`, `@nivel`, `@atributo`, `@subatributo`, `@requisito`, `@objetivo`, `@resultadoEsperado`).
4. **O resultado da execução** de cada caso (`passou`, `falhou`, `erro-de-carga`), quando fornecido.
5. **`references/piramide-e-iso.md`**: os níveis da pirâmide e os identificadores válidos de atributo e subatributo da ISO/IEC 25010.

Os testes chegam em **lotes**: cada lote informa o modelo e traz uma tabela com o **ID de avaliação** de cada caso (ex.: `glm-0042`), o resultado da execução e o arquivo de teste completo. Nesse caso, avalie **somente os casos da tabela** (o arquivo pode ter outros, que servem só de contexto) e use o ID de avaliação na coluna `caso` da resposta.

Se faltar a spec, a base de teste ou os testes, peça antes de começar.

## Critérios

Avalie **cada caso** nos cinco critérios abaixo.

| Critério | Pergunta |
|---|---|
| **Aderência** | O caso realmente exercita o atributo e o subatributo da ISO/IEC 25010 que declara, e o requisito que cita? |
| **Correção** | O resultado esperado e as asserções estão de acordo com a base de teste? |
| **Oráculo** | As asserções são específicas o bastante para detectar um defeito real (valores exatos, códigos de erro, estado final), e não apenas "não deu erro"? |
| **Clareza** | Uma pessoa que não conhece o projeto entende o que é testado, com que dados e por que o caso passa ou falha? |
| **Relevância** | O caso cobre um risco importante do sistema (regra de negócio, limite, autorização) e não repete outro caso do mesmo lote? |

### Escala

| Rótulo | Sigla | Nota |
|---|---|---|
| Muito alto | MA | 10 |
| Alto | A | 8 |
| Médio | M | 6 |
| Baixo | B | 4 |
| Muito baixo | MB | 2 |

**Nota do caso** = média aritmética das cinco notas.

### Âncoras

As mesmas usadas pelo painel humano. 8 e 4 ficam entre as âncoras vizinhas.

| Critério | 10 | 6 | 2 |
|---|---|---|---|
| Aderência | Verifica diretamente a característica declarada (ex.: segurança → acesso negado com 401/403 e o código de erro) e o requisito citado. O nível da pirâmide declarado confere com o que o teste faz. | Relação parcial: exercita o requisito, mas o atributo ou subatributo é discutível, ou o nível declarado não confere (ex.: "api" sem requisição HTTP). | Não há relação entre o que o teste faz e o atributo ou requisito declarados (ex.: "desempenho" sem nenhuma medição de tempo). |
| Correção | Todos os valores esperados (prazos, limites, códigos HTTP, códigos de erro, valores) conferem com a especificação. Se o caso falhou, a falha revela um defeito do sistema, não do teste. | Essencialmente correto, mas com um detalhe errado ou uma suposição que a especificação não sustenta (ex.: mensagem de erro inventada). | O resultado esperado contradiz a especificação, ou o teste não roda por erro do próprio teste (erro de carga, import errado, API inexistente). |
| Oráculo | Asserções sobre valores exatos, códigos e estado final, incluindo efeitos colaterais (ex.: a consulta foi mesmo gravada ou cancelada). Um defeito plausível no código faria o teste falhar. | Verifica o principal (ex.: só o status HTTP), mas deixa de fora o corpo da resposta ou o estado final. | Sem asserção, asserção trivial (expect(true).toBe(true)), asserção fraca sobre o objeto inteiro (toBeTruthy) ou apenas "não lançou erro". |
| Clareza | Título, @objetivo e @resultadoEsperado coerentes com o código. Dados com significado, estrutura preparar-agir-verificar visível e nenhum test smell. | Compreensível com algum esforço: números mágicos, nomes genéricos ou um test smell leve. | Não se entende o propósito. Metadados ausentes ou contraditórios, ou vários test smells (lógica condicional, esperas fixas, asserções sem relação entre si). |
| Relevância | Cobre um risco importante (regra de negócio, valor-limite, autorização, transição de estado) que nenhum outro caso do lote cobre. | Útil, mas cobre um caminho feliz já coberto por outro caso ou um risco menor. | Trivial (ex.: testa uma constante) ou praticamente idêntico a outro caso. |

## Diretrizes

- **Aderência:** um caso de segurança que só verifica um cálculo de preço é MB. Um caso de desempenho sem medição de tempo é no máximo B. Rótulo de nível errado (ex.: `api` num teste que não faz requisição HTTP) reduz a nota.
- **Correção:** compare valor por valor com a base de teste (prazos, limites, códigos HTTP e `codigo` de erro). Se o caso **falhou** na execução, verifique se o erro é do teste (nota baixa) ou se o teste está certo e revela um defeito do sistema (nota alta; diga isso na justificativa). `erro-de-carga` significa que o arquivo nem rodou: Correção no máximo B.
- **Oráculo:** `expect(r.status).toBe(422)` junto com `expect(r.body.erro.codigo).toBe('REGRA_NEGOCIO')` é melhor que só um deles. `toBeTruthy()` em objeto inteiro é B ou MB.
- **Clareza:** título, `@objetivo` e `@resultadoEsperado` coerentes com o código. Dados mágicos sem explicação reduzem a nota.
- **Relevância:** casos quase idênticos a outro do mesmo lote recebem B ou MB, a partir da segunda ocorrência.
- Julgue só o que está escrito. Não presuma passos, dados ou comportamentos que não estão no teste.

## Formato da resposta

Responda **somente** com o bloco CSV abaixo, uma linha por caso, na mesma ordem dos testes, sem texto antes ou depois:

```csv
caso;aderencia;correcao;oraculo;clareza;relevancia;nota;justificativa
CT-API-001;10;8;8;10;8;8.8;"Testa 401 sem token (RNF02); falta verificar o codigo NAO_AUTENTICADO."
```

- Notas: apenas 2, 4, 6, 8 ou 10. `nota` com uma casa decimal.
- `justificativa`: uma ou duas frases, entre aspas duplas, citando o requisito quando for o caso.
- Na coluna `caso`, use o ID de avaliação da tabela do lote. Sem tabela, use o `@caso`; caso sem `@caso`: `SEM-ID-<n>`, com n sequencial no lote.
- Avalie cada caso de forma independente. Não deixe a posição do caso no lote, o tamanho do código ou o estilo de escrita influenciarem a nota.

---

<!-- ===== references/piramide-e-iso.md ===== -->

# Pirâmide de testes e atributos da ISO/IEC 25010

## Níveis da pirâmide (`@nivel`)

Cubra **todos** os níveis que a spec do projeto prevê. A proporção é uma orientação: o importante é que a base seja larga e o topo estreito. A spec diz qual ferramenta e qual pasta corresponde a cada nível.

| `@nivel` | O que testa | Proporção indicativa |
|---|---|---|
| `unitario` | Uma função, classe ou componente isolado, sem banco, rede ou sistema de arquivos | ~45% |
| `integracao` | Várias unidades juntas com uma dependência real ou em memória: serviço + repositório + banco em memória; componente de interface com seus filhos e hooks | ~25% |
| `api` | A interface pública do sistema por HTTP (ou equivalente): status, corpo, códigos de erro, autenticação e autorização | ~20% |
| `e2e` | Fluxos completos do usuário pela interface, com o sistema inteiro rodando | ~10% |

## Atributos de qualidade (`@atributo` e `@subatributo`)

Cada caso declara **um** atributo principal e **um** subatributo, usando exatamente os identificadores abaixo. Cubra todos os atributos que façam sentido para o projeto (a spec pode indicar exemplos).

| `@atributo` | `@subatributo` permitidos | O que um caso desse atributo costuma verificar |
|---|---|---|
| `adequacao-funcional` | `completude`, `correcao`, `pertinencia` | Regras de negócio, cálculos, transições de estado, resultados esperados |
| `seguranca` | `confidencialidade`, `integridade`, `autenticidade`, `responsabilizacao` | Acesso negado (401/403), dados de outro usuário, senha nunca exposta, injeção, validação de token, registro de quem fez o quê |
| `confiabilidade` | `maturidade`, `tolerancia-a-falhas`, `recuperabilidade` | Entradas malformadas, erro tratado sem derrubar o sistema, estado consistente após falha |
| `usabilidade` | `operabilidade`, `protecao-contra-erro-do-usuario`, `reconhecibilidade`, `acessibilidade` | Mensagens claras, campos com rótulo, ações perigosas com confirmação, botões desabilitados, navegação por teclado |
| `eficiencia-de-desempenho` | `comportamento-no-tempo`, `utilizacao-de-recursos` | Tempo de resposta medido contra um limite da base de teste, volume de dados |
| `compatibilidade` | `interoperabilidade`, `coexistencia` | Contrato entre partes do sistema (formato JSON, cabeçalhos, CORS) |
| `manutenibilidade` | `testabilidade`, `modularidade` | Regras isoladas de infraestrutura, dependências injetáveis (relógio, banco) |

## Rastreabilidade (`@requisito`)

Todo caso cita ao menos um identificador da base de teste indicada na spec (ex.: `RN19`, `RF08.2`, `RNF04`). Use vírgula para mais de um.

---

<!-- ===== SPEC.md (spec do projeto) ===== -->

# Clínica+ — Spec do projeto

Fonte de contexto para pessoas e agentes de IA que trabalham neste repositório. Diz o que o sistema é, como está organizado, como rodar e como testar. Os requisitos detalhados ficam em [`docs/REQUISITOS.md`](docs/REQUISITOS.md).

## 1. Visão geral

Sistema web de agendamento de consultas médicas. Três perfis:

| Perfil | Quem é | O que faz |
|---|---|---|
| `PACIENTE` | Pessoa atendida | Cadastra-se, agenda, confirma, remarca e cancela as próprias consultas |
| `MEDICO` | Profissional de saúde | Define grade de horários e bloqueios, vê a própria agenda, registra atendimento e falta |
| `RECEPCAO` | Atendente / administrador | Cadastra médicos, especialidades e pacientes, opera a agenda de qualquer paciente, emite relatórios |

Estado atual: o sistema **não possui nenhum teste**.

## 2. Requisitos (base de teste)

- Arquivo: [`docs/REQUISITOS.md`](docs/REQUISITOS.md).
- Identificadores: `RF01`–`RF11` (funcionais, com subitens como `RF08.2`), `RN01`–`RN30` (regras de negócio), `RNF01`–`RNF08` (não funcionais, já mapeados à ISO/IEC 25010). A seção 5 lista os códigos de erro da API.
- Em divergência entre o código e os requisitos, **valem os requisitos**.

## 3. Stack

| Parte | Tecnologia | Módulos |
|---|---|---|
| Backend (`backend/`) | Node 22.12+, Express 4, SQLite (better-sqlite3 12.11.1), JWT (jsonwebtoken), bcryptjs | CommonJS (`require`) |
| Frontend (`frontend/`) | React 18, React Router 7, Vite 7 | ES Modules (`import`) |
| Repositório | npm workspaces (`backend`, `frontend`) | |

JavaScript puro, sem TypeScript.

## 4. Arquitetura

```
clinica-plus/
├── backend/src/
│   ├── domain/        regras de negócio puras, sem banco nem HTTP
│   │   ├── validacoes.js   CPF, e-mail, senha, CRM, idade
│   │   ├── agenda.js       grade semanal, sobreposição, geração de horários
│   │   └── consultas.js    máquina de estados, antecedência, limites, suspensão, preço
│   ├── services/      casos de uso: regras + repositórios (criarServicos(db))
│   ├── repositories/  acesso ao SQLite (SQL parametrizado)
│   ├── routes/        rotas REST em /api/*
│   ├── middleware/    autenticação JWT, perfis, tratamento de erros
│   ├── db/            connection.js (abrirBanco, limparBanco), schema.sql, seed.js (semear)
│   ├── utils/         clock.js (relógio), datas.js, errors.js
│   ├── app.js         criarApp({ db }): cria o app Express sem abrir porta
│   └── server.js      sobe o app na porta 3000
├── frontend/src/
│   ├── api/           cliente HTTP (client.js) e funções por recurso (index.js)
│   ├── contexts/      AuthContext (sessão, token, expiração), ToastContext (avisos)
│   ├── hooks/         useCarregar, useMensagem
│   ├── components/    Layout, RotaProtegida, TabelaConsultas, SeletorHorarios, EditorGrade, EditorBloqueios, diálogos
│   ├── pages/         login, cadastro e telas de paciente, médico e recepção
│   ├── utils/         formatadores.js (moeda, data, status)
│   └── App.jsx        rotas protegidas por perfil
└── docs/REQUISITOS.md
```

Fluxo de uma ação: página → `api/` → `fetch` → rota Express → middleware de autenticação → serviço → regras do `domain/` + repositório → SQLite.

### API

| Método | Rota | Quem |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/registro` | público |
| GET | `/api/auth/me` | autenticado |
| GET / POST | `/api/especialidades` | todos / recepção |
| GET / POST | `/api/medicos` | todos / recepção |
| GET / PUT | `/api/medicos/:id/disponibilidades` | todos / médico dono ou recepção |
| GET / POST / DELETE | `/api/medicos/:id/bloqueios[/:bloqueioId]` | médico dono ou recepção |
| GET | `/api/medicos/:id/horarios?data=AAAA-MM-DD` | autenticado |
| GET / POST | `/api/pacientes` | recepção |
| GET | `/api/pacientes/:id` | o próprio paciente ou recepção |
| GET / POST | `/api/consultas` | conforme perfil |
| GET | `/api/consultas/:id` | dono ou recepção |
| POST | `/api/consultas/:id/confirmar` · `cancelar` · `remarcar` · `realizar` · `falta` | conforme regra |
| PATCH | `/api/admin/usuarios/:id/ativo` | recepção |
| GET | `/api/admin/relatorios/resumo?dataInicio=&dataFim=` | recepção |
| GET | `/api/saude` | público |

## 5. Convenções

- Código, nomes e mensagens em português.
- Datas e horas locais no formato `AAAA-MM-DD HH:mm`. Valores monetários em centavos (inteiros).
- Erros da API em JSON: `{ "erro": { "codigo": "...", "mensagem": "..." } }`, com os códigos da seção 5 de `docs/REQUISITOS.md`. Nunca expõem stack trace.
- Frontend: sucesso aparece como toast (`.toast[data-tipo="sucesso"]`), erro aparece inline (`role="alert"`). Cancelamento pelo paciente usa o diálogo `#cancelar-confirmar` (não usa `window.confirm`).

## 6. Como rodar

```bash
npm install          # instala backend e frontend
npm run reset-db     # cria backend/data/clinica.db com os dados de exemplo
npm run dev          # API em http://localhost:3000/api e frontend em http://localhost:5173
```

| Variável (backend) | Para que serve |
|---|---|
| `PORT` | Porta da API (padrão 3000) |
| `CLINICA_DB` | Caminho do banco (`:memory:` para um banco descartável) |
| `CLINICA_AGORA` | Fixa o "agora" do servidor, ex.: `2026-10-19 08:00` |
| `JWT_SECRET` | Segredo do token |
| `CORS_ORIGINS` | Origens autorizadas (padrão `http://localhost:5173`) |

No frontend, `VITE_API_URL` define o endereço da API (padrão `http://localhost:3000/api`).

### Dados de exemplo (`semear`)

Senha de todos: `Senha123`.

| Perfil | Nome | E-mail | Detalhes |
|---|---|---|---|
| RECEPCAO | Rita Recepção | recepcao@clinica.com | |
| MEDICO | Dr. Carlos Almeida | carlos@clinica.com | Clínica Geral (R$ 150,00), 30 min, seg–sex 08–12 e 14–18 |
| MEDICO | Dra. Beatriz Souza | beatriz@clinica.com | Cardiologia (R$ 300,00), 45 min, seg/qua/sex 09–15 |
| MEDICO | Dr. Eduardo Lima | eduardo@clinica.com | Dermatologia (R$ 250,00), 30 min, ter/qui 13–19 |
| MEDICO | Dra. Fernanda Rocha | fernanda@clinica.com | Pediatria (R$ 200,00), 15 min, seg–sex 07–11 e sáb 08–12 |
| PACIENTE | Ana Pereira | ana@email.com | nascida em 1990-05-14 |
| PACIENTE | João Santos | joao@email.com | nascido em 1958-02-03 (idoso, desconto da RN23) |
| PACIENTE | Lucas Oliveira | lucas@email.com | 10 anos, responsável Marta Oliveira |

Não há consultas no banco inicial. Os ids seguem a ordem de criação (especialidades 1–4, médicos 1–4, pacientes 1–3), mas prefira obtê-los pelos retornos de `semear`, dos serviços ou da API.

## 7. Testes

### 7.1 Ferramentas

O ambiente de testes já tem estas bibliotecas instaladas e configuradas. Não use outras e não crie arquivos de configuração (`jest.config`, `vitest.config`, `playwright.config`, `package.json`).

| Onde | Biblioteca | Versão | Uso |
|---|---|---|---|
| Backend | `jest` | 30 | `testEnvironment: node`. Globais `describe`, `test`, `expect`, `beforeEach`. CommonJS. |
| Backend | `supertest` | 7 | `const request = require('supertest')` |
| Frontend | `vitest` | 5 | Ambiente `jsdom`. Importe explicitamente: `import { describe, test, expect, vi } from 'vitest'`. |
| Frontend | `@testing-library/react` | 16 | `render`, `screen`, `waitFor`, `within` |
| Frontend | `@testing-library/user-event` | 14 | |
| Frontend | `@testing-library/jest-dom` | 7 | Matchers como `toBeInTheDocument` já registrados |
| E2E | `@playwright/test` | 1.64 | `import { test, expect } from '@playwright/test'`. `baseURL` = `http://localhost:5173`. Chromium. |

Também podem ser usados os módulos nativos do Node e as dependências do próprio projeto (`jsonwebtoken`, `bcryptjs`, `better-sqlite3`, `react`, `react-router-dom`).

### 7.2 Onde gravar

Caminhos a partir da raiz do repositório. Importe o código do sistema com caminhos relativos.

| Nível | Pasta | Extensão | Exemplo de import |
|---|---|---|---|
| unitário (backend) | `backend/__testes__/unitario/` | `.test.js` | `require('../../src/domain/agenda')` |
| integração (backend) | `backend/__testes__/integracao/` | `.test.js` | `require('../../src/db/connection')` |
| API | `backend/__testes__/api/` | `.test.js` | `require('../../src/app')` |
| unitário (frontend) | `frontend/__testes__/unitario/` | `.test.js` ou `.test.jsx` | `import { formatarMoeda } from '../../src/utils/formatadores'` |
| integração (frontend) | `frontend/__testes__/integracao/` | `.test.jsx` | `import { StatusBadge } from '../../src/components/StatusBadge'` |
| E2E | `e2e/` | `.spec.js` | — |

Arquivos por assunto, em minúsculas com hífens (ex.: `backend/__testes__/api/consultas-agendamento.test.js`).

### 7.3 Ganchos de testabilidade

- **Banco:** `abrirBanco(':memory:')` (`backend/src/db/connection.js`) cria um banco novo em memória com o schema. `semear(db)` (`backend/src/db/seed.js`) popula com os dados de exemplo e retorna `{ medicos, pacientes }`. `criarServicos(db)` (`backend/src/services/index.js`) devolve serviços e repositórios ligados ao banco.
- **App sem porta:** `criarApp({ db })` (`backend/src/app.js`) devolve o app Express pronto para o Supertest. `app.locals.servicos` expõe os serviços.
- **Relógio:** o sistema obtém "agora" por `clock.agora()` (`backend/src/utils/clock.js`). Em testes de backend, fixe com `clock.definirAgora(new Date('2026-10-19T08:00:00'))` e restaure com `clock.definirAgora(null)`. Fixe o relógio **antes** de `semear(db)`, que usa a data para calcular a idade do paciente menor.
- **Interface:** campos com `<label>` associado (use `getByLabel`) e `id` estável nos elementos-chave (`#login-email`, `#login-senha`, `#login-entrar`, `#agendar-confirmar`, `tr[data-consulta-id]`, `[data-status]`).

### 7.4 Ambiente de execução

| Item | Valor |
|---|---|
| API (E2E) | http://localhost:3000/api |
| Frontend (E2E) | http://localhost:5173 |
| Banco nos E2E | Recriado com os dados de exemplo antes de cada arquivo `.spec.js`. Os testes de um mesmo arquivo rodam em sequência e compartilham o banco. |
| Relógio nos E2E | `2026-10-19 08:00` (segunda-feira), fixo. Não dá para mudar durante o E2E. |
| Token no frontend | Guardado no `localStorage` (ver `api/client.js` e `AuthContext.jsx`) |

Os testes são executados por um script externo, em uma cópia limpa do repositório.

### 7.5 Restrições para agentes

- Escreva arquivos **somente** nas pastas da seção 7.2. Não altere código, configuração, `docs/`, este `SPEC.md` nem as skills em `.agents/`.
- **Não execute comandos**: não rode testes, não instale pacotes, não suba servidores. As dependências não estão instaladas neste repositório.
- Não use a rede externa.

### 7.6 Atributos de qualidade no Clínica+

| Atributo ISO/IEC 25010 | Onde aparece |
|---|---|
| Adequação funcional | RN01–RN30: regras de agenda, valores, máquina de estados |
| Segurança | RN04, RN30, RNF01–RNF03: hash de senha, JWT, 401/403, injeção |
| Confiabilidade | RNF04: entradas malformadas, erros em JSON sem stack trace, estado consistente após erro |
| Usabilidade | RNF06: mensagens em português, rótulos, botões desabilitados, foco, teclado |
| Eficiência de desempenho | RNF05: tempo de resposta com muitas consultas na base |
| Compatibilidade | Contrato API ↔ frontend, formato JSON, CORS, RNF08 |
| Manutenibilidade | RNF07: regras puras sem banco ou HTTP, relógio injetável |

---

<!-- ===== docs/REQUISITOS.md (base de teste) ===== -->

# Clínica+ — Especificação de Requisitos

Sistema web de agendamento de consultas médicas. Esta especificação é a **base de teste** do experimento: os casos de teste gerados pelos LLMs devem ser derivados dela.

Convenções:
- Datas e horas são locais (fuso da clínica), no formato `AAAA-MM-DD HH:mm`.
- Valores monetários são armazenados em centavos (inteiros).
- "Consulta ativa" = consulta com status `AGENDADA` ou `CONFIRMADA`.
- "Agora" é o relógio do servidor (pode ser fixado pela variável `CLINICA_AGORA` para testes).

## 1. Perfis de usuário

| Perfil | Quem é | O que faz |
|---|---|---|
| `PACIENTE` | Pessoa atendida | Cadastra-se, agenda, confirma, remarca e cancela as **próprias** consultas |
| `MEDICO` | Profissional de saúde | Define sua grade de horários e bloqueios, vê a própria agenda, registra atendimento e falta |
| `RECEPCAO` | Atendente / administrador | Cadastra médicos, especialidades e pacientes, opera a agenda de qualquer paciente, emite relatórios |

## 2. Requisitos funcionais

### RF01 — Autenticação
- RF01.1 O usuário faz login com e-mail e senha e recebe um token JWT válido por **8 horas**.
- RF01.2 Rotas da API (exceto login, cadastro de paciente e saúde) exigem token válido no cabeçalho `Authorization: Bearer <token>`.
- RF01.3 `GET /api/auth/me` retorna os dados do usuário logado.

### RF02 — Cadastro de paciente
- RF02.1 Qualquer pessoa pode se cadastrar como paciente (auto-cadastro).
- RF02.2 A recepção também pode cadastrar pacientes.
- RF02.3 Campos: nome, e-mail, senha, CPF, data de nascimento, telefone, nome do responsável (condicional, ver RN06).

### RF03 — Especialidades
- RF03.1 A recepção cadastra especialidades com nome e preço base da consulta.
- RF03.2 Qualquer usuário autenticado lista as especialidades.

### RF04 — Cadastro de médico
- RF04.1 Somente a recepção cadastra médicos (nome, e-mail, senha, CRM, especialidade, duração da consulta).

### RF05 — Grade de disponibilidade
- RF05.1 O médico (ou a recepção) define a grade semanal: blocos com dia da semana, hora de início e hora de fim.
- RF05.2 Salvar a grade substitui a grade anterior por inteiro.

### RF06 — Bloqueios de agenda
- RF06.1 O médico (ou a recepção) cria bloqueios por período de datas (férias, congresso), com motivo.
- RF06.2 O médico (ou a recepção) remove bloqueios.

### RF07 — Consulta de horários livres
- RF07.1 Dado um médico e uma data, o sistema lista os horários livres para agendamento.

### RF08 — Agendamento
- RF08.1 O paciente agenda para si; a recepção agenda para qualquer paciente.
- RF08.2 O sistema calcula e grava o valor da consulta no momento do agendamento.

### RF09 — Ciclo de vida da consulta
- RF09.1 Confirmar presença.
- RF09.2 Cancelar, com motivo.
- RF09.3 Remarcar para outro horário com o mesmo médico.
- RF09.4 Registrar atendimento realizado, com observações.
- RF09.5 Registrar falta do paciente.

### RF10 — Listagens
- RF10.1 O paciente vê somente as próprias consultas.
- RF10.2 O médico vê somente as consultas da própria agenda.
- RF10.3 A recepção vê todas, com filtros por data, status, médico e paciente.

### RF11 — Relatório
- RF11.1 A recepção obtém, para um período, o total de consultas por status, a taxa de faltas por médico e o faturamento das consultas realizadas.

## 3. Regras de negócio

### Contas e cadastro
- **RN01** E-mail deve ter formato válido e ser único no sistema.
- **RN02** Senha deve ter no mínimo 8 caracteres, com pelo menos uma letra e um número.
- **RN03** CPF deve ser válido (11 dígitos, dígitos verificadores corretos, não pode ter todos os dígitos iguais) e único. Pode ser enviado com ou sem pontuação; é gravado só com dígitos.
- **RN04** Após **5 tentativas de login erradas seguidas**, a conta fica bloqueada por **15 minutos**. Um login correto zera o contador. Durante o bloqueio, até a senha correta é recusada.
- **RN05** Data de nascimento não pode ser futura nem indicar idade acima de 130 anos.
- **RN06** Paciente menor de 18 anos deve informar o nome do responsável.
- **RN07** CRM no formato `NNNN/UF` a `NNNNNN/UF` (4 a 6 dígitos, barra, UF brasileira válida) e único.
- **RN08** Duração da consulta do médico: entre 15 e 60 minutos, múltiplo de 15. Padrão: 30.
- **RN09** Nome de especialidade é único; preço base maior que zero.

### Grade e bloqueios
- **RN10** Blocos de disponibilidade: dia da semana de 0 (domingo) a 6 (sábado); horários entre `07:00` e `20:00`; início antes do fim; minutos múltiplos de 15.
- **RN11** Blocos do mesmo dia não podem se sobrepor (encostar é permitido: 08:00–12:00 e 12:00–14:00).
- **RN12** Bloqueio: data final não pode ser anterior à inicial; não pode começar no passado.
- **RN13** Não é permitido criar bloqueio em período que já tenha consulta ativa do médico.

### Horários livres
- **RN14** Os horários são gerados a partir dos blocos do dia da semana, em passos iguais à duração da consulta do médico, desde que caibam inteiros no bloco.
- **RN15** São excluídos: horários que conflitam com consulta ativa do médico; datas dentro de bloqueio; horários que não respeitam a antecedência mínima (RN16).

### Agendamento
- **RN16** Antecedência mínima de **2 horas** e máxima de **60 dias**.
- **RN17** O horário deve ser exatamente um dos horários livres do médico (RN14 e RN15).
- **RN18** O paciente não pode ter outra consulta ativa que se sobreponha ao mesmo horário (com qualquer médico).
- **RN19** O paciente pode ter no máximo **3 consultas ativas futuras** e no máximo **1 consulta ativa futura por especialidade**.
- **RN20** Suspensão por faltas: paciente com **3 ou mais faltas nos últimos 90 dias** fica impedido de agendar até **30 dias após a última falta**. A regra vale também quando a recepção agenda.
- **RN21** Paciente com conta inativa não pode agendar; médico inativo não recebe agendamentos.

### Valor da consulta
- **RN22** Valor = preço base da especialidade do médico.
- **RN23** Paciente com **60 anos ou mais** na data da consulta tem **10% de desconto** (arredondado para o centavo mais próximo).
- **RN24** **Retorno gratuito**: se o paciente teve consulta `REALIZADA` com o **mesmo médico** nos **30 dias** anteriores ao novo horário, a nova consulta custa zero. Cada consulta realizada dá direito a **um** retorno gratuito (consultas canceladas devolvem o direito). Retorno e desconto de idade não se somam: retorno prevalece.

### Ciclo de vida (máquina de estados)

```
AGENDADA ──► CONFIRMADA ──► REALIZADA
   │  │           │  │
   │  │           │  └────► FALTA
   │  │           └───────► CANCELADA
   │  ├──────────────────► REALIZADA / FALTA
   │  └──────────────────► CANCELADA
```
`REALIZADA`, `FALTA` e `CANCELADA` são estados finais.

- **RN25** Confirmação: só de consulta `AGENDADA`, pelo próprio paciente ou pela recepção, nas **48 horas** anteriores ao início (e antes do início).
- **RN26** Cancelamento pelo paciente: até **24 horas** antes do início. Recepção: até o início. Médico: até o início, apenas consultas da própria agenda. Motivo obrigatório para recepção e médico.
- **RN27** Remarcação: pelo paciente ou recepção, até **24 horas** antes do início atual, no máximo **2 vezes** por consulta. O novo horário segue RN16 a RN19 (desconsiderando a própria consulta) e a consulta volta para `AGENDADA`. O valor é recalculado.
- **RN28** Atendimento realizado: só pelo médico da consulta, a partir do horário de início.
- **RN29** Falta: pelo médico da consulta ou pela recepção, a partir de **15 minutos** após o início.

### Autorização
- **RN30** Paciente só acessa os próprios dados e consultas; médico só a própria agenda, grade e bloqueios. Acesso a recurso de outro usuário retorna `403`; recurso inexistente retorna `404`.

## 4. Requisitos não funcionais (mapeados à ISO/IEC 25010)

| Id | Característica | Requisito |
|---|---|---|
| RNF01 | Segurança — confidencialidade | Senhas armazenadas com hash bcrypt; nunca retornadas pela API. |
| RNF02 | Segurança — autenticidade | Token JWT assinado, expira em 8h; token ausente/inválido → `401`. |
| RNF03 | Segurança — integridade | Consultas SQL parametrizadas; entrada validada no servidor. |
| RNF04 | Confiabilidade — tolerância a falhas | Erros retornam JSON `{ erro: { codigo, mensagem } }`, sem expor stack trace. |
| RNF05 | Eficiência de desempenho | Listagem de horários e agendamento respondem em menos de 500 ms com até 10 mil consultas na base. |
| RNF06 | Usabilidade | Mensagens de erro em português, legíveis pelo usuário final. |
| RNF07 | Manutenibilidade — testabilidade | Regras de negócio puras em `src/domain`, sem dependência de banco ou HTTP; relógio injetável. |
| RNF08 | Compatibilidade | Funciona nas versões atuais de Chrome, Firefox e Edge. |

## 5. Códigos de erro da API

| HTTP | `codigo` | Quando |
|---|---|---|
| 400 | `VALIDACAO` | Dado de entrada inválido |
| 401 | `NAO_AUTENTICADO` | Token ausente, inválido ou expirado; credenciais erradas |
| 403 | `SEM_PERMISSAO` | Perfil ou dono do recurso não autorizado |
| 404 | `NAO_ENCONTRADO` | Recurso inexistente |
| 409 | `CONFLITO` | Duplicidade (e-mail, CPF, CRM) ou conflito de agenda |
| 422 | `REGRA_NEGOCIO` | Violação de regra de negócio (antecedência, limites, transição de status inválida etc.) |
| 423 | `CONTA_BLOQUEADA` | Conta bloqueada por tentativas de login (RN04) |
