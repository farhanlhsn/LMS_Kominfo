# Contextual RBAC and Moodle Compatibility

## Scope

This implementation adopts Moodle's mature access-control semantics without
loading Moodle PHP code into the NestJS process. Reference source was Moodle
5.2.1+ in `D:\CodexWorkspaces\moodle\public`.

Relevant Moodle behavior:

- `lib/accesslib.php`: context inheritance, role assignment, role switch, and
  `CAP_ALLOW`, `CAP_PREVENT`, `CAP_PROHIBIT`.
- `lib/classes/plugin_manager.php`: installed-but-missing plugin state.
- `lib/completionlib.php`: activities with missing plugin implementations are
  filtered safely.
- `lib/adminlib.php`: controlled missing-plugin status and uninstall workflow.

This is behavioral compatibility, not Moodle database or PHP plugin binary
compatibility.

## Data model

`RolePermission` and `MemberRole` remain baseline grants for existing tenants.
New models add contextual behavior:

- `AccessContext`: typed tree node with materialized ancestor path.
- `ContextRoleAssignment`: user/role assignment at a context, optional start
  and expiry, plus source component provenance.
- `RoleCapabilityOverride`: role/capability/context effect.
- `RoleDelegation`: actor-role to target-role administration matrix.
- `RoleSwitch`: session-specific role at a context subtree.

`Permission` includes component, read/write type, risk bitmask, compatible
context types, plugin owner, and active state. `Role` includes archetype,
compatible assignment contexts, ordering, and active state.

## Resolution algorithm

For user, session, capability, and target context:

1. Resolve target and ancestor path. Reject cross-tenant instance IDs.
2. Reject missing or inactive capability definitions.
3. Reject plugin-owned capability when package is missing, disabled, or not
   installed for organization.
4. Load active membership roles and contextual assignments on ancestor path.
5. If a session role switch exists on path, use nearest switched role instead.
6. For each role, start from baseline grant and use nearest non-inherit
   override.
7. If any override on path is `PROHIBIT`, deny globally.
8. Otherwise grant when any effective role grants.
9. Return decision trace for admin simulator and audit.

Super admin bypass applies only while not role-switched. Missing capability and
missing plugin checks still fail closed before bypass.

## Missing component behavior

### Plugin disabled for one organization

- Other organizations are unaffected.
- Existing activity and plugin data remain.
- Plugin capability checks return `PLUGIN_DISABLED`.
- Context option remains visible with unavailable status.
- Learner activity surfaces render controlled unavailable state.
- Re-enable or reinstall restores access without rewriting course content.

### Plugin code missing

- Runtime manifest absence returns `PLUGIN_MISSING`.
- Stored plugin/config/activity records remain inspectable.
- No plugin handler is invoked.
- Core API process does not attempt dynamic PHP or arbitrary JavaScript load.

### Role missing or deactivated

- Resolver ignores role.
- Assignments and overrides remain as orphan-safe audit references.
- Active role switch using deactivated role is cleared.
- User retains access granted by other active roles.
- No undefined-role exception reaches page rendering.

### Capability missing

- Resolver returns `MISSING_CAPABILITY`.
- Request is denied.
- No string fallback or implicit allow is used.

## Administration API

Base path:

`/api/v1/organizations/:organizationId/access-control`

Endpoints:

- `GET /contexts`
- `GET|POST /assignments`
- `DELETE /assignments/:assignmentId`
- `GET|PUT /overrides`
- `GET|PUT /delegations`
- `POST /simulate`
- `GET|POST|DELETE /role-switch`
- `GET /roles/:roleId/impact`
- `DELETE /roles/:roleId`

All mutations validate tenant ownership, delegated authority, and write audit
logs. Role switch restore is authenticated but intentionally independent from
switched-role permissions.

## UI

`/admin/access-control` provides:

- contextual role assignment with validity windows;
- capability override editor;
- effective-access simulator with per-role trace;
- delegation matrix;
- session role switch and restore;
- custom-role impact preview and safe deactivation.

## Remaining Moodle differences

Moodle has decades of role presets, context-specific UI integrations, plugin
callbacks, upgrade tooling, and capability coverage. LMS now has equivalent
core semantics and extension-safe behavior, but parity still requires every
feature controller to declare its most specific `AccessScope` and every plugin
to publish risk-tagged capability definitions. New modules must use contextual
guards instead of adding ad hoc role-name checks.
