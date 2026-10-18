## ADDED Requirements

### Requirement: Bounded streaming render cost

While an assistant message is streaming, the chat bubble SHALL render its content
as plain pre-wrapped text and SHALL NOT re-parse Markdown on every token. The
message SHALL be rendered as Markdown once its status becomes `complete`
(or `error`).

#### Scenario: Long answer streams as plain text

- **WHEN** an assistant message is streaming a long markdown answer
- **THEN** the bubble updates a plain text node per batch
- **AND** no markdown parse is performed until the message completes

#### Scenario: Completed answer becomes rich

- **WHEN** the streaming message completes
- **THEN** it is rendered with the markdown renderer (GFM)

### Requirement: Throttled streaming persistence

Store updates for a streaming message SHALL be throttled to at most ten per
second, and the final content plus completion status SHALL always be flushed.

#### Scenario: Streaming a long answer

- **WHEN** the model streams many batches in one second
- **THEN** the store is updated at most ten times
- **AND** the final content and status are written when the stream ends

### Requirement: Canvas virtualization

The mindmap canvas SHALL only render nodes inside the current viewport
(`onlyRenderVisibleElements`).

#### Scenario: Large mindmap

- **WHEN** the mindmap has hundreds of nodes and most are off-screen
- **THEN** only visible nodes are mounted

### Requirement: Single layout pass per tree change

The renderer SHALL run dagre layout at most once per tree change. The collapse
state hook SHALL NOT compute an unused layout.

#### Scenario: Editing a node

- **WHEN** the tree changes
- **THEN** exactly one dagre layout pass runs for the canvas

### Requirement: Vendor chunk splitting

The renderer production build SHALL split third-party code into vendor chunks
(react, flow/dagre, markdown, AI SDK) instead of emitting one monolithic bundle.

#### Scenario: Production build output

- **WHEN** `npm run build` runs
- **THEN** `out/renderer/assets` contains separate vendor chunks
- **AND** the entry chunk is materially smaller than the former single 2.7 MB bundle
