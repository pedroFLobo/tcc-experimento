// Rubrica de avaliação dos casos de teste, usada pela ficha do painel humano e pelo RUBRICA.md.
// É a mesma rubrica do juiz (skills/juiz-casos-teste), com âncoras descritas para cada nível,
// no formato de escala ancorada em comportamentos (BARS).

export const ESCALA = [
  { nota: 10, sigla: 'MA', rotulo: 'Muito alto' },
  { nota: 8, sigla: 'A', rotulo: 'Alto' },
  { nota: 6, sigla: 'M', rotulo: 'Médio' },
  { nota: 4, sigla: 'B', rotulo: 'Baixo' },
  { nota: 2, sigla: 'MB', rotulo: 'Muito baixo' },
];

export const CRITERIOS_RUBRICA = [
  {
    id: 'aderencia',
    nome: 'Aderência',
    pergunta: 'O caso exercita de fato o atributo e o subatributo da ISO/IEC 25010 que declara, e o requisito que cita?',
    ancoras: {
      10: 'Verifica diretamente a característica declarada (ex.: segurança → acesso negado com 401/403 e o código de erro) e o requisito citado. O nível da pirâmide declarado confere com o que o teste faz.',
      6: 'Relação parcial: exercita o requisito, mas o atributo ou subatributo é discutível, ou o nível declarado não confere (ex.: "api" sem requisição HTTP).',
      2: 'Não há relação entre o que o teste faz e o atributo ou requisito declarados (ex.: "desempenho" sem nenhuma medição de tempo).',
    },
    base: ['ISO/IEC 25010:2023', 'ISO/IEC/IEEE 29119-3:2021', 'Azevedo et al. (2026)'],
  },
  {
    id: 'correcao',
    nome: 'Correção',
    pergunta: 'O resultado esperado e as asserções estão de acordo com a base de teste (REQUISITOS.md)?',
    ancoras: {
      10: 'Todos os valores esperados (prazos, limites, códigos HTTP, códigos de erro, valores) conferem com a especificação. Se o caso falhou, a falha revela um defeito do sistema, não do teste.',
      6: 'Essencialmente correto, mas com um detalhe errado ou uma suposição que a especificação não sustenta (ex.: mensagem de erro inventada).',
      2: 'O resultado esperado contradiz a especificação, ou o teste não roda por erro do próprio teste (erro de carga, import errado, API inexistente).',
    },
    base: ['Yuan et al. (2024)', 'Siddiq et al. (2024)', 'Schäfer et al. (2024)'],
  },
  {
    id: 'oraculo',
    nome: 'Oráculo',
    pergunta: 'As asserções são específicas o bastante para detectar um defeito real?',
    ancoras: {
      10: 'Asserções sobre valores exatos, códigos e estado final, incluindo efeitos colaterais (ex.: a consulta foi mesmo gravada ou cancelada). Um defeito plausível no código faria o teste falhar.',
      6: 'Verifica o principal (ex.: só o status HTTP), mas deixa de fora o corpo da resposta ou o estado final.',
      2: 'Sem asserção, asserção trivial (expect(true).toBe(true)), asserção fraca sobre o objeto inteiro (toBeTruthy) ou apenas "não lançou erro".',
    },
    base: ['Barr et al. (2015)', 'Just et al. (2014)', 'Papadakis et al. (2019)'],
  },
  {
    id: 'clareza',
    nome: 'Clareza',
    pergunta: 'Uma pessoa que não conhece o projeto entende o que é testado, com que dados e por que o caso passa ou falha?',
    ancoras: {
      10: 'Título, @objetivo e @resultadoEsperado coerentes com o código. Dados com significado, estrutura preparar-agir-verificar visível e nenhum test smell.',
      6: 'Compreensível com algum esforço: números mágicos, nomes genéricos ou um test smell leve.',
      2: 'Não se entende o propósito. Metadados ausentes ou contraditórios, ou vários test smells (lógica condicional, esperas fixas, asserções sem relação entre si).',
    },
    base: ['Daka et al. (2015)', 'van Deursen et al. (2001)', 'Peruma et al. (2020)', 'Meszaros (2007)'],
  },
  {
    id: 'relevancia',
    nome: 'Relevância',
    pergunta: 'O caso cobre um risco importante do Clínica+ e não repete outro caso do mesmo modelo?',
    ancoras: {
      10: 'Cobre um risco importante (regra de negócio, valor-limite, autorização, transição de estado) que nenhum outro caso do lote cobre.',
      6: 'Útil, mas cobre um caminho feliz já coberto por outro caso ou um risco menor.',
      2: 'Trivial (ex.: testa uma constante) ou praticamente idêntico a outro caso.',
    },
    base: ['ISO/IEC/IEEE 29119-4:2021', 'ISO/IEC/IEEE 29119-2:2021'],
  },
];

export const CAMPO_DEFEITO = {
  nome: 'Revela defeito do sistema?',
  opcoes: ['sim', 'não', 'não sei'],
  ajuda: 'Marque "sim" só quando o caso falhou e, lendo a especificação, o teste está certo e o sistema errado.',
};

export const REFERENCIAS = [
  ['Azevedo et al. (2026)', 'AZEVEDO et al. Can LLMs Write Your Tests? (completar autores e páginas conforme o artigo). In: Simpósio Brasileiro de Testes de Software Sistemático (SAST), 2026. Repositório: github.com/crescenciolima/VR-Testing.', 'Base do experimento: escala 2–10 e uso de LLM-as-a-Judge.'],
  ['ISO/IEC 25010:2023', 'ISO/IEC 25010:2023. Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model.', 'Atributos e subatributos de qualidade.'],
  ['ISO/IEC/IEEE 29119-2:2021', 'ISO/IEC/IEEE 29119-2:2021. Software and systems engineering — Software testing — Part 2: Test processes.', 'Teste baseado em risco (relevância).'],
  ['ISO/IEC/IEEE 29119-3:2021', 'ISO/IEC/IEEE 29119-3:2021. Software and systems engineering — Software testing — Part 3: Test documentation.', 'Campos de um caso de teste e rastreabilidade à base de teste.'],
  ['ISO/IEC/IEEE 29119-4:2021', 'ISO/IEC/IEEE 29119-4:2021. Software and systems engineering — Software testing — Part 4: Test techniques.', 'Partição de equivalência e valor-limite (relevância).'],
  ['Barr et al. (2015)', 'BARR, E. T.; HARMAN, M.; McMINN, P.; SHAHBAZ, M.; YOO, S. The Oracle Problem in Software Testing: A Survey. IEEE Transactions on Software Engineering, v. 41, n. 5, p. 507–525, 2015.', 'Definição de oráculo de teste.'],
  ['Just et al. (2014)', 'JUST, R. et al. Are mutants a valid substitute for real faults in software testing? In: FSE 2014, p. 654–665.', 'Mutantes como medida da força do oráculo.'],
  ['Papadakis et al. (2019)', 'PAPADAKIS, M. et al. Mutation Testing Advances: An Analysis and Survey. Advances in Computers, v. 112, p. 275–378, 2019.', 'Escore de mutação.'],
  ['Daka et al. (2015)', 'DAKA, E.; CAMPOS, J.; FRASER, G.; DORN, J.; WEIMER, W. Modeling Readability to Improve Unit Tests. In: ESEC/FSE 2015, p. 107–118.', 'Legibilidade de testes (clareza).'],
  ['van Deursen et al. (2001)', 'van DEURSEN, A.; MOONEN, L.; van den BERGH, A.; KOK, G. Refactoring Test Code. In: XP 2001, p. 92–95.', 'Catálogo original de test smells.'],
  ['Peruma et al. (2020)', 'PERUMA, A. et al. tsDetect: An Open Source Test Smells Detection Tool. In: ESEC/FSE 2020 (Demo), p. 1650–1654.', 'Detecção de test smells (clareza e métricas).'],
  ['Meszaros (2007)', 'MESZAROS, G. xUnit Test Patterns: Refactoring Test Code. Addison-Wesley, 2007.', 'Padrões e smells de teste; estrutura preparar-agir-verificar.'],
  ['Yuan et al. (2024)', 'YUAN, Z. et al. Evaluating and Improving ChatGPT for Unit Test Generation (No More Manual Tests?). Proceedings of the ACM on Software Engineering, v. 1, FSE, 2024.', 'Avaliação de testes gerados por LLM: correção, suficiência, legibilidade.'],
  ['Siddiq et al. (2024)', 'SIDDIQ, M. L. et al. Using Large Language Models to Generate JUnit Tests: An Empirical Study. In: EASE 2024, p. 313–322.', 'Taxa de compilação, correção, cobertura e test smells de testes gerados por LLM.'],
  ['Schäfer et al. (2024)', 'SCHÄFER, M.; NADI, S.; EGHBALI, A.; TIP, F. An Empirical Evaluation of Using Large Language Models for Automated Unit Test Generation. IEEE Transactions on Software Engineering, v. 50, n. 1, p. 85–105, 2024.', 'Testes que passam, cobertura e asserções (JavaScript).'],
  ['Wang et al. (2024)', 'WANG, J. et al. Software Testing With Large Language Models: Survey, Landscape, and Vision. IEEE Transactions on Software Engineering, v. 50, n. 4, p. 911–936, 2024.', 'Panorama de métricas usadas para avaliar LLMs em teste.'],
  ['Zheng et al. (2023)', 'ZHENG, L. et al. Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. In: NeurIPS 2023 (Datasets and Benchmarks).', 'Vieses do juiz (posição, verbosidade, autopreferência): cuidado ao interpretar as notas do juiz.'],
  ['Panickssery et al. (2024)', 'PANICKSSERY, A.; BOWMAN, S. R.; FENG, S. LLM Evaluators Recognize and Favor Their Own Generations. In: NeurIPS 2024.', 'Autopreferência: o juiz não pode ser da família de um modelo avaliado.'],
  ['Smith e Kendall (1963)', 'SMITH, P. C.; KENDALL, L. M. Retranslation of expectations: an approach to the construction of unambiguous anchors for rating scales. Journal of Applied Psychology, v. 47, n. 2, p. 149–155, 1963.', 'Escala com âncoras descritas (BARS).'],
  ['Cohen (1968)', 'COHEN, J. Weighted kappa: Nominal scale agreement with provision for scaled disagreement or partial credit. Psychological Bulletin, v. 70, n. 4, p. 213–220, 1968.', 'Concordância entre juiz e humano (kappa ponderado).'],
  ['Landis e Koch (1977)', 'LANDIS, J. R.; KOCH, G. G. The Measurement of Observer Agreement for Categorical Data. Biometrics, v. 33, n. 1, p. 159–174, 1977.', 'Interpretação do kappa.'],
  ['Inozemtseva e Holmes (2014)', 'INOZEMTSEVA, L.; HOLMES, R. Coverage is not strongly correlated with test suite effectiveness. In: ICSE 2014, p. 435–445.', 'Limite da cobertura como métrica isolada.'],
  ['Cohn (2009)', 'COHN, M. Succeeding with Agile: Software Development Using Scrum. Addison-Wesley, 2009.', 'Pirâmide de testes.'],
];
