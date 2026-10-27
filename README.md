# Remanejamento — Grupo São José

Sistema interno para controle de remanejamentos entre filiais do Grupo São José. A aplicação permite cadastrar remanejamentos entre lojas, importar pedidos agrupados em `.csv`/`.xlsx`, importar remanejamentos do Trier, acompanhar a separação na filial de origem e consultar os recebimentos previstos nos destinos.

> **Sistema interno.** Os fluxos principais usam PostgreSQL via Prisma ORM 6.19.3. O login por filial usa bcrypt, há auditoria persistente e bloqueio temporário por origem. A porta padrão da aplicação é `4646`.

## Stack

- [Next.js 16](https://nextjs.org/) com App Router e Turbopack
- React 19 e TypeScript
- Tailwind CSS 4
- Componentes de interface próprios no estilo shadcn/ui
- [Lucide React](https://lucide.dev/) para ícones
- [read-excel-file](https://www.npmjs.com/package/read-excel-file) para leitura de `.xlsx`
- [Vitest](https://vitest.dev/) para testes automatizados
- PostgreSQL e Prisma ORM 6.19.3
- bcryptjs para hash e verificação de senhas de filial

## Como executar

Requisitos: Node.js 20 ou superior e npm.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Para simular o build de produção:

```bash
npm run build
npm run start
```

## Acessos

### Filial

Na tela inicial, escolha uma das 11 filiais cadastradas no PostgreSQL e informe a senha da filial. As credenciais iniciais são provisórias e precisam ser trocadas no primeiro acesso.

A filial autenticada vê:

- visão geral com pendências, separações em andamento e recebimentos;
- todos os remanejamentos em que é origem ou destino;
- fila de separação somente com tarefas em que é a origem.

### Comprador

Abra **Login comprador**, informe a senha configurada e confirme. A senha é conferida no servidor por `scrypt`; o hash pode ser definido em `COMPRADOR_SENHA_HASH` (veja `.env.example`). Não há senha padrão de produção.

O comprador vê toda a rede, pode criar novos remanejamentos, importar pedidos agrupados e acompanhar o andamento, mas não altera itens da separação: essa ação pertence à loja de origem.

A tela **Importar pedido agrupado** fica em `/comprador/importar` e exige a sessão do comprador.

## Autenticação por filial, auditoria e bloqueios

### Credenciais iniciais

O seed cria uma credencial provisória apenas para filiais sem `senha_hash`. Filiais que já possuem hash são preservadas. O algoritmo determinístico é:

1. Nome da filial sem acentos, sem caracteres não alfanuméricos e em minúsculas.
2. Os 8 primeiros caracteres do nome normalizado (ou `filial` se vazio).
3. Os 4 últimos dígitos do CNPJ.

Exemplo: `Matriz` + `10846217000170` → `matriz0170`.

A senha nunca é persistida em texto puro; o banco guarda somente o hash bcrypt. Para consultar as credenciais provisórias de forma controlada, rode manualmente no servidor:

```bash
CONFIRMAR_EXIBICAO=1 npm run credenciais:iniciais
```

O comando imprime apenas filiais com `precisa_trocar_senha = true` e não grava log persistente. No primeiro acesso, o sistema exige a troca da senha em `/conta/trocar-senha`.

### Bloqueio por origem

- Três tentativas inválidas consecutivas em até dois minutos bloqueiam a combinação filial + IP por dois minutos.
- A contagem e o bloqueio ficam no PostgreSQL (`tentativas_login` e `bloqueios_origem`), com advisory lock transacional por origem para segurança sob concorrência.
- A expiração é calculada comparando `bloqueado_ate` com o horário do servidor; não há timers em memória e o bloqueio sobrevive a reinícios.
- Tentativas durante o bloqueio são registradas como `motivo = bloqueado` e não geram novo bloqueio permanente.
- O bloqueio global por IP é opcional (`BLOQUEIO_GLOBAL_ATIVO=true`) e deve ser avaliado com cuidado em redes com NAT compartilhado.
- Cookies de sessão de filial são assinados com HMAC, `HttpOnly`, `SameSite=Lax` e `Secure` quando `COOKIE_SEGURO=true`. A versão da credencial invalida sessões antigas após a troca de senha.

### IP e geolocalização

- `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP` e `True-Client-IP` só são usados quando `TRUSTED_PROXIES` está configurado. O proxy deve remover cabeçalhos enviados pelo cliente e reescrevê-los.
- Sem proxy confiável, o IP observado fica indisponível; o login não é bloqueado por isso.
- Coordenadas enviadas pelo navegador são validadas (faixa geográfica e números finitos) e registradas com `origem = informada_pelo_cliente`, nunca como estimativa por IP. Nenhuma localização é inventada.

### LGPD e retenção

- Finalidade: segurança da autenticação, prevenção a fraude/abuso e rastreabilidade de operações críticas.
- Dados coletados: IP observado, origem da requisição, filial/sessão, tipo e resultado da ação, descrição objetiva, entidade afetada e, quando validamente fornecida, geolocalização.
- Senhas, hashes, tokens e segredos nunca são gravados na auditoria.
- Recomendação de retenção: logs de auditoria por 180 dias e tentativas de login por 90 dias, salvo exigência legal ou investigação em andamento. A limpeza deve ser feita por rotina administrativa, nunca pela interface comum.
- O acesso à página `/comprador/auditoria` é restrito à sessão do comprador. Não há ação de edição ou exclusão de logs na aplicação.

### Eventos auditados

Login (sucesso, senha incorreta, bloqueio e tentativa durante bloqueio), expiração de bloqueio, logout, criação/início/conclusão de separação de remanejamentos, preparação (validação) e confirmação de importações, tentativas sem autorização e alteração de credenciais de filial.

A página de auditoria exibe no máximo 100 registros por consulta, ordenados do mais recente para o mais antigo, com filtros por período, filial, tipo, resultado e IP. A paginação usa cursor por data/hora + identificador; o limite de exibição não remove registros do banco.

## Importação de pedido agrupado

### Como enviar

1. Selecione a **loja física de origem**, ou seja, a filial que recebeu o pedido.
2. Envie o arquivo original em `.csv` ou `.xlsx` (até 6 MB).
3. Revise a prévia: resumo, avisos, erros e o detalhe por loja de destino.
4. Confirme. Nenhum remanejamento é criado antes dessa etapa.

Arquivos `.xls` (Excel 97-2003) são recusados com mensagem clara; salve como `.xlsx` ou `.csv`. CSV é lido como UTF-8 (com ou sem BOM) e, quando o conteúdo não é UTF-8 válido, como Windows-1252. O `.xlsx` é lido pela biblioteca `read-excel-file`.

### Estrutura esperada

O arquivo contém blocos de pedido em sequência. Linhas em branco entre blocos são permitidas.

```text
Pedido;Data Pedido;Fornecedor;CNPJ Filial;Nome Filial
88421;12/03/2026;Distribuidora Alfa Ltda;10.846.217/0003-32;Original Jaguaruana
Código Reduzido;EAN Principal;Descrição;Quantidade;Laboratório
5010;="7891000056523";Dipirona 500 mg — 20 comprimidos;4;Medley
```

- Os cabeçalhos são reconhecidos pelo rótulo, não pela posição.
- O bloco de pedido precisa mapear ao menos 3 campos, incluindo `Pedido` e `CNPJ Filial`.
- O bloco de produtos precisa mapear ao menos 3 campos, incluindo `Quantidade`.
- EANs em fórmula, como `="7891000056523"`, são lidos como texto e preservam zeros à esquerda.

### Vínculo por CNPJ

Os nomes e CNPJs oficiais ficam em `src/data/lojas.ts`, fonte única usada pelo restante da aplicação. O vínculo é feito **somente** pelo CNPJ normalizado para 14 dígitos:

- pontuação é removida e zeros à esquerda são preservados;
- o nome da filial e o número da loja no arquivo não definem o destino;
- CNPJ desconhecido ou com quantidade de dígitos inválida bloqueia a confirmação.

### Regras da prévia

- Itens do CNPJ da loja de origem permanecem nela e **nunca** geram autotransferência. A prévia informa quantos itens e unidades ficaram na origem.
- É criado **um remanejamento por loja de destino**, com número/data do pedido, fornecedor, CNPJ e nome do destino, itens e referência da importação.
- O mesmo EAN pode aparecer em lojas diferentes, com quantidades independentes.
- Linhas repetidas no mesmo pedido/loja são preservadas e sinalizadas, em vez de consolidadas automaticamente.
- Quantidades negativas, zero, fracionadas, vazias ou não numéricas bloqueiam a confirmação.
- Blocos sem produtos geram aviso; produtos sem bloco válido geram erro; importação apenas com itens da origem não pode ser confirmada.
- Produto sem descrição ou sem EAN gera aviso, mas pode ser mantido por código/descrição quando identificável.

### Confirmação e limites da demonstração

- A confirmação é revalidada no servidor e usa um token vinculado à prévia analisada.
- A prévia expira em **30 minutos**. Confirmações repetidas são rejeitadas sem criar registros extras.
- A gravação é **tudo ou nada**: uma falha de persistência não deixa importação parcial.
- O cache de prévias e o repositório de confirmação vivem **somente na memória do processo**, com limite de 20 prévias. Reiniciar o servidor ou trocar de instância perde essas prévias.
- Após confirmar, os remanejamentos são inseridos no estado React da sessão. **Recarregar a página restaura os dados fictícios.** Não há persistência durável nem envio para produção.

### Testes automatizados

```bash
npm test        # executa a suíte uma vez
npm run test:watch
```

A suíte cobre mapeamento por CNPJ, zeros à esquerda, CNPJ desconhecido, exclusão da origem, ausência de autotransferência, preservação de quantidades e repetições, EAN em fórmula, linhas em branco, CSV Windows-1252, `.xlsx` real, rejeição de `.xls`, estruturas incompletas, quantidades inválidas, ausência de gravação antes da confirmação, confirmação duplicada, adulteração de prévia e falha de persistência. O arquivo de exemplo é `tests/fixtures/pedido-agrupado.csv`.


## Fluxo e regras implementadas

1. A **loja de origem** é a filial que possui a mercadoria e deve separá-la.
2. A origem **não pode ser destino** no mesmo remanejamento.
3. Um remanejamento pode ter **vários destinos**.
4. Cada produto aceita **EAN opcional** e quantidades independentes por destino.
5. A filial de origem recebe a tarefa na **fila de separação**.
6. Cada item pode ser marcado como separado, com progresso e status atualizados.
7. A conclusão exige **todos os itens separados** e o **nome do responsável**.
8. Há confirmação em diálogo antes de concluir a separação.
9. A conclusão registra responsável, data/hora e muda o status para **Separada**.
10. O acesso às áreas protegidas é validado no servidor por cookies `httpOnly`.

## O que funciona nesta demonstração

- Seleção de qualquer uma das 11 filiais e troca de filial via logout.
- Login do comprador com validação de senha no servidor.
- Painéis responsivos para desktop, tablet e celular.
- Contadores por status, listas recentes, filtros por loja, status e relação.
- Busca por número, loja, responsável, produto e EAN.
- Cadastro de remanejamento com origem, múltiplos destinos, produtos, EAN e quantidades por loja.
- Importação de pedido agrupado em `.csv`/`.xlsx`, com prévia, mapeamento por CNPJ, exclusão da origem e confirmação atômica.
- Validações de origem, destinos, produtos, EAN, quantidades e duplicidades.
- Separação item por item, progresso, responsável e confirmação final.
- Restauração dos dados fictícios pelo botão **Restaurar dados** no aviso de demonstração.

## Limitações e controles remanescentes

- A prévia de importação ainda usa cache em memória por 30 minutos. A confirmação é persistida no PostgreSQL e é idempotente, mas um reinício do processo exige reenviar o arquivo.
- A senha da filial é compartilhada pela equipe da loja. A auditoria identifica a filial/sessão, não um funcionário individual. Para responsabilização individual, é necessário evoluir para usuários nominais.
- A aplicação não implementa envio de mercadoria, estoque fiscal, integração de transportadora ou impressão.
- O seed não roda automaticamente no build. Execute-o apenas de forma deliberada.
- Antes de produção: configurar `SESSAO_SECRET` forte, `COOKIE_SEGURO=true` com HTTPS, `TRUSTED_PROXIES` conforme o proxy real e revisar a política de retenção.

## Estrutura principal

```text
src/
├── app/
│   ├── login/                  # seleção de filial, senha e login do comprador
│   ├── conta/trocar-senha/     # troca obrigatória da credencial provisória
│   ├── painel/                 # área da filial (protegida)
│   │   ├── remanejamentos/     # lista e detalhe
│   │   └── separacao/          # fila e detalhe de separação
│   └── comprador/              # área do comprador (protegida)
│       ├── importar/           # upload, prévia e confirmação do pedido
│       └── remanejamentos/     # lista, novo e detalhe
├── components/
│   ├── auth/                   # diálogo de login do comprador
│   ├── importacao/             # assistente de importação
│   ├── layout/                 # shells, navegação e aviso de demonstração
│   ├── providers/              # estado fictício global e filial atual
│   ├── remanejamentos/         # tabela, detalhe, separação e formulário
│   └── ui/                     # componentes reutilizáveis
├── data/                       # lojas e remanejamentos fictícios
└── lib/
    ├── auth/                   # cookies, HMAC e verificação scrypt
    ├── data/                   # consultas e filtros da demonstração
    ├── importacao/             # parsing, análise, geração e confirmação
    ├── cnpj.ts                 # normalização e formatação de CNPJ
    ├── format.ts               # datas, quantidades e resumos
    ├── status.ts               # metadados dos status
    └── types.ts                # modelos do domínio
tests/                          # Vitest, fixture e gerador de .xlsx
```

## Variáveis de ambiente

Copie `.env.example` para `.env.local` apenas se quiser trocar os valores de demonstração.

| Variável | Uso |
| --- | --- |
| `SESSAO_SECRET` | Segredo usado na assinatura HMAC do cookie do comprador. |
| `COMPRADOR_SENHA_HASH` | Hash `scrypt` da senha do comprador, no formato `scrypt$salt$hash`. |
| `COOKIE_SEGURO` | Use `true` para marcar cookies como `Secure` em HTTPS. |

Em produção, configure um segredo forte e substitua a senha/hash de demonstração por autenticação real.

## Scripts

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção
npm run start      # servidor de produção após o build
npm run lint       # ESLint
npm run typecheck  # TypeScript sem emissão
npm test           # testes automatizados (Vitest)
npm run test:watch # testes em modo watch
```

## Verificações executadas

Resultados reais desta etapa:

- `npm run typecheck` — passou.
- `npm run lint` — passou sem erros ou avisos.
- `npm run build` — passou; `/comprador/importar` incluída nas rotas geradas.
- `npm test` — 18 testes passaram.
- Verificações HTTP dos redirecionamentos de acesso e da sessão assinada do comprador em servidor de produção local.

## Próximos passos sugeridos

1. Modelar as tabelas no Supabase/PostgreSQL (lojas, produtos, remanejamentos, itens, usuários e eventos).
2. Substituir `RemanejamentoRepository` por consultas reais e server actions com validação/autorização.
3. Persistir prévias de importação com expiração, escopo por usuário e idempotência no banco, em vez de memória do processo.
4. Implementar Supabase Auth ou outro provedor com perfis de comprador e filial.
5. Registrar trilha de auditoria para importação, início e conclusão de separação.
6. Publicar na Vercel com variáveis de ambiente e cookies seguros.
