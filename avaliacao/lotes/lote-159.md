# lote-159

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 8 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0469 | CT-INT-210 | MinhasConsultasPage lista as consultas da mais recente para a mais antiga | passou |  |
| mimo-0470 | CT-INT-211 | MinhasConsultasPage mostra a contagem de ativas sobre o total | passou |  |
| mimo-0471 | CT-INT-212 | MinhasConsultasPage exibe a mensagem de lista vazia | passou |  |
| mimo-0472 | CT-INT-213 | MinhasConsultasPage confirma a presença e recarrega a lista | passou |  |
| mimo-0473 | CT-INT-214 | MinhasConsultasPage pede confirmação antes de cancelar | passou |  |
| mimo-0474 | CT-INT-215 | MinhasConsultasPage cancela a consulta com o motivo padrão do paciente | passou |  |
| mimo-0475 | CT-INT-216 | MinhasConsultasPage fecha o diálogo sem cancelar ao escolher manter | passou |  |
| mimo-0476 | CT-INT-217 | MinhasConsultasPage exibe o erro da API sem recarregar a lista | passou |  |

## Arquivo: frontend/__testes__/integracao/minhas-consultas-page.test.jsx

```js
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { consultasApi } from '../../src/api';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { MinhasConsultasPage } from '../../src/pages/paciente/MinhasConsultasPage';

vi.mock('../../src/api', () => ({
  consultasApi: { listar: vi.fn(), confirmar: vi.fn(), cancelar: vi.fn(), remarcar: vi.fn() },
}));

const CONSULTAS = [
  {
    id: 1,
    inicio: '2026-10-26 08:00',
    medicoId: 1,
    medicoNome: 'Dr. Carlos Almeida',
    especialidadeNome: 'Clínica Geral',
    valorCentavos: 15000,
    status: 'AGENDADA',
  },
  {
    id: 2,
    inicio: '2026-09-01 10:00',
    medicoId: 2,
    medicoNome: 'Dra. Beatriz Souza',
    especialidadeNome: 'Cardiologia',
    valorCentavos: 0,
    status: 'REALIZADA',
  },
  {
    id: 3,
    inicio: '2026-10-27 09:00',
    medicoId: 1,
    medicoNome: 'Dr. Carlos Almeida',
    especialidadeNome: 'Clínica Geral',
    valorCentavos: 15000,
    status: 'CANCELADA',
    motivoCancelamento: 'Imprevisto',
  },
];

function montar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <MinhasConsultasPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

async function montarComLista() {
  const utils = montar();
  await waitFor(() => expect(utils.container.querySelectorAll('tbody tr')).toHaveLength(3));
  return utils;
}

describe('pages/paciente/MinhasConsultasPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    consultasApi.listar.mockResolvedValue(CONSULTAS);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  /**
   * @caso CT-INT-210
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.1
   * @objetivo Apresentar as próprias consultas da mais recente para a mais antiga
   * @resultadoEsperado As linhas aparecem ordenadas por início decrescente
   */
  test('MinhasConsultasPage lista as consultas da mais recente para a mais antiga', async () => {
    const { container } = await montarComLista();

    const ids = [...container.querySelectorAll('tbody tr')].map((linha) => linha.getAttribute('data-consulta-id'));
    expect(ids).toEqual(['3', '1', '2']);
  });

  /**
   * @caso CT-INT-211
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Resumir quantas consultas seguem ativas e quantas existem no total
   * @resultadoEsperado O cabeçalho mostra "1 consulta(s) ativa(s) de 3 no total."
   */
  test('MinhasConsultasPage mostra a contagem de ativas sobre o total', async () => {
    montar();

    expect(await screen.findByText('1 consulta(s) ativa(s) de 3 no total.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-212
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RNF06
   * @objetivo Convencer o paciente a agendar quando ainda não há consultas
   * @resultadoEsperado Lista vazia exibe a mensagem própria da página com contagem zerada
   */
  test('MinhasConsultasPage exibe a mensagem de lista vazia', async () => {
    consultasApi.listar.mockResolvedValue([]);
    montar();

    expect(await screen.findByText('Você ainda não tem consultas. Que tal agendar a primeira?')).toBeInTheDocument();
    expect(screen.getByText('0 consulta(s) ativa(s) de 0 no total.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-213
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Confirmar a presença da consulta pelo próprio paciente e recarregar a lista
   * @resultadoEsperado O botão Confirmar chama a API com o id e exibe o aviso de sucesso
   */
  test('MinhasConsultasPage confirma a presença e recarrega a lista', async () => {
    const { container } = await montarComLista();

    fireEvent.click(container.querySelector('tr[data-consulta-id="1"] [data-acao="confirmar"]'));

    await waitFor(() => expect(consultasApi.confirmar).toHaveBeenCalledWith(1));
    expect(consultasApi.listar).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/Presença confirmada para 26\/10\/2026 08:00\./)).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-214
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF06, RN26
   * @objetivo Pedir confirmação antes de cancelar, avisando que a ação não pode ser desfeita
   * @resultadoEsperado Cancelar abre o diálogo com o aviso e os dois caminhos possíveis
   */
  test('MinhasConsultasPage pede confirmação antes de cancelar', async () => {
    const { container } = await montarComLista();

    fireEvent.click(container.querySelector('tr[data-consulta-id="1"] [data-acao="cancelar"]'));

    const dialogo = await screen.findByRole('dialog', { name: 'Cancelar consulta?' });
    expect(dialogo).toHaveTextContent('Dr. Carlos Almeida · 26/10/2026 08:00.');
    expect(screen.getByRole('button', { name: 'Manter consulta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sim, cancelar' })).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-215
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Cancelar a consulta com o motivo padrão do paciente
   * @resultadoEsperado Confirmar no diálogo chama cancelar com o id e o motivo padrão
   */
  test('MinhasConsultasPage cancela a consulta com o motivo padrão do paciente', async () => {
    consultasApi.cancelar.mockResolvedValue({ id: 1, status: 'CANCELADA' });
    const { container } = await montarComLista();

    fireEvent.click(container.querySelector('tr[data-consulta-id="1"] [data-acao="cancelar"]'));
    await screen.findByRole('dialog', { name: 'Cancelar consulta?' });
    fireEvent.click(screen.getByRole('button', { name: 'Sim, cancelar' }));

    await waitFor(() => expect(consultasApi.cancelar).toHaveBeenCalledWith(1, 'Cancelado pelo paciente'));
    expect(await screen.findByText('Sua consulta foi cancelada.')).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-216
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF06
   * @objetivo Permitir desistir do cancelamento sem tocar na API
   * @resultadoEsperado "Manter consulta" fecha o diálogo sem chamar cancelar
   */
  test('MinhasConsultasPage fecha o diálogo sem cancelar ao escolher manter', async () => {
    const { container } = await montarComLista();

    fireEvent.click(container.querySelector('tr[data-consulta-id="1"] [data-acao="cancelar"]'));
    await screen.findByRole('dialog', { name: 'Cancelar consulta?' });
    fireEvent.click(screen.getByRole('button', { name: 'Manter consulta' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(consultasApi.cancelar).not.toHaveBeenCalled();
  });

  /**
   * @caso CT-INT-217
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Exibir a regra de negócio recusada pela API sem perder a lista
   * @resultadoEsperado Falha na confirmação vira alerta e a lista não é recarregada
   */
  test('MinhasConsultasPage exibe o erro da API sem recarregar a lista', async () => {
    consultasApi.confirmar.mockRejectedValue(
      new Error('A confirmação só é permitida nas 48 horas anteriores à consulta.'),
    );
    const { container } = await montarComLista();

    fireEvent.click(container.querySelector('tr[data-consulta-id="1"] [data-acao="confirmar"]'));

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveAttribute('id', 'consultas-mensagem');
    expect(aviso).toHaveTextContent('A confirmação só é permitida nas 48 horas anteriores à consulta.');
    expect(consultasApi.listar).toHaveBeenCalledTimes(1);
  });
});
```
