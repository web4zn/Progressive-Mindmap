# Mindmap UI — Stage B (panel layout)

> Locked snapshot of the Stage B OpenSpec (commit ec4f5f7). This
> file exists so the spec archive has a stable entry for the
> panel-layout work; the live contract lives in the source code
> (e.g. `MindMapPanel`, `MindMapHeader`, `MindMapDrawer`).

## ADDED Requirements

### Requirement: Three-section header

The mindmap panel header SHALL be a three-column grid
(`grid-cols-3`):

- **LEFT** — mindmap combobox + linked-conversation drawer trigger.
- **MIDDLE** — node count, pattern selector, agent status pill.
- **RIGHT** — export menu, fullscreen toggle, close panel.

The middle column centers its content; left and right align
their children to start / end respectively.

#### Scenario: Open a new mindmap
- **WHEN** the user clicks the combobox and picks a mindmap
- **THEN** the active mindmap id updates, the middle column
  shows the new node count, and the canvas re-renders

#### Scenario: Close the panel
- **WHEN** the user clicks the close button (X)
- **THEN** the parent (`ChatPage`) receives the `onClose` callback
  and hides the panel

### Requirement: Linked-conversation drawer

The mindmap panel SHALL expose a drawer that lists every
conversation whose id is in the active mindmap's
`monitoredConversationIds`. Each row carries a `取消关联`
(unlink) button.

#### Scenario: Open the drawer
- **WHEN** the user clicks the `关联会话` button in the header
- **THEN** the drawer slides in from the right, showing every
  linked conversation

#### Scenario: Unlink a conversation
- **WHEN** the user clicks `取消关联` on a row
- **THEN** the conversation id is removed from
  `monitoredConversationIds` and the row disappears

### Requirement: Pattern selector

The header SHALL expose a pattern dropdown with four options:
`自动` (auto), `5W1H`, `技术概念` (tech), `优缺点分析` (pros-cons).
Selecting an option SHALL update the active mindmap's
`pattern` field.

### Requirement: Resizable markdown edit modal

The node edit modal SHALL support markdown content (in addition
to the existing `text` and `html` types) and SHALL be resizable
via a bottom-right handle within a `[360, 900] × [400, 800]`
bound.

#### Scenario: Edit a markdown node
- **WHEN** the user Ctrl/⌘ + double-clicks a node with
  `contentType: 'markdown'`
- **THEN** the modal opens with the markdown source, the live
  preview is shown side-by-side, and the user can drag the
  bottom-right handle to resize

## Impact

- **UI**: header is restructured from one row to a 3-column grid;
  new drawer component; pattern dropdown; new edit modal.
- **State**: no store changes — the existing `mindmapStore` and
  `useMindmapStore` API is sufficient.
- **Data model**: `MindMapNode.contentType` adds `'markdown'` as a
  third option; old nodes still have only `'text' | 'html'`.
