# Changelog

All notable changes to this project are documented here.

## 1.1.0 - 2026-11-05

- Fixed configurable theme colours across outlines, highlights, button states and tinted surfaces; removed root-level aliases that kept the default palette after per-session overrides.
- Limited gameplay focus outlines to explicit Tab navigation, preventing incidental rings after mouse/keyboard input while retaining keyboard navigation feedback.
- Fixed Safecracker direction enforcement: wrong turns are blocked and immediately penalized once per excursion, with visual feedback and keyboard/mouse regression coverage.
- Added NetworkHack, Safecracker and FrequencyTuning with easy/medium/hard presets, configurable mechanics, keyboard/mouse controls and diagnostic results.
- Replaced Circuit’s fixed route and rotation-only win condition with solvable randomized boards and real connectivity checks; move budgets include a valid solution.
- Scoped all NUI callbacks and close messages to unique sessions; rejected duplicate keypad submissions and stale validator responses after cancellation or timeout.
- Reset component state on each session and allowed Escape while keypad validation waits.
- Added complete Polish translations and translated accessibility labels.
- Expanded browser preview with preset/language selectors, restart, timeout and persistent result output; extended the debug command to all thirteen games.

## 1.0.0 - 2026-08-24

- Initial open-source release.
- Added Drill, Keypad, Skillbar, Sequence, Lockpick, Pattern, Wires, Circuit, Fingerprint and Terminal.
- Added a framework-independent client export API.
- Added browser mocks.
- Added global `main` and `accent` theme colours in `config.lua`.
- Added optional per-game theme overrides through the export options table.
- Added locale files with global and per-call locale selection.
- Added request identifiers and completion guards to reject stale or duplicate results.
- Added an opt-in debug mode with an in-game minigame test command.
- Added minigame screenshots and GitHub issue templates.
- Included the production NUI build in source releases.