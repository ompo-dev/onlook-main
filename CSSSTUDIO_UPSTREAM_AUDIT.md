# CSS Studio Upstream Audit

## Objetivo

Este repositório agora mantém **dois engines de CSS Studio**:

- `legacy`: o clone/customização que já adaptamos ao fluxo do Onlook e dos iframes.
- `upstream`: o pacote oficial `cssstudio@1.1.0`, instalado para estudo, comparação e futuras atualizações.

O objetivo deste documento é mapear de forma prática:

1. o que foi instalado;
2. como o pacote oficial funciona;
3. como ele foi integrado ao app atual;
4. como coexistir com o Studio legado sem quebrar o core do projeto aberto.

---

## Estado Atual No Repositório

### Engine legado

- Entrada principal: `apps/web/client/src/components/studio/css-studio-legacy.tsx`
- UI principal: `apps/web/client/src/components/studio/editor/**`
- Runtime: `apps/web/client/src/components/studio/runtime.ts`

Esse engine continua sendo o padrão do produto, porque é o que já conhece:

- seleção em elementos dentro dos iframes;
- docks adaptados ao fluxo do Onlook;
- integração com `EditorEngine`;
- painéis `Elements`, `Pages`, `Images`, `Brand`, `Branches`, `Code`, `Chat`.

### Engine upstream

- Pacote instalado: `cssstudio@1.1.0`
- Wrapper local: `apps/web/client/src/components/studio/css-studio-upstream.tsx`
- Tipos locais: `apps/web/client/src/types/cssstudio.d.ts`

O engine upstream sobe via:

```ts
import { startStudio } from 'cssstudio';
```

e é montado apenas em `development`.

### Dispatcher entre os dois

- Arquivo: `apps/web/client/src/components/studio/css-studio.tsx`

Esse componente decide qual engine renderizar:

- `legacy` -> renderiza nosso Studio atual;
- `upstream` -> chama `startStudio()` do pacote oficial.

---

## Pacote Instalado

### Metadados

- pacote: `cssstudio`
- versão: `1.1.0`
- repositório: `https://github.com/motiondivision/css-studio-public.git`
- commit publicado no pacote: `7db62071087dd739207b2920bfaaf7010ab34173`

### Entrypoints

Arquivo `node_modules/cssstudio/package.json`:

- `main`: `dist/cssstudio.js`
- `module`: `dist/cssstudio.mjs`
- `bin`: `dist/bin.js`

### Dependências do pacote

- `immer`
- `motion`
- `motion-dom`
- `ws`
- `zod`
- `zustand`
- `@modelcontextprotocol/sdk`

### Peer dependencies

- `react >=18`
- `react-dom >=18`

---

## O Que O Bundle Oficial Faz

O bundle oficial em `node_modules/cssstudio/dist/cssstudio.mjs` é fechado e já traz:

- runtime React;
- store Zustand/Immer;
- CSS inline do editor;
- toolbar;
- panels;
- responsive view;
- overlays e visual controls;
- chat/task rail;
- MCP bridge.

### Comportamento de `startStudio()`

Pelo bundle oficial:

1. se `window.name === "css-studio-responsive-frame"`, ele sobe um agente específico de iframe;
2. se o host já existe, ele retorna cleanup vazio;
3. cria um host fixo com `z-index: 2147483647`;
4. anexa `shadowRoot`;
5. injeta fontes + tema base + CSS compilado;
6. cria layers internos como:
   - `cs-responsive-layer`
   - `cs-controls-layer`
7. monta a app React do CSS Studio dentro desse host;
8. retorna uma função de cleanup.

### Observação importante

O upstream oficial foi pensado para editar a **página atual real**, não o modelo híbrido do Onlook com projeto rodando dentro de iframes e editor por fora. Por isso ele está integrado aqui como **engine alternativo para estudo/upgrade**, não como substituto final do legado adaptado.

---

## Instalação Executada

### 1. Pacote

Instalação feita em `apps/web/client`:

```bash
bun add cssstudio
```

### 2. Skill + MCP

Instalação feita na raiz do repo:

```bash
bunx cssstudio install
```

### 3. Arquivos gerados pelo instalador

O instalador do pacote gera múltiplas integrações para vários agentes. Para o nosso fluxo atual, o que interessa é:

- `.agents/skills/studio/SKILL.md`
- `.codex/config.toml`

O skill novo é mais avançado que o skill antigo e já traz:

- conexão inicial obrigatória;
- suporte a channel events;
- polling fallback;
- ações `panic`, `calm`, `ask`, `message`, `responding`, `chat`;
- suporte a mudanças estruturadas como `style`, `text`, `attr`, `delete`, `token`, `keyframe`.

---

## Integração Feita Neste Projeto

### Runtime local

Arquivo: `apps/web/client/src/components/studio/runtime.ts`

Além do `mode`, agora existe:

```ts
export type StudioEngine = 'legacy' | 'upstream';
```

### Persistência local

Storage keys:

- `onlook:studio:mode`
- `onlook:studio:engine`
- `onlook:studio:native:settings`

### Engine padrão

O padrão atual é:

```ts
legacy
```

Motivo:

- é o engine adaptado ao fluxo de iframes do Onlook;
- o upstream oficial ainda não entende esse modelo de operação.

### Toggle de engine

Arquivo: `apps/web/client/src/components/studio/editor/Settings/index.tsx`

A UI de configurações agora permite alternar entre:

- `Legacy`
- `New`

O engine `New` só é ativado em `development`.

### Wrapper do engine upstream

Arquivo: `apps/web/client/src/components/studio/css-studio-upstream.tsx`

Comportamento:

- importa `startStudio` do pacote oficial;
- chama `startStudio({ mcpPort, mode })` dentro de `useEffect`;
- registra cleanup ao desmontar;
- não tenta reimplementar UI ou estilos do pacote.

---

## Estratégia De Coexistência

### Quando usar `legacy`

Usar o legado para:

- fluxo real do produto;
- seleção dentro dos iframes;
- integração com `EditorEngine`;
- comportamento esperado do canvas do Onlook;
- customizações locais do projeto.

### Quando usar `upstream`

Usar o upstream para:

- comparar UX/UI com a versão oficial;
- inspecionar comportamento novo do pacote;
- mapear diferenças para futuras atualizações do legado;
- validar rapidamente novos recursos que chegaram no pacote oficial.

### Limitação atual do upstream

O upstream **não substitui automaticamente** o sistema adaptado aos iframes. Ele sobe como editor da página atual, não como bridge nativa do modelo do Onlook.

---

## Diferenças Relevantes Entre Legacy E Upstream

### Legacy

- profundamente acoplado ao `EditorEngine`;
- opera sobre seleção/frames do Onlook;
- usa painéis herdados/adaptados do app;
- mantém o core funcionando no `/project/[id]`.

### Upstream

- bundle fechado;
- host próprio com `shadowRoot`;
- CSS e layout internos compilados;
- install/skill/MCP próprios;
- pensado para rodar “junto do site”, não “fora do site editando um iframe”.

---

## Arquivos-Chave Para Futuras Atualizações

### Runtime e seleção de engine

- `apps/web/client/src/components/studio/runtime.ts`
- `apps/web/client/src/components/studio/css-studio.tsx`
- `apps/web/client/src/components/studio/css-studio-legacy.tsx`
- `apps/web/client/src/components/studio/css-studio-upstream.tsx`

### UI do Studio legado

- `apps/web/client/src/components/studio/editor/**`

### Skill/MCP do pacote novo

- `.agents/skills/studio/SKILL.md`
- `.codex/config.toml`

### Bundle oficial para auditoria

- `node_modules/cssstudio/dist/cssstudio.mjs`
- `node_modules/cssstudio/dist/cli.mjs`
- `node_modules/cssstudio/README.md`

---

## Recomendação Para Evolução

### Curto prazo

1. manter `legacy` como padrão;
2. usar `upstream` apenas como engine de comparação;
3. registrar diferenças de UI, state e comportamento;
4. portar mudanças do upstream de forma controlada para o legado.

### Médio prazo

1. mapear os módulos oficiais por feature:
   - toolbar
   - settings
   - responsive view
   - chat/task rail
   - panels
   - visual controls
2. comparar cada feature com nosso clone/adaptação;
3. decidir o que deve ser:
   - absorvido diretamente;
   - reimplementado;
   - descartado por incompatibilidade com o fluxo do Onlook.

### Longo prazo

Se quisermos aposentar o legado, o upstream precisará primeiro ser adaptado para:

- operar em cima dos iframes do projeto;
- conversar com o `EditorEngine`;
- respeitar seleção, hover, overlays e code navigation do Onlook.

Sem isso, o upstream puro não cobre o caso principal do produto.

---

## Limpeza Relacionada

Durante essa integração, o client deixou de depender diretamente de `@onlook/stripe` para local mode. O pacote `@onlook/stripe` ainda permanece no monorepo porque partes de `packages/db` ainda tipam schema/seeds com ele.

Ou seja:

- **removido do client runtime**;
- **ainda presente no monorepo** enquanto existir dependência real de build/tipo em `packages/db`.

---

## Resumo Executivo

- o CSS Studio oficial novo está instalado;
- skill e MCP novos foram instalados;
- existe toggle entre `legacy` e `upstream`;
- `legacy` continua sendo o engine operacional do produto;
- `upstream` ficou disponível para estudo, comparação e futuras atualizações;
- o repositório já foi reduzido bastante, mas algumas workspaces ainda precisam existir porque o core do editor ainda depende delas.
