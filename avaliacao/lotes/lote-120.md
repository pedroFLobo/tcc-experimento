# lote-120

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 6 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0345 | CT-INT-112 | renderiza linhas com dados formatados | passou |  |
| glm-0346 | CT-INT-113 | retorno gratuito aparece no lugar de R$ 0,00 | passou |  |
| glm-0347 | CT-INT-114 | exibe valor formatado em reais | passou |  |
| glm-0348 | CT-INT-115 | lista vazia mostra mensagem orientadora | passou |  |
| glm-0349 | CT-INT-116 | ações só aparecem em consultas ativas | passou |  |
| glm-0350 | CT-INT-117 | consultas indefinidas mostram esqueleto | passou |  |

## Arquivo: frontend/__testes__/integracao/TabelaConsultas.test.jsx

```js
// @vitest-environment jsdom
// Testes de integração da TabelaConsultas (RF10, RN22–RN24, usabilidade).
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TabelaConsultas } from '../../src/components/TabelaConsultas';

const consultaAtiva = {
  id: 7, inicio: '2026-10-20 08:00', pacienteNome: 'Ana Pereira', medicoNome: 'Dr. Carlos Almeida',
  especialidadeNome: 'Clínica Geral', status: 'AGENDADA', valorCentavos: 15000,
};

const montar = (consultas, acoes) => render(
  <TabelaConsultas id="tabela-teste" consultas={consultas} colunas={['inicio', 'medico', 'valor', 'status']} acoes={acoes} />,
);

beforeEach(() => {});
afterEach(() => cleanup());

describe('TabelaConsultas (RF10)', () => {
  /**
   * @caso CT-INT-112
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.1
   * @objetivo Listar as consultas com data formatada, médico e status por linha
   * @resultadoEsperado linha com data-consulta-id exibe '20/10/2026 08:00', nome do médico e 'Agendada'
   */
  test('renderiza linhas com dados formatados', () => {
    montar([consultaAtiva]);
    const linha = screen.getByText('20/10/2026 08:00').closest('tr');
    expect(linha).toHaveAttribute('data-consulta-id', '7');
    expect(linha).toHaveTextContent('Dr. Carlos Almeida');
    expect(within(linha).getByText('Agendada')).toHaveAttribute('data-status', 'AGENDADA');
  });

  /**
   * @caso CT-INT-113
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Sinalizar retorno gratuito no lugar do valor zero
   * @resultadoEsperado consulta com valorCentavos 0 exibe 'Retorno gratuito'
   */
  test('retorno gratuito aparece no lugar de R$ 0,00', () => {
    montar([{ ...consultaAtiva, valorCentavos: 0 }]);
    expect(screen.getByText('Retorno gratuito')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-114
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN22, RN23
   * @objetivo Exibir o valor em reais no formato nacional
   * @resultadoEsperado valorCentavos 24300 aparece como R$ 243,00
   */
  test('exibe valor formatado em reais', () => {
    montar([{ ...consultaAtiva, valorCentavos: 24300 }]);
    expect(screen.getByText(/243,00/)).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-115
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF10.1, RNF06
   * @objetivo Orientar o usuário quando não há consultas
   * @resultadoEsperado lista vazia exibe o texto vazio personalizado
   */
  test('lista vazia mostra mensagem orientadora', () => {
    render(
      <TabelaConsultas
        id="tabela-teste" consultas={[]} colunas={['inicio', 'medico', 'valor', 'status']}
        textoVazio="Você ainda não tem consultas."
      />,
    );
    expect(screen.getByText('Você ainda não tem consultas.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-116
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09, RN25
   * @objetivo Oferecer ações apenas em consultas ativas
   * @resultadoEsperado linha AGENDADA tem botão Confirmar; linha CANCELADA não tem ações
   */
  test('ações só aparecem em consultas ativas', () => {
    montar([consultaAtiva, { ...consultaAtiva, id: 8, status: 'CANCELADA', inicio: '2026-10-21 09:00' }], () => <button type="button">Confirmar</button>);
    const ativa = screen.getByText('20/10/2026 08:00').closest('tr');
    expect(within(ativa).getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    const cancelada = screen.getByText('Cancelada').closest('tr');
    expect(within(cancelada).queryByRole('button')).toBeNull();
  });

  /**
   * @caso CT-INT-117
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RNF06
   * @objetivo Indicar carregamento enquanto os dados não chegam
   * @resultadoEsperado consultas undefined renderiza linhas de esqueleto
   */
  test('consultas indefinidas mostram esqueleto', () => {
    montar(undefined);
    expect(document.querySelectorAll('.esqueleto').length).toBeGreaterThan(0);
  });
});
```
