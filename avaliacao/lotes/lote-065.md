# lote-065

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 40 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-1103 | CT-UNI-401 | associa o rótulo ao input | passou |  |
| deepseek-1104 | CT-UNI-402 | marca obrigatório com asterisco oculto ao leitor de tela | passou |  |
| deepseek-1105 | CT-UNI-403 | não marca asterisco em campo opcional | passou |  |
| deepseek-1106 | CT-UNI-404 | renderiza texto de ajuda com id estável | passou |  |
| deepseek-1107 | CT-UNI-405 | liga o input à ajuda via aria-describedby | passou |  |
| deepseek-1108 | CT-UNI-406 | omite aria-describedby sem ajuda | passou |  |
| deepseek-1109 | CT-UNI-407 | renderiza o controle passado como filho | passou |  |
| deepseek-1110 | CT-UNI-408 | repassa atributos nativos do input | passou |  |
| deepseek-1111 | CT-UNI-409 | aceita valor controlado e digitação | passou |  |
| deepseek-1112 | CT-UNI-410 | associa o rótulo ao select filho | passou |  |
| deepseek-1113 | CT-UNI-411 | usa type submit por padrão | passou |  |
| deepseek-1114 | CT-UNI-412 | mostra o texto da ação quando ocioso | passou |  |
| deepseek-1115 | CT-UNI-413 | desabilita o botão durante o envio | passou |  |
| deepseek-1116 | CT-UNI-414 | marca aria-busy durante o envio | passou |  |
| deepseek-1117 | CT-UNI-415 | troca o rótulo pelo texto de envio | passou |  |
| deepseek-1118 | CT-UNI-416 | esconde o texto original durante o envio | passou |  |
| deepseek-1119 | CT-UNI-417 | indicador de carregamento é oculto ao leitor de tela | passou |  |
| deepseek-1120 | CT-UNI-418 | respeita a prop disabled | passou |  |
| deepseek-1121 | CT-UNI-419 | repassa atributos extras e onClick | passou |  |
| deepseek-1122 | CT-UNI-420 | rotula AGENDADA em português | passou |  |
| deepseek-1123 | CT-UNI-421 | rotula CONFIRMADA em português | passou |  |
| deepseek-1124 | CT-UNI-422 | rotula REALIZADA em português | passou |  |
| deepseek-1125 | CT-UNI-423 | rotula FALTA em português | passou |  |
| deepseek-1126 | CT-UNI-424 | rotula CANCELADA em português | passou |  |
| deepseek-1127 | CT-UNI-425 | expõe data-status com o código original | passou |  |
| deepseek-1128 | CT-UNI-426 | exibe o código quando não há tradução | passou |  |
| deepseek-1129 | CT-UNI-427 | não renderiza nada sem mensagem | passou |  |
| deepseek-1130 | CT-UNI-428 | usa role alert para erro | passou |  |
| deepseek-1131 | CT-UNI-429 | usa role status para sucesso | passou |  |
| deepseek-1132 | CT-UNI-430 | aplica o id informado | passou |  |
| deepseek-1133 | CT-UNI-431 | exibe o texto recebido | passou |  |
| deepseek-1134 | CT-UNI-432 | acompanha o erro com ícone decorativo | passou |  |
| deepseek-1135 | CT-UNI-433 | ícone é decorativo e não focável | passou |  |
| deepseek-1136 | CT-UNI-434 | usa tamanho padrão de 18 | passou |  |
| deepseek-1137 | CT-UNI-435 | aceita tamanho customizado | passou |  |
| deepseek-1138 | CT-UNI-436 | Vazio mostra texto e ícone | passou |  |
| deepseek-1139 | CT-UNI-437 | LinhasEsqueleto cria linhas decorativas | passou |  |
| deepseek-1140 | CT-UNI-438 | LinhasEsqueleto usa três linhas por padrão | passou |  |
| deepseek-1141 | CT-UNI-439 | ícone desconhecido não quebra a renderização | passou |  |
| deepseek-1142 | CT-UNI-440 | mensagem de sucesso não é tratada como alerta | passou |  |

## Arquivo: frontend/__testes__/unitario/componentes-basicos.test.jsx

```js
// Componentes básicos de interface: rótulos acessíveis, estados de envio e sinalização de status (RNF06).
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Campo } from '../../src/components/Campo';
import { BotaoEnviar } from '../../src/components/BotaoEnviar';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Mensagem } from '../../src/components/Mensagem';
import { Icone } from '../../src/components/Icone';
import { Vazio, LinhasEsqueleto } from '../../src/components/Vazio';

afterEach(cleanup);

describe('Campo', () => {
  /**
   * @caso CT-UNI-401
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Associar o rótulo ao campo para leitores de tela e testes
   * @resultadoEsperado getByLabelText encontra o input pelo texto do rótulo
   */
  test('associa o rótulo ao input', () => {
    render(<Campo id="email" rotulo="E-mail" type="email" />);
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email');
  });

  /**
   * @caso CT-UNI-402
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Indicar campos obrigatórios sem poluir o nome acessível
   * @resultadoEsperado O asterisco é renderizado com aria-hidden
   */
  test('marca obrigatório com asterisco oculto ao leitor de tela', () => {
    const { container } = render(<Campo id="nome" rotulo="Nome completo" obrigatorio />);
    const asterisco = container.querySelector('label span[aria-hidden="true"]');
    expect(asterisco).toHaveTextContent('*');
  });

  /**
   * @caso CT-UNI-403
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Não confundir campos opcionais com obrigatórios
   * @resultadoEsperado Sem a prop obrigatorio não há asterisco
   */
  test('não marca asterisco em campo opcional', () => {
    const { container } = render(<Campo id="telefone" rotulo="Telefone" />);
    expect(container.querySelector('label span')).toBeNull();
  });

  /**
   * @caso CT-UNI-404
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Exibir ajuda abaixo do campo com identificador próprio
   * @resultadoEsperado O texto de ajuda aparece em um parágrafo com id "<campo>-ajuda"
   */
  test('renderiza texto de ajuda com id estável', () => {
    render(<Campo id="senha" rotulo="Senha" ajuda="Mínimo de 8 caracteres." />);
    expect(document.getElementById('senha-ajuda')).toHaveTextContent('Mínimo de 8 caracteres.');
  });

  /**
   * @caso CT-UNI-405
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Ligar o campo ao texto de ajuda
   * @resultadoEsperado O input declara aria-describedby apontando para a ajuda
   */
  test('liga o input à ajuda via aria-describedby', () => {
    render(<Campo id="senha" rotulo="Senha" ajuda="Use letras e números." />);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-describedby', 'senha-ajuda');
  });

  /**
   * @caso CT-UNI-406
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Não declarar descrição inexistente
   * @resultadoEsperado Sem ajuda, o input não tem aria-describedby
   */
  test('omite aria-describedby sem ajuda', () => {
    render(<Campo id="crm" rotulo="CRM" />);
    expect(screen.getByLabelText('CRM')).not.toHaveAttribute('aria-describedby');
  });

  /**
   * @caso CT-UNI-407
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo reusabilidade
   * @requisito RNF07
   * @objetivo Permitir selects e outros controles dentro do mesmo rótulo
   * @resultadoEsperado O filho select é renderizado no lugar do input
   */
  test('renderiza o controle passado como filho', () => {
    render(
      <Campo id="status" rotulo="Status">
        <select id="status" defaultValue="AGENDADA">
          <option value="AGENDADA">Agendada</option>
        </select>
      </Campo>,
    );
    expect(screen.getByLabelText('Status').tagName).toBe('SELECT');
  });

  /**
   * @caso CT-UNI-408
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF06
   * @objetivo Repassar atributos nativos de input para a marcação
   * @resultadoEsperado type, placeholder e min são aplicados ao input
   */
  test('repassa atributos nativos do input', () => {
    render(<Campo id="preco" rotulo="Preço" type="number" placeholder="150,00" min="0" />);
    const campo = screen.getByLabelText('Preço');
    expect(campo).toHaveAttribute('type', 'number');
    expect(campo).toHaveAttribute('placeholder', '150,00');
    expect(campo).toHaveAttribute('min', '0');
  });

  /**
   * @caso CT-UNI-409
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Manter o campo controlado pelo estado da página
   * @resultadoEsperado O valor digitado aparece no input
   */
  test('aceita valor controlado e digitação', async () => {
    const usuario = userEvent.setup();
    const aoMudar = vi.fn();
    const { rerender } = render(<Campo id="email" rotulo="E-mail" value="" onChange={aoMudar} />);
    await usuario.type(screen.getByLabelText('E-mail'), 'a');
    expect(aoMudar).toHaveBeenCalled();
    rerender(<Campo id="email" rotulo="E-mail" value="ana@email.com" onChange={aoMudar} />);
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@email.com');
  });

  /**
   * @caso CT-UNI-410
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Manter o rótulo do select também acessível pelo nome
   * @resultadoEsperado O select tem o id indicado e o rótulo associado
   */
  test('associa o rótulo ao select filho', () => {
    render(
      <Campo id="duracao" rotulo="Duração">
        <select id="duracao" defaultValue="30">
          <option value="30">30 minutos</option>
        </select>
      </Campo>,
    );
    const select = screen.getByLabelText('Duração');
    expect(select).toHaveAttribute('id', 'duracao');
  });
});

describe('BotaoEnviar', () => {
  /**
   * @caso CT-UNI-411
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Enviar o formulário ao clicar no botão
   * @resultadoEsperado O botão tem type submit
   */
  test('usa type submit por padrão', () => {
    render(<BotaoEnviar>Entrar</BotaoEnviar>);
    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveAttribute('type', 'submit');
  });

  /**
   * @caso CT-UNI-412
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Mostrar o texto da ação quando ocioso
   * @resultadoEsperado O conteúdo do botão é o texto recebido
   */
  test('mostra o texto da ação quando ocioso', () => {
    render(<BotaoEnviar>Confirmar agendamento</BotaoEnviar>);
    expect(screen.getByRole('button')).toHaveTextContent('Confirmar agendamento');
  });

  /**
   * @caso CT-UNI-413
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Impedir clique duplo durante o envio
   * @resultadoEsperado Com enviando=true o botão fica desabilitado
   */
  test('desabilita o botão durante o envio', () => {
    render(<BotaoEnviar enviando>Entrar</BotaoEnviar>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  /**
   * @caso CT-UNI-414
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Anunciar o estado de carregamento
   * @resultadoEsperado aria-busy é "true" durante o envio
   */
  test('marca aria-busy durante o envio', () => {
    render(<BotaoEnviar enviando>Entrar</BotaoEnviar>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  /**
   * @caso CT-UNI-415
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Trocar o rótulo pelo texto de progresso
   * @resultadoEsperado O botão mostra "Entrando..." durante o envio
   */
  test('troca o rótulo pelo texto de envio', () => {
    render(<BotaoEnviar enviando textoEnviando="Entrando...">Entrar</BotaoEnviar>);
    expect(screen.getByRole('button')).toHaveTextContent('Entrando...');
  });

  /**
   * @caso CT-UNI-416
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Não exibir dois rótulos ao mesmo tempo
   * @resultadoEsperado O texto original não aparece durante o envio
   */
  test('esconde o texto original durante o envio', () => {
    render(<BotaoEnviar enviando textoEnviando="Agendando...">Confirmar agendamento</BotaoEnviar>);
    expect(screen.getByRole('button')).not.toHaveTextContent('Confirmar agendamento');
  });

  /**
   * @caso CT-UNI-417
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Exibir indicador visual sem duplicar a informação falada
   * @resultadoEsperado O indicador giratório tem aria-hidden
   */
  test('indicador de carregamento é oculto ao leitor de tela', () => {
    const { container } = render(<BotaoEnviar enviando>Entrar</BotaoEnviar>);
    expect(container.querySelector('.girando')).toHaveAttribute('aria-hidden', 'true');
  });

  /**
   * @caso CT-UNI-418
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.1, RNF06
   * @objetivo Impedir confirmação antes de escolher o horário
   * @resultadoEsperado A prop disabled também desabilita o botão
   */
  test('respeita a prop disabled', () => {
    render(<BotaoEnviar disabled>Confirmar agendamento</BotaoEnviar>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  /**
   * @caso CT-UNI-419
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF06
   * @objetivo Repassar id, classe e handler definidos pela página
   * @resultadoEsperado O botão mantém os atributos extras e chama onClick
   */
  test('repassa atributos extras e onClick', async () => {
    const usuario = userEvent.setup();
    const clicou = vi.fn();
    render(<BotaoEnviar id="login-entrar" className="marca" onClick={clicou}>Entrar</BotaoEnviar>);
    const botao = screen.getByRole('button', { name: 'Entrar' });
    expect(botao).toHaveAttribute('id', 'login-entrar');
    expect(botao).toHaveClass('marca');
    await usuario.click(botao);
    expect(clicou).toHaveBeenCalledTimes(1);
  });
});

describe('StatusBadge', () => {
  /**
   * @caso CT-UNI-420
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF09, RNF06
   * @objetivo Traduzir AGENDADA para o rótulo em português
   * @resultadoEsperado O texto é "Agendada" com a classe status-AGENDADA
   */
  test('rotula AGENDADA em português', () => {
    const { container } = render(<StatusBadge status="AGENDADA" />);
    expect(container.firstChild).toHaveTextContent('Agendada');
    expect(container.firstChild).toHaveClass('status-AGENDADA');
  });

  /**
   * @caso CT-UNI-421
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF09.1
   * @objetivo Traduzir CONFIRMADA para o rótulo em português
   * @resultadoEsperado O texto é "Confirmada"
   */
  test('rotula CONFIRMADA em português', () => {
    render(<StatusBadge status="CONFIRMADA" />);
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-422
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF09.4
   * @objetivo Traduzir REALIZADA para o rótulo em português
   * @resultadoEsperado O texto é "Realizada"
   */
  test('rotula REALIZADA em português', () => {
    render(<StatusBadge status="REALIZADA" />);
    expect(screen.getByText('Realizada')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-423
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF09.5, RN29
   * @objetivo Traduzir FALTA para o rótulo em português
   * @resultadoEsperado O texto é "Falta"
   */
  test('rotula FALTA em português', () => {
    render(<StatusBadge status="FALTA" />);
    expect(screen.getByText('Falta')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-424
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF09.2
   * @objetivo Traduzir CANCELADA para o rótulo em português
   * @resultadoEsperado O texto é "Cancelada"
   */
  test('rotula CANCELADA em português', () => {
    render(<StatusBadge status="CANCELADA" />);
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-425
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Expor o status bruto para seletores e automação
   * @resultadoEsperado O elemento declara data-status com o código recebido
   */
  test('expõe data-status com o código original', () => {
    const { container } = render(<StatusBadge status="CONFIRMADA" />);
    expect(container.firstChild).toHaveAttribute('data-status', 'CONFIRMADA');
  });

  /**
   * @caso CT-UNI-426
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Não esconder um status novo desconhecido pela interface
   * @resultadoEsperado O texto e a classe usam o código recebido
   */
  test('exibe o código quando não há tradução', () => {
    const { container } = render(<StatusBadge status="PENDENTE" />);
    expect(container.firstChild).toHaveTextContent('PENDENTE');
    expect(container.firstChild).toHaveClass('status-PENDENTE');
  });
});

describe('Mensagem', () => {
  /**
   * @caso CT-UNI-427
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Não reservar espaço quando não há mensagem
   * @resultadoEsperado Nada é renderizado com mensagem nula
   */
  test('não renderiza nada sem mensagem', () => {
    const { container } = render(<Mensagem mensagem={null} id="teste" />);
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * @caso CT-UNI-428
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Anunciar erros imediatamente ao leitor de tela
   * @resultadoEsperado A mensagem de erro tem role alert
   */
  test('usa role alert para erro', () => {
    render(<Mensagem mensagem={{ tipo: 'erro', texto: 'Horário já ocupado.' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Horário já ocupado.');
  });

  /**
   * @caso CT-UNI-429
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Não interromper o leitor de tela com mensagens informativas
   * @resultadoEsperado A mensagem de sucesso tem role status
   */
  test('usa role status para sucesso', () => {
    render(<Mensagem mensagem={{ tipo: 'sucesso', texto: 'Tudo certo.' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Tudo certo.');
  });

  /**
   * @caso CT-UNI-430
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Manter o id estável usado por seletores
   * @resultadoEsperado O elemento recebe o id informado
   */
  test('aplica o id informado', () => {
    render(<Mensagem id="login-mensagem" mensagem={{ tipo: 'erro', texto: 'E-mail ou senha inválidos.' }} />);
    expect(document.getElementById('login-mensagem')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-431
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Exibir exatamente o texto recebido da API ou do formulário
   * @resultadoEsperado O texto aparece sem alterações
   */
  test('exibe o texto recebido', () => {
    render(<Mensagem mensagem={{ tipo: 'erro', texto: 'Paciente suspenso por faltas até 2026-11-18.' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Paciente suspenso por faltas até 2026-11-18.');
  });

  /**
   * @caso CT-UNI-432
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Acompanhar o erro de um ícone sem depender dele para entender a mensagem
   * @resultadoEsperado O alerta contém um svg decorativo
   */
  test('acompanha o erro com ícone decorativo', () => {
    const { container } = render(<Mensagem mensagem={{ tipo: 'erro', texto: 'Falha.' }} />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Icone', () => {
  /**
   * @caso CT-UNI-433
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Não duplicar a leitura de ícones puramente visuais
   * @resultadoEsperado O svg é aria-hidden e não focável
   */
  test('ícone é decorativo e não focável', () => {
    const { container } = render(<Icone nome="calendario" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  /**
   * @caso CT-UNI-434
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Usar um tamanho padrão consistente entre telas
   * @resultadoEsperado Sem prop tamanho, o svg tem 18x18
   */
  test('usa tamanho padrão de 18', () => {
    const { container } = render(<Icone nome="check" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '18');
    expect(svg).toHaveAttribute('height', '18');
  });

  /**
   * @caso CT-UNI-435
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo adaptabilidade
   * @requisito RNF06
   * @objetivo Ajustar o ícone ao contexto visual
   * @resultadoEsperado A prop tamanho altera largura e altura
   */
  test('aceita tamanho customizado', () => {
    const { container } = render(<Icone nome="usuarios" tamanho={36} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '36');
    expect(svg).toHaveAttribute('height', '36');
  });
});

describe('Vazio e LinhasEsqueleto', () => {
  /**
   * @caso CT-UNI-436
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Explicar listas vazias com ícone e texto
   * @resultadoEsperado O componente mostra o texto e um ícone
   */
  test('Vazio mostra texto e ícone', () => {
    const { container } = render(<Vazio>Nenhuma consulta encontrada.</Vazio>);
    expect(screen.getByText('Nenhuma consulta encontrada.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-437
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Indicar carregamento sem prender a atenção do leitor de tela
   * @resultadoEsperado LinhasEsqueleto cria a quantidade pedida de linhas ocultas
   */
  test('LinhasEsqueleto cria linhas decorativas', () => {
    const { container } = render(
      <table><tbody><LinhasEsqueleto colunas={4} linhas={2} /></tbody></table>,
    );
    const linhas = container.querySelectorAll('tr[aria-hidden="true"]');
    expect(linhas).toHaveLength(2);
    expect(linhas[0].querySelectorAll('td')).toHaveLength(4);
  });

  /**
   * @caso CT-UNI-438
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Manter o padrão de três linhas quando nada é informado
   * @resultadoEsperado LinhasEsqueleto cria três linhas por padrão
   */
  test('LinhasEsqueleto usa três linhas por padrão', () => {
    const { container } = render(
      <table><tbody><LinhasEsqueleto colunas={2} /></tbody></table>,
    );
    expect(container.querySelectorAll('tr')).toHaveLength(3);
  });

  /**
   * @caso CT-UNI-439
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF06
   * @objetivo Não mostrar ícone quebrado para um nome desconhecido
   * @resultadoEsperado O svg é renderizado vazio, sem lançar erro
   */
  test('ícone desconhecido não quebra a renderização', () => {
    const { container } = render(<Icone nome="inexistente" />);
    expect(container.querySelector('svg')).toBeEmptyDOMElement();
  });

  /**
   * @caso CT-UNI-440
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Não anunciar mensagem duplicada no alerta de sucesso
   * @resultadoEsperado A mensagem de sucesso não ocupa o papel de alerta
   */
  test('mensagem de sucesso não é tratada como alerta', () => {
    render(<Mensagem mensagem={{ tipo: 'sucesso', texto: 'Consulta agendada.' }} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```
