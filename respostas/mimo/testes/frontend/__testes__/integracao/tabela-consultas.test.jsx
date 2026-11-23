import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TabelaConsultas } from '../../src/components/TabelaConsultas';

const CONSULTAS = [
  {
    id: 7,
    inicio: '2026-10-26 08:00',
    pacienteNome: 'Ana Pereira',
    medicoNome: 'Dr. Carlos Almeida',
    especialidadeNome: 'Clínica Geral',
    valorCentavos: 15000,
    status: 'AGENDADA',
  },
  {
    id: 8,
    inicio: '2026-10-27 09:00',
    pacienteNome: 'João Santos',
    medicoNome: 'Dra. Beatriz Souza',
    especialidadeNome: 'Cardiologia',
    valorCentavos: 0,
    status: 'CANCELADA',
    motivoCancelamento: 'Desistência do paciente',
  },
  {
    id: 9,
    inicio: '2026-11-02 10:00',
    pacienteNome: 'Lucas Oliveira',
    medicoNome: 'Dra. Fernanda Rocha',
    especialidadeNome: 'Pediatria',
    valorCentavos: 20000,
    status: 'REALIZADA',
    observacoes: 'Sem alterações.',
  },
];

const COLUNAS = ['inicio', 'medico', 'valor', 'status'];

afterEach(cleanup);

describe('components/TabelaConsultas', () => {
  /**
   * @caso CT-INT-164
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Mostrar linhas de carregamento enquanto a lista não chega
   * @resultadoEsperado Com consultas undefined, a tabela exibe 3 linhas de esqueleto ocultas
   */
  test('TabelaConsultas mostra esqueleto enquanto a lista não chega', () => {
    const { container } = render(
      <TabelaConsultas id="tabela-consultas" consultas={undefined} colunas={['inicio', 'status']} />,
    );
    const linhas = container.querySelectorAll('tbody tr[aria-hidden="true"]');
    expect(linhas).toHaveLength(3);
  });

  /**
   * @caso CT-INT-165
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RNF06
   * @objetivo Apresentar mensagem de lista vazia coerente com a página do paciente
   * @resultadoEsperado Lista vazia exibe o textoVazio informado pela página
   */
  test('TabelaConsultas exibe o texto vazio da página quando não há consultas', () => {
    render(
      <TabelaConsultas
        id="tabela-consultas"
        consultas={[]}
        colunas={['inicio']}
        textoVazio="Você ainda não tem consultas. Que tal agendar a primeira?"
      />,
    );
    expect(screen.getByText('Você ainda não tem consultas. Que tal agendar a primeira?')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-166
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.1
   * @objetivo Listar cada consulta com data formatada, médico e identificação da linha
   * @resultadoEsperado As linhas têm data-consulta-id e as colunas pedidas aparecem no cabeçalho
   */
  test('TabelaConsultas renderiza as linhas com data-consulta-id e os cabeçalhos pedidos', () => {
    const { container } = render(<TabelaConsultas id="tabela-consultas" consultas={CONSULTAS} colunas={COLUNAS} />);
    const linhas = container.querySelectorAll('tbody tr');
    expect(linhas).toHaveLength(3);
    expect(container.querySelector('tr[data-consulta-id="7"]')).not.toBeNull();
    expect(screen.getByText('Data e hora')).toBeInTheDocument();
    expect(screen.getByText('Médico')).toBeInTheDocument();
    expect(screen.getByText('26/10/2026 08:00')).toBeInTheDocument();
    expect(screen.getByText('Dr. Carlos Almeida')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-167
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Mostrar retorno gratuito por extenso em vez de zero monetário
   * @resultadoEsperado Consulta com valorCentavos 0 exibe "Retorno gratuito"
   */
  test('TabelaConsultas mostra "Retorno gratuito" para valor zero', () => {
    render(<TabelaConsultas id="tabela-consultas" consultas={CONSULTAS} colunas={['valor']} />);
    expect(screen.getByText('Retorno gratuito')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-168
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN22, RF08.2
   * @objetivo Exibir o valor da consulta em reais no formato brasileiro
   * @resultadoEsperado Valores em centavos aparecem como "R$ 150,00" e "R$ 200,00"
   */
  test('TabelaConsultas formata o valor da consulta em reais', () => {
    render(<TabelaConsultas id="tabela-consultas" consultas={CONSULTAS} colunas={['valor']} />);
    expect(screen.getByText(/R\$\s150,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s200,00/)).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-169
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Evitar célula vazia quando a consulta não tem observações nem motivo
   * @resultadoEsperado Coluna de observações sem texto algum exibe o marcador "—"
   */
  test('TabelaConsultas usa travessão quando não há observações nem motivo', () => {
    render(<TabelaConsultas id="tabela-consultas" consultas={CONSULTAS} colunas={['observacoes']} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-170
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.4
   * @objetivo Exibir as observações registradas no atendimento
   * @resultadoEsperado Coluna de observações mostra o texto gravado na consulta realizada
   */
  test('TabelaConsultas exibe as observações da consulta', () => {
    render(<TabelaConsultas id="tabela-consultas" consultas={CONSULTAS} colunas={['observacoes']} />);
    expect(screen.getByText('Sem alterações.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-171
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.2
   * @objetivo Exibir o motivo do cancelamento quando a consulta não tem observações
   * @resultadoEsperado Coluna de observações mostra o motivo cancelamento da consulta cancelada
   */
  test('TabelaConsultas exibe o motivo do cancelamento', () => {
    render(<TabelaConsultas id="tabela-consultas" consultas={CONSULTAS} colunas={['observacoes']} />);
    expect(screen.getByText('Desistência do paciente')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-172
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Oferecer ações apenas em consultas que ainda podem mudar de estado
   * @resultadoEsperado Botões de ação aparecem na linha ativa e não nas linhas encerradas
   */
  test('TabelaConsultas só renderiza ações nas consultas ativas', () => {
    const { container } = render(
      <TabelaConsultas
        id="tabela-consultas"
        consultas={CONSULTAS}
        colunas={['inicio']}
        acoes={() => <button type="button" data-acao="cancelar">Cancelar</button>}
      />,
    );
    expect(container.querySelector('tr[data-consulta-id="7"] [data-acao]')).not.toBeNull();
    expect(container.querySelector('tr[data-consulta-id="8"] [data-acao]')).toBeNull();
    expect(container.querySelector('tr[data-consulta-id="9"] [data-acao]')).toBeNull();
  });

  /**
   * @caso CT-INT-173
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RF09
   * @objetivo Apresentar o status de cada linha com o selo reconhecível
   * @resultadoEsperado A coluna status renderiza o StatusBadge com o data-status da consulta
   */
  test('TabelaConsultas renderiza o selo de status em cada linha', () => {
    const { container } = render(<TabelaConsultas id="tabela-consultas" consultas={CONSULTAS} colunas={['status']} />);
    expect(container.querySelector('tr[data-consulta-id="7"] [data-status="AGENDADA"]')).not.toBeNull();
    expect(container.querySelector('tr[data-consulta-id="8"] [data-status="CANCELADA"]')).not.toBeNull();
    expect(screen.getByText('Realizada')).toBeInTheDocument();
  });
});
