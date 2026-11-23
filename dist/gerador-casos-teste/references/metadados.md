# Metadados de cada caso de teste

**Cada chamada `test(...)` ou `it(...)` é um caso de teste** e deve ter, imediatamente acima dela, um bloco de comentário de documentação com as sete tags abaixo. Em JavaScript e TypeScript use `/** ... */`. Em outras linguagens, use o comentário de documentação equivalente, mantendo as tags iguais.

```js
/**
 * @caso CT-API-012
 * @nivel api
 * @atributo seguranca
 * @subatributo confidencialidade
 * @requisito RN30, RF10.1
 * @objetivo Usuário não consegue ver um recurso de outro usuário
 * @resultadoEsperado A API responde 403 com o código de erro SEM_PERMISSAO
 */
test('usuário recebe 403 ao buscar recurso de outro usuário', async () => {
  // preparar, agir, verificar
});
```

| Tag | Regra |
|---|---|
| `@caso` | Identificador único em todo o conjunto: `CT-UNI-001`, `CT-INT-001`, `CT-API-001`, `CT-E2E-001` (prefixo pelo nível, número sequencial de 3 dígitos). |
| `@nivel` | `unitario`, `integracao`, `api` ou `e2e`. |
| `@atributo` / `@subatributo` | Exatamente um dos identificadores de `piramide-e-iso.md`. |
| `@requisito` | Um ou mais identificadores da base de teste do projeto. |
| `@objetivo` | Uma frase: o que o caso verifica. |
| `@resultadoEsperado` | Uma frase: o que deve acontecer para o caso passar. |

Cada tag fica em uma linha só. O título do `test(...)` deve ser coerente com `@objetivo`.
