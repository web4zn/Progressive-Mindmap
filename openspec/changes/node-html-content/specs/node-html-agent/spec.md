## ADDED Requirements

### Requirement: Agent generates HTML content

The Agent system prompt SHALL instruct the LLM to generate `content` fields in HTML format, with a defined tag whitelist.

The system prompt SHALL include:
- A list of allowed HTML tags with descriptions
- Examples of good HTML content structure
- A list of prohibited constructs (script, iframe, event handlers)
- Content length guidance (300-800 characters)

#### Scenario: Agent creates node with HTML content
- **WHEN** the Agent generates an `add_child` operation
- **AND** the operation includes `contentType: 'html'` and HTML-formatted `content`
- **THEN** the new node SHALL have HTML content rendered in the mindmap

#### Scenario: Agent uses allowed tags
- **WHEN** the Agent generates content with `<h3>`, `<ul>`, `<li>`, `<code>`
- **THEN** all tags SHALL survive DOMPurify sanitization
- **THEN** the content SHALL render as expected

### Requirement: Operation types support content field

The MindmapOperation types SHALL be extended to include `content` and `contentType` fields.

- `add_child` and `add_root` operations SHALL accept optional `content?: string` and `contentType?: 'text' | 'html'`
- `update` operation's `patch` SHALL accept optional `content?: string` and `contentType?: 'text' | 'html'`
- `newNodeFromOp` SHALL propagate `content` and `contentType` to the created node

#### Scenario: add_child with HTML content
- **WHEN** the LLM outputs `{ type: 'add_child', parentId: 'a1', label: 'Topic', content: '<p>Details</p>', contentType: 'html' }`
- **THEN** the new node SHALL have `content: '<p>Details</p>'` and `contentType: 'html'`

#### Scenario: update patch includes content
- **WHEN** the LLM outputs `{ type: 'update', nodeId: 'a1', patch: { content: '<p>New</p>', contentType: 'html' } }`
- **THEN** the node SHALL be updated with the new content
