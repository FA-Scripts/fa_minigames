# Contributing

Issues and pull requests are welcome. Keep changes focused, readable and independent from specific frameworks.

Before opening a pull request:

1. Run `npm.cmd install` in `devweb`.
2. Run `npm.cmd run typecheck`.
3. Run `npm.cmd run build`.
4. Run `npm.cmd run validate:lua`.
5. Test changed interactions in FiveM. Browser mocks do not prove NUI focus or runtime behavior.

New games should use the shared session contract, support keyboard interaction where appropriate, clean up timers and listeners, and document every public option.
