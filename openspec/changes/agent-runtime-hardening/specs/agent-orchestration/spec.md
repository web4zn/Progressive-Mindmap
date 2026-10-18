## ADDED Requirements

### Requirement: Run cancellation

The system SHALL allow the user to cancel an in-flight Agent run.

Cancellation SHALL abort the run's LLM call and terminate its ReAct loop before
the next step; no further tool calls SHALL be executed for the cancelled run.
The worker SHALL report `AGENT_CANCELLED` for that `runId`, and the main thread
SHALL clear the run context, return the agent status to `idle`, and finalise any
streaming assistant message owned by the run.

Cancelling an unknown or already-finished run SHALL be a no-op.

#### Scenario: Cancel a background enhancement

- **WHEN** an `ENHANCE_MESSAGE` run is in flight and the user cancels it
- **THEN** the LLM call is aborted, the ReAct loop stops, and the agent status returns to `idle`
- **AND** no further mindmap operations are applied for that run

#### Scenario: Cancel a mediate run

- **WHEN** a `MEDIATE_MESSAGE` run is streaming and the user cancels it
- **THEN** the run stops and its streaming assistant message is marked complete with the content received so far
- **AND** the agent status returns to `idle`

#### Scenario: Cancel an unknown run

- **WHEN** a cancellation targets a `runId` that has no active context
- **THEN** the system ignores it and no status or message changes
