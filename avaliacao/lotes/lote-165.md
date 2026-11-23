# lote-165

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 2 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0511 | CT-INT-174 | Vazio renderiza o ícone e a mensagem recebida | passou |  |
| mimo-0512 | CT-INT-175 | LinhasEsqueleto cria a quantidade de linhas e colunas informada | passou |  |

## Arquivo: frontend/__testes__/integracao/vazio.test.jsx

```js
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LinhasEsqueleto, Vazio } from '../../src/components/Vazio';

afterEach(cleanup);

describe('components/Vazio', () => {
  /**
   * @caso CT-INT-174
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Apresentar o estado vazio com ícone e a mensagem da página
   * @resultadoEsperado Vazio renderiza o SVG e o texto recebido como filho
   */
  test('Vazio renderiza o ícone e a mensagem recebida', () => {
    const { container } = render(<Vazio icone="usuarios">Nenhum paciente encontrado.</Vazio>);
    expect(screen.getByText('Nenhum paciente encontrado.')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  /**
   * @caso CT-INT-175
   * @nivel integracao
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF07
   * @objetivo Gerar o esqueleto com a quantidade de linhas e colunas pedida
   * @resultadoEsperado LinhasEsqueleto cria 2 linhas ocultas com 4 células cada
   */
  test('LinhasEsqueleto cria a quantidade de linhas e colunas informada', () => {
    const { container } = render(
      <table>
        <tbody>
          <LinhasEsqueleto colunas={4} linhas={2} />
        </tbody>
      </table>,
    );
    const linhas = container.querySelectorAll('tr[aria-hidden="true"]');
    expect(linhas).toHaveLength(2);
    expect(linhas[0].querySelectorAll('td')).toHaveLength(4);
    expect(linhas[0].querySelector('.esqueleto')).not.toBeNull();
  });
});
```
