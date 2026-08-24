# FA Minigames

Free, framework-independent NUI minigames for FiveM. The resource exposes ten client exports and has no framework, inventory or server dependency.

## Games

| Export | Mechanic | Main options |
| --- | --- | --- |
| `Drill` | Balance pressure, RPM and heat | `difficulty`, `timeout` |
| `Keypad` | Four-digit keypad | `title`, `timeout`, `validate` |
| `Skillbar` | Stop a moving marker in a target zone | `difficulty`, `rounds`, `timeout` |
| `Sequence` | Repeat a displayed sequence | `length`, `timeout` |
| `Lockpick` | Find the lock's binding angle | `difficulty`, `timeout` |
| `Pattern` | Recreate a highlighted grid | `length`, `timeout` |
| `Wires` | Match labelled wire channels | `timeout` |
| `Circuit` | Rotate traces into position | `size`, `timeout` |
| `Fingerprint` | Align fingerprint slices | `slices`, `timeout` |
| `Terminal` | Find a requested terminal token | `entries`, `rounds`, `refreshInterval`, `timeLimit`, `timeout` |

Numeric options are clamped to safe ranges. `timeout` is expressed in milliseconds and has a minimum value of 5000.

## Difficulty presets

Every game accepts `easy`, `medium` or `hard` directly. Calling an export without arguments uses `medium`:

```lua
local result = exports.fa_minigames:Circuit('easy')
```

An options table can select a preset and override individual values:

```lua
local result = exports.fa_minigames:Terminal({
    difficulty = 'hard',
    refreshInterval = 10000,
    timeLimit = 60000
})
```

`refreshInterval`, `timeLimit` and `timeout` are milliseconds. Terminal defaults to a table refresh every 10 seconds, a 60-second game limit and a 61-second outer timeout. Keep the outer `timeout` slightly longer than `timeLimit` when overriding both.

Preset mechanics:

| Game | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Drill | difficulty 1 | difficulty 2 | difficulty 4 |
| Keypad | 45 s | 30 s | 20 s |
| Skillbar | 2 rounds, difficulty 1 | 3 rounds, difficulty 3 | 4 rounds, difficulty 5 |
| Sequence | 3 inputs, slower preview | 5 inputs | 7 inputs, faster preview |
| Lockpick | difficulty 1 | difficulty 3 | difficulty 5 |
| Pattern | 4 cells, 2.5 s preview | 6 cells, 1.8 s preview | 8 cells, 1.3 s preview |
| Wires | 3 channels | 4 channels | 5 channels |
| Circuit | 3×3 | 4×4 | 5×5 |
| Fingerprint | 3 slices | 5 slices | 7 slices |
| Terminal | 12 entries, 2 traces | 20 entries, 3 traces | 28 entries, 4 traces |

## Compact presentation

Skillbar, Sequence, Lockpick and Pattern support an optional compact layout. It removes surrounding chrome and secondary information while keeping gameplay controls at their regular, readable size. Difficulty, callbacks and result data remain unchanged.

```lua
local result = exports.fa_minigames:Lockpick({
    difficulty = 'hard',
    compact = true,
    timeout = 25000
})
```

The full layout remains the default. Use `?game=lockpick&compact=true` in the browser preview to inspect a compact variant.

## Installation

1. Download or clone this repository into your server's resources directory.
2. Keep the folder name `fa_minigames`.
3. Add `ensure fa_minigames` before resources that consume its exports.

## Usage

Every export is synchronous from the calling Lua coroutine:

```lua
local result = exports.fa_minigames:Skillbar({
    difficulty = 3,
    rounds = 4,
    timeout = 30000
})

if result.success then
    print('Completed')
else
    print(('Stopped: %s'):format(result.reason))
end
```

Standard games return:

```lua
{
    success = boolean,
    reason = 'completed' | 'failed' | 'cancelled' | 'timeout' | 'busy',
    data = table | nil
}
```

Only one minigame can be active at a time. Use `exports.fa_minigames:Cancel()` to stop the current session.

### Keypad validation

Never send a correct or secret code to NUI. Provide a client adapter that calls your server and returns a validation response:

```lua
local result = exports.fa_minigames:Keypad({
    title = 'Safe',
    timeout = 30000,
    validate = function(code)
        local response = lib.callback.await('my_resource:validateCode', false, code)
        return {
            success = response.success == true,
            close = response.success == true,
            reason = response.success and 'completed' or 'failed',
            message = response.message
        }
    end
})
```

Returning `close = false` clears an invalid entry and leaves the keypad open. The caller and its server remain responsible for attempts, permissions, rewards and all authoritative game state.

## Development

```powershell
cd devweb
npm.cmd install
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run build
npm.cmd run validate:lua
```

Append `?game=terminal` (or another lowercase game name) to the local Vite URL to open a specific browser mock. The production build is written to `web/dist`; consumers do not need `devweb/node_modules`.

## Security

Minigame success is client-provided input, not proof that a player should receive an item, money or access. Validate distance, permissions, session state, rate limits and rewards on the server that owns the gameplay action.

## License

[MIT](LICENSE)
