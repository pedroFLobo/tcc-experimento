import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TabelaConsultas } from '../../src/components/TabelaConsultas';

describe('Integração Frontend: TabelaConsultas', () => {
  const colunasPadrao = ['inicio', 'paciente', 'medico', 'especialidade', 'valor', 'status'];

  const consultasExemplo = [
    {
      id: 1,
      inicio: '2026-10-20 09:00',
      pacienteNome: 'Ana Pereira',
      medicoNome: 'Dr. Carlos Almeida',
      especialidadeNome: 'Clínica Geral',
      valorCentavos: 15000,
      status: 'AGENDADA',
    },
    {
      id: 2,
      inicio: '2026-10-21 14:00',
      pacienteNome: 'João Santos',
      medicoNome: 'Dra. Beatriz Souza',
      especialidadeNome: 'Cardiologia',
      valorCentavos: 0,
      status: 'CONFIRMADA',
    },
    {
      id: 3,
      inicio: '2026-10-15 10:00',
      pacienteNome: 'Ana Pereira',
      medicoNome: 'Dr. Carlos Almeida',
      especialidadeNome: 'Clínica Geral',
      valorCentavos: 15000,
      status: 'REALIZADA',
    },
  ];

  /**
   * @caso CT-INT-049
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF10, RNF06
   * @objetivo Renderizar tabela de consultas com colunas, dados e atributo data-consulta-id
   * @resultadoEsperado Cada linha possui data-consulta-id e os dados estão formatados
   */
  test.skip('deve renderizar consultas com identificador na linha e valores formatados', () => {
    render(<TabelaConsultas id="tabela-teste" consultas={consultasExemplo} colunas={colunasPadrao} />);

    const linha1 = screen.getByText('Ana Pereira').closest('tr');
    expect(linha1).toHaveAttribute('data-consulta-id', '1');

    // Valor zero deve aparecer como "Retorno gratuito"
    expect(screen.getByText('Retorno gratuito')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-050
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF09, RF10
   * @objetivo Exibir botões de ação somente para consultas ativas
   * @resultadoEsperado Linhas com status AGENDADA/CONFIRMADA têm botões de ação; REALIZADA não tem
   */
  test('deve exibir botões de ação apenas para consultas com status ativo', () => {
    const renderAcoes = vi.fn((c) => <button type="button">Ação {c.id}</button>);
    render(<TabelaConsultas id="tabela-acoes" consultas={consultasExemplo} colunas={colunasPadrao} acoes={renderAcoes} />);

    expect(screen.getByText('Ação 1')).toBeInTheDocument();
    expect(screen.getByText('Ação 2')).toBeInTheDocument();
    expect(screen.queryByText('Ação 3')).not.toBeInTheDocument();
  });

  /**
   * @caso CT-INT-051
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RF10, RNF06
   * @objetivo Exibir mensagem informativa amigável quando lista de consultas for vazia
   * @resultadoEsperado Componente exibe o texto de lista vazia
   */
  test('deve exibir mensagem de estado vazio quando não houver consultas', () => {
    render(<TabelaConsultas id="tabela-vazia" consultas={[]} colunas={colunasPadrao} textoVazio="Você ainda não tem consultas marcadas." />);
    expect(screen.getByText('Você ainda não tem consultas marcadas.')).toBeInTheDocument();
  });
});
