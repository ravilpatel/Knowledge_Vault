# Rule: Full-Stack Entity & Module Lifecycle Management

When adding, modifying, or removing entities, workspace columns, or modules (such as Technologies, Contacts, Projects, or Custom Panels):

1. **Verify Full-Stack Scope**:
   - Check if the request is strictly a UI/view visibility change or a complete entity deprecation/removal.
   - Clarify with the user whether remote database tables and relations should also be pruned.

2. **Clean All Code Layers**:
   - **UI Views & Subtabs**: Remove navigation buttons, route views, and modal inputs.
   - **Local Cache (Dexie.js)**: Update schema migrations and table definitions if removing.
   - **Zustand Store (`vaultStore.ts`)**: Remove/adjust fetch promises, bulk puts, and CRUD mutation actions.

3. **Provide Supabase SQL Migrations**:
   - For backend table removal, supply the exact SQL migration script (`DROP TABLE IF EXISTS ... CASCADE;`) for execution in the Supabase SQL Editor.
