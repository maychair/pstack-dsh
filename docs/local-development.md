# Local development

This fork maintains DSH workflow fixes on `local/dsh-workflow`, based on upstream `v0.2.3`. Keep `origin` pointed at `maychair/pstack-dsh` and `upstream` at `aa2246740/pstack-dsh`. The MIT license and both original copyright notices remain in [LICENSE](../LICENSE).

## Build and test

Use Node `^22.19.0` or `>=24`. From the repository root:

```sh
npm ci --legacy-peer-deps --ignore-scripts --no-audit --no-fund
npm run check
```

The lockfile uses legacy peer resolution. DSH provides runtime peer services; the local development dependencies provide build and test types. The build does not require a DSH source checkout or a host-specific environment variable. Browser imports of React and DSH services stay external and resolve through the Host module loader.

The repository tracks its distributable `lib/` artifacts. Rebuild them when changing TypeScript, review the generated diff, and commit the source and matching artifacts together. Markdown-only skill changes do not need a bundle rebuild.

## Load the local checkout

Build first, then register its absolute path with the native DSH CLI:

```sh
dsh plugin --profile web add "link:$(pwd -P)"
```

Run that command from this repository root. It replaces the Web profile dependency source with a local link; it does not install the upstream GitHub release. Desktop uses a separate profile. Keep the checkout at this path while it is registered.

**Replacing an already installed plugin requires reopening the Host, then refreshing the existing GUI.** Writing a new dependency source does not prove that the running process loaded it. Do not restart the Host from an active agent task. Coordinate the restart after the task finishes. Verify the resolved package path, the pstack settings page, an internal skill load, and a bounded `poteto-agent` roundtrip after restart.

A local link follows the working tree, not a Git branch name. Keep this runtime checkout on the maintenance branch. Use a separate checkout for unreviewed upstream experiments. Editing a skill file does not automatically invalidate cached Host skill metadata; reload the plugin component when appropriate.

## Maintenance boundary

- The eight internal workflow dependencies are model-invocable. The ten explicit user entry points, including `/poteto-mode` and `/tdd`, remain user-only. Provider regression coverage lives in [upgrade-skills.spec.ts](../tests/upgrade-skills.spec.ts).
- Do not install a task plugin merely to supply `todo_write`; keep the checklist in replies when that tool is absent.
- Keep credentials, role overlays, runtime profiles and session history outside this repository.
- Fetch upstream deliberately, review changes, then merge or cherry-pick selected updates. Do not run an upstream install command over the local dependency source.

To leave local maintenance, register the desired release with the same native CLI and reopen the Host. That replaces the dependency source and discards the local branch behavior from the running installation after restart; it does not delete this source checkout.
