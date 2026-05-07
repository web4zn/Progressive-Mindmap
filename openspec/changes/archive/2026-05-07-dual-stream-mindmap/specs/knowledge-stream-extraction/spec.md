## Purpose

Enable real-time extraction of structured knowledge from streaming chat responses. Every chat response carries a knowledge block alongside the natural language answer, eliminating the need for a separate mindmap generation step.

## Requirements

### Requirement: Knowledge block format
The system SHALL define a knowledge block format appended to each chat response. The knowledge block SHALL use the following delimiter markers:

- Start marker: `<!--KNWL-->`
- End marker: `<!--/KNWL-->`
- Content between markers SHALL be valid JSON array of KnowledgeNode objects

KnowledgeNode schema:
```typescript
interface KnowledgeNode {
  label: string           // concept name, max 30 chars
  category: string[]      // hierarchical path from root to this concept
  summary: string         // one-line description, max 100 chars
  content?: string        // optional detailed Markdown content
  contentType?: "text" | "markdown"
}
```

#### Scenario: Well-formed knowledge block
- **WHEN** LLM response contains `<!--KNWL-->[{"label":"useState","category":["React","Hooks"],"summary":"..."}]<!--/KNWL-->`
- **THEN** system parses the JSON array and extracts each KnowledgeNode for mindmap application

#### Scenario: Empty knowledge block
- **WHEN** LLM response contains `<!--KNWL-->[]<!--/KNWL-->`
- **THEN** system recognizes the block but applies zero nodes (no mindmap update needed)

#### Scenario: No knowledge block in response
- **WHEN** LLM response does not contain `<!--KNWL-->` markers
- **THEN** system falls back to the batch generation flow with 2s debounce

### Requirement: Stream parsing state machine
The chat stream handler SHALL implement a state machine to detect, buffer, and strip knowledge blocks during streaming.

States:
- `normal`: Buffering chat text for display; scanning for `<!--KNWL-->`
- `knowledge`: Buffering content between `<!--KNWL-->` and `<!--/KNWL-->`; NOT displaying this content to user
- `complete`: Full knowledge block received; parsed JSON applied to mindmap

#### Scenario: State transition on start marker
- **WHEN** stream chunk contains `<!--KNWL-->`
- **THEN** system transitions from `normal` to `knowledge`, strips the marker from display content, and begins buffering the knowledge JSON

#### Scenario: State transition on end marker
- **WHEN** stream chunk contains `<!--/KNWL-->`
- **THEN** system transitions from `knowledge` to `complete`, parses the buffered JSON, and updates the mindmap

#### Scenario: Knowledge block split across multiple chunks
- **WHEN** `<!--KNWL-->` and `<!--/KNWL-->` arrive in different stream chunks
- **THEN** system correctly accumulates the partial JSON across chunks and only parses when end marker is received

### Requirement: Knowledge extraction prompt injection
The system SHALL inject knowledge extraction instructions into the chat system prompt. The instructions SHALL be appended after the user-configured system prompt.

The injected instructions SHALL:
- Define the `<!--KNWL-->` delimiter format
- Provide the KnowledgeNode schema
- Instruct the LLM to include every distinct concept mentioned in the answer
- Instruct the LLM to use consistent `category` paths across responses for the same concept
- Instruct the LLM to omit the knowledge block entirely if no substantive concepts are mentioned

#### Scenario: Dual prompt with existing system prompt
- **WHEN** user has configured a custom system prompt "You are a React expert"
- **THEN** the effective prompt becomes: user prompt + knowledge extraction instructions
- **AND** the knowledge extraction instructions do not override the user system prompt

### Requirement: Knowledge node dedup and merge
System SHALL apply knowledge nodes to the mindmap tree using algorithmic merge (not LLM). Merge rules:

1. For each KnowledgeNode, traverse the tree following its `category` path
2. At each path level, find matching node by fuzzy label comparison (Levenshtein distance < 30% of label length)
3. If matching node exists at leaf level: update label/summary/content (unless `editedByUser`)
4. If no matching node at leaf level: create new node
5. If intermediate path node missing: create intermediate nodes

#### Scenario: Add new concept to existing branch
- **WHEN** knowledge node `{label:"useEffect", category:["React","Hooks"]}` arrives and tree has `React > Hooks` with no `useEffect` child
- **THEN** system adds `useEffect` as a child of `Hooks` node

#### Scenario: Update existing concept
- **WHEN** knowledge node `{label:"useState", category:["React","Hooks"], summary:"Updated summary"}` and `React > Hooks > useState` already exists
- **THEN** system updates summary to "Updated summary" (unless editedByUser)

#### Scenario: Create new branch for new category path
- **WHEN** knowledge node `{label:"ref", category:["Vue"]}` and no `Vue` node exists
- **THEN** system creates `Vue` as a new root node with `ref` as child

#### Scenario: Fuzzy match for minor label variation
- **WHEN** knowledge node `{label:"useState Hook", category:["React","Hooks"]}` and existing node label is `useState`
- **THEN** fuzzy comparison (edit distance < 30%) matches them as same concept

#### Scenario: editedByUser protection
- **WHEN** knowledge node tries to update a node where `editedByUser === true`
- **THEN** system skips the update and preserves the user-edited content
