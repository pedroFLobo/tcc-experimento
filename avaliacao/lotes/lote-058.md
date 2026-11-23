# lote-058

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 18 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0954 | CT-INT-515 | renders the specialty form | passou |  |
| deepseek-0955 | CT-INT-516 | lists specialties with prices | passou |  |
| deepseek-0956 | CT-INT-517 | converts the price to cents | passou |  |
| deepseek-0957 | CT-INT-518 | shows the specialty creation toast | passou |  |
| deepseek-0958 | CT-INT-519 | shows the specialty creation error | passou |  |
| deepseek-0959 | CT-INT-520 | clears the specialty form after creating | passou |  |
| deepseek-0960 | CT-INT-521 | shows the specialty skeleton | passou |  |
| deepseek-0961 | CT-INT-522 | explains the senior discount | passou |  |
| deepseek-0962 | CT-INT-523 | shows progress while creating a specialty | passou |  |
| deepseek-0963 | CT-INT-524 | renders the doctor form | passou |  |
| deepseek-0964 | CT-INT-525 | creates a doctor with numeric ids | passou |  |
| deepseek-0965 | CT-INT-526 | shows the doctor creation toast | passou |  |
| deepseek-0966 | CT-INT-527 | shows the doctor creation error | passou |  |
| deepseek-0967 | CT-INT-528 | lists the medical team | passou |  |
| deepseek-0968 | CT-INT-529 | deactivates a doctor | passou |  |
| deepseek-0969 | CT-INT-530 | opens grade and blocks for the chosen doctor | passou |  |
| deepseek-0970 | CT-INT-531 | shows the doctor count | passou |  |
| deepseek-0971 | CT-INT-532 | opens management from the row action | passou |  |

## Arquivo: frontend/__testes__/integracao/recepcao-catalogo.test.jsx

```js
// Integração do catálogo da clínica: especialidades, equipe médica e gestão de agenda (RF02, RF03, RF06, RF10).
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../src/api', () => ({
  authApi: { login: vi.fn(), registrar: vi.fn(), me: vi.fn() },
  especialidadesApi: { listar: vi.fn(), criar: vi.fn() },
  medicosApi: { listar: vi.fn(), criar: vi.fn(), horarios: vi.fn(), grade: vi.fn(), salvarGrade: vi.fn(), bloqueios: vi.fn(), criarBloqueio: vi.fn(), removerBloqueio: vi.fn() },
  pacientesApi: { listar: vi.fn(), criar: vi.fn() },
  consultasApi: { listar: vi.fn(), agendar: vi.fn(), confirmar: vi.fn(), cancelar: vi.fn(), remarcar: vi.fn(), realizar: vi.fn(), falta: vi.fn() },
  adminApi: { definirAtivo: vi.fn(), resumo: vi.fn() },
}));

import { adminApi, especialidadesApi, medicosApi } from '../../src/api';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { EspecialidadesPage } from '../../src/pages/recepcao/EspecialidadesPage';
import { MedicosPage } from '../../src/pages/recepcao/MedicosPage';

const ESPECIALIDADES = [
  { id: 1, nome: 'Clínica Geral', precoCentavos: 15000 },
  { id: 2, nome: 'Cardiologia', precoCentavos: 30000 },
];

const MEDICOS = [
  { id: 1, usuarioId: 3, nome: 'Dr. Carlos Almeida', crm: '111111/SP', especialidadeNome: 'Clínica Geral', duracaoConsultaMin: 30, ativo: true },
  { id: 2, usuarioId: 4, nome: 'Dra. Beatriz Souza', crm: '222222/RJ', especialidadeNome: 'Cardiologia', duracaoConsultaMin: 45, ativo: false },
];

function montar(componente) {
  return render(
    <MemoryRouter>
      <ToastProvider>{componente}</ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  especialidadesApi.listar.mockResolvedValue(ESPECIALIDADES.map((e) => ({ ...e })));
  especialidadesApi.criar.mockResolvedValue({ id: 5, nome: 'Ortopedia', precoCentavos: 25000 });
  medicosApi.listar.mockResolvedValue(MEDICOS.map((m) => ({ ...m })));
  medicosApi.criar.mockResolvedValue({ id: 9, usuarioId: 12, nome: 'Dr. Novo', ativo: true });
  medicosApi.grade.mockResolvedValue([]);
  medicosApi.bloqueios.mockResolvedValue([]);
  adminApi.definirAtivo.mockResolvedValue(null);
});

afterEach(cleanup);

describe('EspecialidadesPage', () => {
  /**
   * @caso CT-INT-515
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.1
   * @objetivo Oferecer nome e preço para cadastrar uma especialidade
   * @resultadoEsperado Os campos Nome e Preço (R$) estão presentes
   */
  test('renders the specialty form', () => {
    montar(<EspecialidadesPage />);
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByLabelText('Preço (R$)')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-516
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.2
   * @objetivo Exibir o catálogo de especialidades com preço base
   * @resultadoEsperado Clínica Geral e Cardiologia aparecem com seus preços
   */
  test('lists specialties with prices', async () => {
    montar(<EspecialidadesPage />);
    await waitFor(() => expect(document.querySelectorAll('#tabela-especialidades tbody tr')).toHaveLength(2));
    const linhas = document.querySelectorAll('#tabela-especialidades tbody tr');
    expect(linhas[0]).toHaveTextContent('Clínica Geral');
    expect(linhas[0].textContent.replace(/\u00a0/g, ' ')).toContain('R$ 150,00');
  });

  /**
   * @caso CT-INT-517
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF03.1, RN09
   * @objetivo Converter o preço digitado em reais para centavos
   * @resultadoEsperado criar recebe precoCentavos 25050 para 250,50
   */
  test('converts the price to cents', async () => {
    const usuario = userEvent.setup();
    montar(<EspecialidadesPage />);
    await usuario.type(screen.getByLabelText('Nome'), 'Ortopedia');
    await usuario.type(screen.getByLabelText('Preço (R$)'), '250.50');
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }));
    await waitFor(() => expect(especialidadesApi.criar).toHaveBeenCalledWith({ nome: 'Ortopedia', precoCentavos: 25050 }));
  });

  /**
   * @caso CT-INT-518
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar a especialidade criada com o preço formatado
   * @resultadoEsperado O toast informa Ortopedia por R$ 250,00
   */
  test('shows the specialty creation toast', async () => {
    const usuario = userEvent.setup();
    montar(<EspecialidadesPage />);
    await usuario.type(screen.getByLabelText('Nome'), 'Ortopedia');
    await usuario.type(screen.getByLabelText('Preço (R$)'), '250');
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }));
    expect(await screen.findByText('Especialidade cadastrada')).toBeInTheDocument();
    expect(screen.getByText(/Ortopedia disponível por/).textContent.replace(/\u00a0/g, ' ')).toContain('R$ 250,00');
  });

  /**
   * @caso CT-INT-519
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Explicar por que a especialidade foi recusada
   * @resultadoEsperado O erro da API aparece em um alerta
   */
  test('shows the specialty creation error', async () => {
    const usuario = userEvent.setup();
    especialidadesApi.criar.mockRejectedValue(new Error('Especialidade já cadastrada.'));
    montar(<EspecialidadesPage />);
    await usuario.type(screen.getByLabelText('Nome'), 'Clínica Geral');
    await usuario.type(screen.getByLabelText('Preço (R$)'), '150');
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Especialidade já cadastrada.');
  });

  /**
   * @caso CT-INT-520
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF03.1
   * @objetivo Limpar o formulário após cadastrar
   * @resultadoEsperado Os campos de nome e preço voltam a ficar vazios
   */
  test('clears the specialty form after creating', async () => {
    const usuario = userEvent.setup();
    montar(<EspecialidadesPage />);
    await usuario.type(screen.getByLabelText('Nome'), 'Ortopedia');
    await usuario.type(screen.getByLabelText('Preço (R$)'), '250');
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }));
    await waitFor(() => expect(screen.getByLabelText('Nome')).toHaveValue(''));
    expect(screen.getByLabelText('Preço (R$)')).toHaveValue(null);
  });

  /**
   * @caso CT-INT-521
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Mostrar esqueleto enquanto o catálogo carrega
   * @resultadoEsperado Três linhas decorativas aparecem na tabela
   */
  test('shows the specialty skeleton', () => {
    especialidadesApi.listar.mockReturnValue(new Promise(() => {}));
    montar(<EspecialidadesPage />);
    expect(document.querySelectorAll('#tabela-especialidades tbody tr[aria-hidden="true"]')).toHaveLength(3);
  });

  /**
   * @caso CT-INT-522
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Explicar o desconto de idoso sobre o preço base
   * @resultadoEsperado A descrição cita o desconto de 10% para 60+
   */
  test('explains the senior discount', () => {
    montar(<EspecialidadesPage />);
    expect(screen.getByText(/Pacientes com 60\+ têm 10% de desconto/)).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-523
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Indicar progresso durante o cadastro da especialidade
   * @resultadoEsperado O botão mostra "Salvando..." e fica desabilitado
   */
  test('shows progress while creating a specialty', async () => {
    const usuario = userEvent.setup();
    especialidadesApi.criar.mockReturnValue(new Promise(() => {}));
    montar(<EspecialidadesPage />);
    await usuario.type(screen.getByLabelText('Nome'), 'Ortopedia');
    await usuario.type(screen.getByLabelText('Preço (R$)'), '250');
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }));
    expect(await screen.findByRole('button', { name: 'Salvando...' })).toBeDisabled();
  });
});

describe('MedicosPage', () => {
  /**
   * @caso CT-INT-524
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04.1
   * @objetivo Coletar os dados profissionais do novo médico
   * @resultadoEsperado Nome, e-mail, senha, CRM, especialidade e duração estão presentes
   */
  test('renders the doctor form', () => {
    montar(<MedicosPage />);
    expect(screen.getByLabelText(/Nome/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha inicial/)).toBeInTheDocument();
    expect(screen.getByLabelText(/CRM/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Especialidade/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duração da consulta/)).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-525
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF04.1
   * @objetivo Cadastrar o médico com especialidade e duração numéricas
   * @resultadoEsperado medicosApi.criar recebe especialidadeId e duracaoConsultaMin numéricos
   */
  test('creates a doctor with numeric ids', async () => {
    const usuario = userEvent.setup();
    montar(<MedicosPage />);
    await screen.findByRole('option', { name: 'Clínica Geral' });
    await usuario.type(screen.getByLabelText(/Nome/), 'Dr. Novo');
    await usuario.type(screen.getByLabelText(/E-mail/), 'novo@clinica.com');
    await usuario.type(screen.getByLabelText(/Senha inicial/), 'Senha123');
    await usuario.type(screen.getByLabelText(/CRM/), '333333/MG');
    await usuario.selectOptions(screen.getByLabelText(/Especialidade/), '1');
    await usuario.selectOptions(screen.getByLabelText(/Duração da consulta/), '45');
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar médico' }));
    await waitFor(() => expect(medicosApi.criar).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Dr. Novo',
      crm: '333333/MG',
      especialidadeId: 1,
      duracaoConsultaMin: 45,
    })));
  });

  /**
   * @caso CT-INT-526
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar o cadastro e orientar a próxima etapa
   * @resultadoEsperado O toast informa que o médico foi adicionado e pede a grade
   */
  test('shows the doctor creation toast', async () => {
    const usuario = userEvent.setup();
    montar(<MedicosPage />);
    await screen.findByRole('option', { name: 'Clínica Geral' });
    await usuario.type(screen.getByLabelText(/Nome/), 'Dr. Novo');
    await usuario.type(screen.getByLabelText(/E-mail/), 'novo@clinica.com');
    await usuario.type(screen.getByLabelText(/Senha inicial/), 'Senha123');
    await usuario.type(screen.getByLabelText(/CRM/), '333333/MG');
    await usuario.selectOptions(screen.getByLabelText(/Especialidade/), '1');
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar médico' }));
    expect(await screen.findByText(/foi adicionado à equipe/)).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-527
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04, RN07
   * @objetivo Explicar a recusa por CRM repetido
   * @resultadoEsperado O erro da API aparece em um alerta
   */
  test('shows the doctor creation error', async () => {
    const usuario = userEvent.setup();
    medicosApi.criar.mockRejectedValue(new Error('CRM já cadastrado.'));
    montar(<MedicosPage />);
    await screen.findByRole('option', { name: 'Clínica Geral' });
    await usuario.type(screen.getByLabelText(/Nome/), 'Dr. Novo');
    await usuario.type(screen.getByLabelText(/E-mail/), 'novo@clinica.com');
    await usuario.type(screen.getByLabelText(/Senha inicial/), 'Senha123');
    await usuario.type(screen.getByLabelText(/CRM/), '111111/SP');
    await usuario.selectOptions(screen.getByLabelText(/Especialidade/), '1');
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar médico' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('CRM já cadastrado.');
  });

  /**
   * @caso CT-INT-528
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04.1
   * @objetivo Exibir a equipe com CRM, especialidade, duração e situação
   * @resultadoEsperado A linha do Dr. Carlos mostra 111111/SP, Clínica Geral, 30 min e Ativo
   */
  test('lists the medical team', async () => {
    montar(<MedicosPage />);
    await waitFor(() => expect(document.querySelectorAll('#tabela-medicos tbody tr[data-usuario-id]')).toHaveLength(2));
    const linha = document.querySelector('tr[data-usuario-id="3"]');
    expect(linha).toHaveTextContent('111111/SP');
    expect(linha).toHaveTextContent('Clínica Geral');
    expect(linha).toHaveTextContent('30 min');
    expect(linha).toHaveTextContent('Ativo');
  });

  /**
   * @caso CT-INT-529
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Desativar um médico da equipe
   * @resultadoEsperado adminApi.definirAtivo recebe usuarioId e false
   */
  test('deactivates a doctor', async () => {
    const usuario = userEvent.setup();
    montar(<MedicosPage />);
    await waitFor(() => expect(document.querySelector('tr[data-usuario-id="3"]')).toBeInTheDocument());
    await usuario.click(within(document.querySelector('tr[data-usuario-id="3"]')).getByRole('button', { name: 'Desativar' }));
    expect(adminApi.definirAtivo).toHaveBeenCalledWith(3, false);
  });

  /**
   * @caso CT-INT-530
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF05.1, RF06.1
   * @objetivo Abrir grade e bloqueios do médico escolhido
   * @resultadoEsperado A seleção do médico carrega as duas seções de gestão
   */
  test('opens grade and blocks for the chosen doctor', async () => {
    const usuario = userEvent.setup();
    montar(<MedicosPage />);
    await waitFor(() => expect(document.querySelector('tr[data-usuario-id="3"]')).toBeInTheDocument());
    await usuario.selectOptions(screen.getByLabelText('Médico'), '1');
    expect(await screen.findByRole('heading', { name: 'Grade semanal' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bloqueios' })).toBeInTheDocument();
    await waitFor(() => expect(medicosApi.grade).toHaveBeenCalledWith(1));
    expect(medicosApi.bloqueios).toHaveBeenCalledWith(1);
  });

  /**
   * @caso CT-INT-531
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF04.1, RNF06
   * @objetivo Informar o tamanho da equipe
   * @resultadoEsperado O texto mostra "2 médico(s)."
   */
  test('shows the doctor count', async () => {
    montar(<MedicosPage />);
    expect(await screen.findByText('2 médico(s).')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-532
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF05.1, RF06.1
   * @objetivo Abrir a gestão diretamente pelo botão da linha
   * @resultadoEsperado O seletor de gestão passa a apontar para o médico da linha
   */
  test('opens management from the row action', async () => {
    const usuario = userEvent.setup();
    montar(<MedicosPage />);
    await waitFor(() => expect(document.querySelector('tr[data-usuario-id="3"]')).toBeInTheDocument());
    await usuario.click(within(document.querySelector('tr[data-usuario-id="3"]')).getByRole('button', { name: 'Agenda' }));
    expect(screen.getByLabelText('Médico')).toHaveValue('1');
    await waitFor(() => expect(medicosApi.grade).toHaveBeenCalledWith(1));
  });
});
```
