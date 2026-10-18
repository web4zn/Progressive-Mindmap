## ADDED Requirements

### Requirement: Streaming retry policy

The system SHALL retry a failed streaming chat request only when all of the
following hold:

- no content has been delivered to the UI yet (retrying after a partial stream
  would duplicate tokens),
- the failure is retryable (connection error, HTTP 429, or HTTP 5xx),
- the request was not aborted by the user.

At most two retries SHALL be attempted, with exponential backoff (500 ms, then
1 s). Non-retryable failures (e.g. HTTP 401/404) SHALL surface immediately.

#### Scenario: Retry before any content arrives

- **WHEN** the first streaming attempt fails with a retryable error before any token is shown
- **THEN** the system retries after the backoff delay
- **AND** the successful attempt streams normally

#### Scenario: Do not retry after partial output

- **WHEN** the stream fails after content has already been displayed
- **THEN** no retry is attempted and the message is marked as an error

#### Scenario: Do not retry an abort

- **WHEN** the user stops generation
- **THEN** the abort is not retried and the partial content is kept as complete
