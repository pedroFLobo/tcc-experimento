// Tabela de consultas: colunas, valores formatados, estado vazio e ações apenas em consultas ativas (RF09, RN14).
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabelaConsultas } from '../../src/components/TabelaConsultas';

afterEach(cleanup);

const consulta = (extra = {}) => ({
  id: 1,
  inicio: '2026-10-20 10:00',
  pacienteNome: 'Ana Pereira',
  medicoNome: 'Dr. Carlos Almeida',
  especialidadeNome: 'Clínica Geral',
  valorCentavos: 15000,
  status: 'AGENDADA',
  observacoes: null,
  motivoCancelamento: null,
  ...extra,
});

const semNbsp = (texto) => texto.replace(/\u00a0/g, ' ');

describe('TabelaConsultas — conteúdo', () => {
  /**
   * @caso CT-UNI-471
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Manter o id estável usado por seletores da interface
   * @resultadoEsperado A tabela recebe o id informado
   */
  test('aplica o id na tabela', () => {
    render(<TabelaConsultas id="tabela-consultas" consultas={[consulta()]} colunas={['inicio']} />);
    expect(document.getElementById('tabela-consultas')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-472
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Nomear as colunas na ordem configurada pela página
   * @resultadoEsperado Os cabeçalhos são Data e hora, Paciente, Médico, Valor e Status
   */
  test('renderiza os cabeçalhos na ordem das colunas', () => {
    render(<TabelaConsultas consultas={[consulta()]} colunas={['inicio', 'paciente', 'medico', 'valor', 'status']} />);
    const titulos = screen.getAllByRole('columnheader').map((th) => th.textContent);
    expect(titulos).toEqual(['Data e hora', 'Paciente', 'Médico', 'Valor', 'Status']);
  });

  /**
   * @caso CT-UNI-473
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Identificar cada linha pelo id da consulta
   * @resultadoEsperado A linha declara data-consulta-id com o id recebido
   */
  test('identifica a linha pelo id da consulta', () => {
    const { container } = render(<TabelaConsultas consultas={[consulta({ id: 77 })]} colunas={['inicio']} />);
    expect(container.querySelector('tr[data-consulta-id="77"]')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-474
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Exibir data e hora no padrão brasileiro
   * @resultadoEsperado A célula mostra "20/10/2026 10:00"
   */
  test('formata data e hora da consulta', () => {
    render(<TabelaConsultas consultas={[consulta()]} colunas={['inicio']} />);
    expect(screen.getByText('20/10/2026 10:00')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-475
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.2, RF10.3
   * @objetivo Mostrar o paciente da consulta para a recepção e o médico
   * @resultadoEsperado A célula exibe "Ana Pereira"
   */
  test('exibe o nome do paciente', () => {
    render(<TabelaConsultas consultas={[consulta()]} colunas={['paciente']} />);
    expect(screen.getByText('Ana Pereira')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-476
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Exibir médico e especialidade juntos na coluna do histórico
   * @resultadoEsperado A célula contém o nome do médico e a especialidade
   */
  test('exibe médico e especialidade', () => {
    render(<TabelaConsultas consultas={[consulta()]} colunas={['medico']} />);
    const celula = screen.getByText(/Dr\. Carlos Almeida/).closest('td');
    expect(celula).toHaveTextContent('Clínica Geral');
  });

  /**
   * @caso CT-UNI-477
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN22, RN23
   * @objetivo Mostrar o valor cobrado da consulta em reais
   * @resultadoEsperado A célula mostra "R$ 150,00"
   */
  test('formata o valor em reais', () => {
    render(<TabelaConsultas consultas={[consulta()]} colunas={['valor']} />);
    expect(semNbsp(screen.getByText(/R\$/).textContent)).toBe('R$ 150,00');
  });

  /**
   * @caso CT-UNI-478
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RN24
   * @objetivo Explicar o retorno gratuito em texto, não apenas como zero
   * @resultadoEsperado Consulta com valor zero mostra "Retorno gratuito"
   */
  test('rotula retorno gratuito', () => {
    render(<TabelaConsultas consultas={[consulta({ valorCentavos: 0 })]} colunas={['valor']} />);
    expect(screen.getByText('Retorno gratuito')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-479
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF09, RNF06
   * @objetivo Exibir o status com etiqueta visual e código acessível
   * @resultadoEsperado A célula contém um badge com data-status AGENDADA
   */
  test('exibe o badge de status', () => {
    const { container } = render(<TabelaConsultas consultas={[consulta()]} colunas={['status']} />);
    expect(container.querySelector('[data-status="AGENDADA"]')).toHaveTextContent('Agendada');
  });

  /**
   * @caso CT-UNI-480
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.4, RN28
   * @objetivo Mostrar as observações registradas no atendimento
   * @resultadoEsperado A coluna de observações exibe o texto gravado
   */
  test('exibe observações do atendimento', () => {
    render(<TabelaConsultas consultas={[consulta({ status: 'REALIZADA', observacoes: 'Paciente estável.' })]} colunas={['observacoes']} />);
    expect(screen.getByText('Paciente estável.')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-481
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF09.2, RN26
   * @objetivo Explicar o cancelamento mesmo quando não há observações
   * @resultadoEsperado A coluna mostra o motivo do cancelamento
   */
  test('exibe o motivo do cancelamento', () => {
    render(<TabelaConsultas consultas={[consulta({ status: 'CANCELADA', motivoCancelamento: 'Imprevisto no trabalho' })]} colunas={['observacoes']} />);
    expect(screen.getByText('Imprevisto no trabalho')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-482
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Não deixar a célula vazia sem explicação
   * @resultadoEsperado Sem observações nem motivo, a célula mostra "—"
   */
  test('usa travessão quando não há observação', () => {
    render(<TabelaConsultas consultas={[consulta()]} colunas={['observacoes']} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-483
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Nomear a coluna de ações sem poluir a leitura visual
   * @resultadoEsperado O cabeçalho de ações contém texto sr-only "Ações"
   */
  test('rotula a coluna de ações para leitores de tela', () => {
    render(<TabelaConsultas consultas={[consulta()]} colunas={['inicio']} acoes={() => <button type="button">Abrir</button>} />);
    expect(screen.getByRole('columnheader')).toHaveTextContent('Ações');
  });

  /**
   * @caso CT-UNI-484
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09, RN25
   * @objetivo Oferecer ações para consultas ainda agendadas
   * @resultadoEsperado A linha AGENDADA contém o botão de ação
   */
  test('renderiza ações em consulta AGENDADA', () => {
    render(<TabelaConsultas consultas={[consulta()]} colunas={['inicio']} acoes={() => <button type="button">Remarcar</button>} />);
    expect(screen.getByRole('button', { name: 'Remarcar' })).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-485
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Manter ações disponíveis para consultas confirmadas
   * @resultadoEsperado A linha CONFIRMADA contém o botão de ação
   */
  test('renderiza ações em consulta CONFIRMADA', () => {
    render(<TabelaConsultas consultas={[consulta({ status: 'CONFIRMADA' })]} colunas={['inicio']} acoes={() => <button type="button">Cancelar</button>} />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-486
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2
   * @objetivo Não oferecer ações para consulta já cancelada
   * @resultadoEsperado A linha CANCELADA não contém botões
   */
  test('não renderiza ações em consulta CANCELADA', () => {
    render(<TabelaConsultas consultas={[consulta({ status: 'CANCELADA' })]} colunas={['inicio']} acoes={() => <button type="button">Cancelar</button>} />);
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-487
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.4
   * @objetivo Não oferecer ações para consulta realizada
   * @resultadoEsperado A linha REALIZADA não contém botões
   */
  test('não renderiza ações em consulta REALIZADA', () => {
    render(<TabelaConsultas consultas={[consulta({ status: 'REALIZADA' })]} colunas={['inicio']} acoes={() => <button type="button">Remarcar</button>} />);
    expect(screen.queryByRole('button', { name: 'Remarcar' })).not.toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-488
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09
   * @objetivo Entregar a consulta completa ao manipulador de ações
   * @resultadoEsperado A fábrica de ações recebe o objeto da consulta
   */
  test('entrega a consulta às ações', async () => {
    const usuario = userEvent.setup();
    const acoes = vi.fn(() => <button type="button">Abrir</button>);
    render(<TabelaConsultas consultas={[consulta({ id: 42 })]} colunas={['inicio']} acoes={acoes} />);
    expect(acoes).toHaveBeenCalledWith(expect.objectContaining({ id: 42, pacienteNome: 'Ana Pereira' }));
    await usuario.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(acoes).toHaveBeenCalledTimes(1);
  });

  /**
   * @caso CT-UNI-489
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Explicar uma lista vazia sem deixar a tabela sem corpo
   * @resultadoEsperado A tabela mostra o texto padrão de vazio
   */
  test('mostra mensagem padrão para lista vazia', () => {
    render(<TabelaConsultas consultas={[]} colunas={['inicio']} />);
    expect(screen.getByText('Nenhuma consulta encontrada.')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-490
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Mostrar esqueleto de carregamento antes da primeira resposta
   * @resultadoEsperado Com consultas nulas há três linhas decorativas
   */
  test('mostra esqueleto enquanto consultas são nulas', () => {
    const { container } = render(<TabelaConsultas consultas={null} colunas={['inicio', 'status']} />);
    expect(container.querySelectorAll('tbody tr[aria-hidden="true"]')).toHaveLength(3);
  });

  /**
   * @caso CT-UNI-491
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Dimensionar o esqueleto com a coluna extra de ações
   * @resultadoEsperado Cada linha do esqueleto tem três células
   */
  test('esqueleto inclui a coluna de ações', () => {
    const { container } = render(
      <TabelaConsultas consultas={null} colunas={['inicio', 'status']} acoes={() => <button type="button">A</button>} />,
    );
    const primeira = container.querySelector('tbody tr');
    expect(primeira.querySelectorAll('td')).toHaveLength(3);
  });
});

describe('TabelaConsultas — listas e comportamento', () => {
  /**
   * @caso CT-UNI-492
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Renderizar todas as consultas recebidas na ordem da API
   * @resultadoEsperado Três linhas aparecem com os ids na ordem recebida
   */
  test('renderiza todas as consultas na ordem recebida', () => {
    const consultas = [
      consulta({ id: 1, pacienteNome: 'Ana Pereira' }),
      consulta({ id: 2, pacienteNome: 'João Santos' }),
      consulta({ id: 3, pacienteNome: 'Lucas Oliveira' }),
    ];
    const { container } = render(<TabelaConsultas consultas={consultas} colunas={['paciente']} />);
    const ids = [...container.querySelectorAll('tbody tr')].map((tr) => tr.getAttribute('data-consulta-id'));
    expect(ids).toEqual(['1', '2', '3']);
  });

  /**
   * @caso CT-UNI-493
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo estetica
   * @requisito RNF06
   * @objetivo Limitar o atraso da animação para listas longas
   * @resultadoEsperado A décima segunda linha recebe atraso de 300ms
   */
  test('limita o atraso de animação das linhas', () => {
    const consultas = Array.from({ length: 12 }, (_, i) => consulta({ id: i + 1 }));
    const { container } = render(<TabelaConsultas consultas={consultas} colunas={['inicio']} />);
    const linhas = container.querySelectorAll('tbody tr');
    expect(linhas[0]).toHaveStyle('animation-delay: 0ms');
    expect(linhas[11]).toHaveStyle('animation-delay: 300ms');
  });

  /**
   * @caso CT-UNI-494
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Adaptar a mensagem de vazio ao contexto da página
   * @resultadoEsperado O texto personalizado aparece no lugar do padrão
   */
  test('respeita o texto vazio personalizado', () => {
    render(<TabelaConsultas consultas={[]} colunas={['inicio']} textoVazio="Nenhuma consulta para os filtros escolhidos." />);
    expect(screen.getByText('Nenhuma consulta para os filtros escolhidos.')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-495
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo reusabilidade
   * @requisito RNF07
   * @objetivo Permitir reutilizar a tabela em telas sem ações
   * @resultadoEsperado Sem a prop acoes, não há coluna extra nem botões
   */
  test('omite a coluna de ações quando não há ações', () => {
    render(<TabelaConsultas consultas={[consulta()]} colunas={['inicio', 'status']} />);
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(within(screen.getByRole('table')).queryByRole('button')).not.toBeInTheDocument();
  });
});
