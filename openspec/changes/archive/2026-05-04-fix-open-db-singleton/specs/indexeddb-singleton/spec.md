## ADDED Requirements

### Requirement: Singleton database connection
The system SHALL provide a single shared IndexedDB connection via `getDb()` that all consumers import.

#### Scenario: Single openDB call
- **WHEN** `getDb()` is called from any module
- **THEN** the same `openDB` promise is returned for all callers
- **AND** `openDB` is invoked at most once per application lifetime

### Requirement: Unified upgrade callback
The `upgrade` callback registered via `getDb()` SHALL create all required object stores regardless of which module triggers the first database open.

#### Scenario: All stores created on first open
- **WHEN** the database is opened for the first time (or upgraded from an older version)
- **THEN** the `providers`, `conversations`, `messages`, `mindmaps`, and `zustand-persist` object stores all exist

### Requirement: Existing consumers unaffected
Modules previously calling `openDB` directly SHALL obtain the database connection via `getDb()` with no change in behavior.

#### Scenario: storage.ts uses getDb
- **WHEN** `storage.ts` performs a CRUD operation
- **THEN** the operation succeeds using the shared database connection

#### Scenario: indexeddb-storage-adapter.ts uses getDb
- **WHEN** Zustand persist middleware reads or writes state
- **THEN** the operation succeeds using the shared database connection
