local activeGame
local activePromise
local activeTimeout
local activeValidator
local validatingRequest
local requestSequence = 0
local pendingKeypadResult

local DEFAULT_PRESET = 'medium'
local DEFAULT_THEME = {
    main = '#0B0B0F',
    accent = '#8D4FE8'
}
local PRESETS = {
    drill = {
        easy = { difficulty = 1, timeout = 60000 },
        medium = { difficulty = 2, timeout = 45000 },
        hard = { difficulty = 4, timeout = 35000 }
    },
    keypad = {
        easy = { timeout = 45000 },
        medium = { timeout = 30000 },
        hard = { timeout = 20000 }
    },
    skillbar = {
        easy = { difficulty = 1, rounds = 2, timeout = 45000 },
        medium = { difficulty = 3, rounds = 3, timeout = 35000 },
        hard = { difficulty = 5, rounds = 4, timeout = 30000 }
    },
    sequence = {
        easy = { length = 3, previewInterval = 550, timeout = 45000 },
        medium = { length = 5, previewInterval = 420, timeout = 35000 },
        hard = { length = 7, previewInterval = 320, timeout = 30000 }
    },
    lockpick = {
        easy = { difficulty = 1, timeout = 45000 },
        medium = { difficulty = 3, timeout = 35000 },
        hard = { difficulty = 5, timeout = 30000 }
    },
    pattern = {
        easy = { length = 4, previewDuration = 2500, timeout = 45000 },
        medium = { length = 6, previewDuration = 1800, timeout = 35000 },
        hard = { length = 8, previewDuration = 1300, timeout = 30000 }
    },
    wires = {
        easy = { channels = 3, timeout = 45000 },
        medium = { channels = 4, timeout = 35000 },
        hard = { channels = 5, timeout = 30000 }
    },
    circuit = {
        easy = { size = 3, timeout = 60000 },
        medium = { size = 4, timeout = 50000 },
        hard = { size = 5, timeout = 40000 }
    },
    fingerprint = {
        easy = { slices = 3, timeout = 45000 },
        medium = { slices = 5, timeout = 35000 },
        hard = { slices = 7, timeout = 30000 }
    },
    networkhack = {
        easy = { size = 4, previewDuration = 3000, maxErrors = 2, timeout = 45000 },
        medium = { size = 5, previewDuration = 2200, maxErrors = 1, timeout = 40000 },
        hard = { size = 6, previewDuration = 1500, maxErrors = 0, timeout = 35000 }
    },
    safecracker = {
        easy = { positions = 3, tolerance = 10, maxErrors = 3, timeout = 60000 },
        medium = { positions = 4, tolerance = 7, maxErrors = 2, timeout = 55000 },
        hard = { positions = 5, tolerance = 4, maxErrors = 1, timeout = 50000 }
    },
    frequencytuning = {
        easy = { rounds = 1, tolerance = 8, holdDuration = 1000, timeout = 40000 },
        medium = { rounds = 2, tolerance = 5, holdDuration = 1500, timeout = 45000 },
        hard = { rounds = 3, tolerance = 3, holdDuration = 2000, timeout = 50000 }
    },
    terminal = {
        easy = { entries = 12, rounds = 2, refreshInterval = 10000, timeLimit = 60000, timeout = 61000 },
        medium = { entries = 20, rounds = 3, refreshInterval = 10000, timeLimit = 60000, timeout = 61000 },
        hard = { entries = 28, rounds = 4, refreshInterval = 7000, timeLimit = 60000, timeout = 61000 }
    }
}

local OPTION_LIMITS = {
    networkhack = { size = { 4, 6, true }, previewDuration = { 500, 10000, true }, maxErrors = { 0, 10, true } },
    safecracker = { positions = { 1, 8, true }, tolerance = { 2, 20 }, maxErrors = { 0, 10, true } },
    frequencytuning = { rounds = { 1, 8, true }, tolerance = { 1, 15 }, holdDuration = { 250, 10000, true } }
}

local function finiteNumber(value, fallback, minimum, maximum, integer)
    if type(value) ~= 'number' or value ~= value or value == math.huge or value == -math.huge then
        value = fallback
    end

    value = math.min(maximum, math.max(minimum, value))
    return integer and math.floor(value + 0.5) or value
end

local function normalizeHexColor(value, fallback)
    if type(value) ~= 'string' or not value:match('^#%x%x%x%x%x%x$') then
        return fallback
    end

    return value:upper()
end

local function normalizeOptions(game, options)
    local input = type(options) == 'table' and options or {}
    local requestedPreset = type(options) == 'string' and options or input.difficulty
    local presetName = type(requestedPreset) == 'string' and requestedPreset:lower() or DEFAULT_PRESET
    local gamePresets = PRESETS[game]
    local preset = gamePresets and gamePresets[presetName] or gamePresets[DEFAULT_PRESET]
    local normalized = {}

    for key, value in pairs(preset or {}) do
        normalized[key] = value
    end

    for key, value in pairs(input) do
        if key ~= 'difficulty' or type(value) ~= 'string' then
            normalized[key] = value
        end
    end

    for key, limits in pairs(OPTION_LIMITS[game] or {}) do
        normalized[key] = finiteNumber(normalized[key], preset[key], limits[1], limits[2], limits[3])
    end

    if game == 'terminal' and input.timeLimit ~= nil and input.timeout == nil then
        normalized.timeout = finiteNumber(tonumber(normalized.timeLimit), 60000, 5000, 300000, true) + 1000
    end

    local maximumTimeout = OPTION_LIMITS[game] and 600000 or math.huge
    normalized.timeout = finiteNumber(tonumber(normalized.timeout), preset.timeout, 5000, maximumTimeout, true)

    local configuredTheme = type(Config) == 'table' and type(Config.Theme) == 'table' and Config.Theme or {}
    local requestedTheme = type(input.theme) == 'table' and input.theme or {}
    local mainColor = normalizeHexColor(configuredTheme.main, DEFAULT_THEME.main)
    local accentColor = normalizeHexColor(configuredTheme.accent, DEFAULT_THEME.accent)

    normalized.theme = {
        main = normalizeHexColor(requestedTheme.main, mainColor),
        accent = normalizeHexColor(requestedTheme.accent, accentColor)
    }
    local localeName = type(input.locale) == 'string' and input.locale or Config.Locale
    local locale = type(Locales) == 'table' and type(Locales[localeName]) == 'table' and Locales[localeName] or Locales.en
    normalized.locale = locale or {}
    normalized.localeName = localeName
    normalized.preset = gamePresets and gamePresets[presetName] and presetName or DEFAULT_PRESET
    return normalized
end

local function finishGame(result)
    if not activePromise then return false end

    local requestId = activeTimeout
    local pending = activePromise
    activePromise = nil
    activeGame = nil
    activeTimeout = nil
    activeValidator = nil
    validatingRequest = nil
    pendingKeypadResult = nil

    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close', requestId = requestId })
    pending:resolve(result)
    return true
end

local function cancelActiveGame(reason)
    if not activePromise then return end

    finishGame({
        success = false,
        submitted = false,
        reason = reason or 'cancelled'
    })
end

local function runGame(game, options)
    if activePromise then
        return {
            success = false,
            submitted = false,
            reason = 'busy'
        }
    end

    options = normalizeOptions(game, options)
    local timeout = math.max(tonumber(options.timeout) or 45000, 5000)
    requestSequence = requestSequence + 1
    local requestId = ('%s:%s:%s'):format(game, GetGameTimer(), requestSequence)
    local nuiOptions = {}

    for key, value in pairs(options) do
        if key ~= 'validate' and type(value) ~= 'function' then
            nuiOptions[key] = value
        end
    end

    activeGame = game
    activePromise = promise.new()
    activeTimeout = requestId
    activeValidator = game == 'keypad' and type(options.validate) == 'function' and options.validate or nil
    pendingKeypadResult = nil

    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'open',
        game = game,
        requestId = requestId,
        options = nuiOptions
    })

    SetTimeout(timeout, function()
        if activeTimeout ~= requestId then return end
        cancelActiveGame('timeout')
    end)

    CreateThread(function()
        while activeTimeout == requestId do
            if IsEntityDead(PlayerPedId()) then
                cancelActiveGame('cancelled')
                return
            end
            Wait(250)
        end
    end)

    return Citizen.Await(activePromise)
end

---@param options 'easy'|'medium'|'hard'|table|nil preset name or drill options
---@return table result `{ success: boolean, reason: string }`
local function drill(options)
    local result = runGame('drill', options)
    return {
        success = result.success == true,
        reason = result.reason or 'failed'
    }
end

---@param game string
---@param options table|nil
---@return table result `{ success: boolean, reason: string, data?: table }`
local function playStandardGame(game, options)
    local result = runGame(game, options)

    return {
        success = result.success == true,
        reason = result.reason or 'failed',
        data = type(result.data) == 'table' and result.data or nil
    }
end

---@param options 'easy'|'medium'|'hard'|table|nil preset name or keypad options
---@return table result `{ submitted: boolean, code?: string, reason: string }`
local function keypad(options)
    local result = runGame('keypad', options)
    local code = type(result.code) == 'string' and result.code:match('^%d%d%d%d$') and result.code or nil
    local validated = result.validated == true

    return {
        submitted = result.submitted == true and (validated or code ~= nil),
        code = code,
        reason = result.reason or 'cancelled',
        validated = validated,
        success = result.success == true,
        message = result.message
    }
end

local function skillbar(options) return playStandardGame('skillbar', options) end
local function sequence(options) return playStandardGame('sequence', options) end
local function lockpick(options) return playStandardGame('lockpick', options) end
local function pattern(options) return playStandardGame('pattern', options) end
local function wires(options) return playStandardGame('wires', options) end
local function circuit(options) return playStandardGame('circuit', options) end
local function fingerprint(options) return playStandardGame('fingerprint', options) end
local function terminal(options) return playStandardGame('terminal', options) end
local function networkhack(options) return playStandardGame('networkhack', options) end
local function safecracker(options) return playStandardGame('safecracker', options) end
local function frequencytuning(options) return playStandardGame('frequencytuning', options) end
local function cancel() cancelActiveGame('cancelled') end

local DEBUG_GAMES = {
    drill = drill,
    keypad = keypad,
    skillbar = skillbar,
    sequence = sequence,
    lockpick = lockpick,
    pattern = pattern,
    wires = wires,
    circuit = circuit,
    fingerprint = fingerprint,
    terminal = terminal,
    networkhack = networkhack,
    safecracker = safecracker,
    frequencytuning = frequencytuning
}

local DEBUG_PRESETS = {
    easy = true,
    medium = true,
    hard = true
}

local function debugMessage(message)
    print(('[fa_minigames] %s'):format(message))
    TriggerEvent('chat:addMessage', {
        color = { 141, 79, 232 },
        args = { 'FA Minigames', message }
    })
end

if Config.Debug == true then
    RegisterCommand('faminigame', function(_, args)
        local gameName = type(args[1]) == 'string' and args[1]:lower() or nil
        local game = gameName and DEBUG_GAMES[gameName] or nil

        if not game then
            debugMessage('Usage: /faminigame <game> [easy|medium|hard] [compact]')
            debugMessage('Games: drill, keypad, skillbar, sequence, lockpick, pattern, wires, circuit, fingerprint, terminal, networkhack, safecracker, frequencytuning')
            return
        end

        local preset = type(args[2]) == 'string' and args[2]:lower() or DEFAULT_PRESET

        if not DEBUG_PRESETS[preset] then
            debugMessage(('Unknown difficulty "%s". Use easy, medium or hard.'):format(preset))
            return
        end

        local compactValue = type(args[3]) == 'string' and args[3]:lower() or nil
        local options = {
            difficulty = preset,
            compact = compactValue == 'compact' or compactValue == 'true' or compactValue == '1'
        }

        CreateThread(function()
            debugMessage(('Starting %s (%s%s).'):format(
                gameName,
                preset,
                options.compact and ', compact' or ''
            ))

            local result = game(options)

            if gameName == 'keypad' then
                debugMessage(('Keypad finished: submitted=%s, code=%s, reason=%s'):format(
                    tostring(result.submitted == true),
                    result.code or 'none',
                    result.reason or 'unknown'
                ))
                return
            end

            debugMessage(('%s finished: success=%s, reason=%s'):format(
                gameName,
                tostring(result.success == true),
                result.reason or 'unknown'
            ))
        end)
    end, false)
end

exports('Drill', drill)
exports('Keypad', keypad)
exports('Skillbar', skillbar)
exports('Sequence', sequence)
exports('Lockpick', lockpick)
exports('Pattern', pattern)
exports('Wires', wires)
exports('Circuit', circuit)
exports('Fingerprint', fingerprint)
exports('Terminal', terminal)
exports('NetworkHack', networkhack)
exports('Safecracker', safecracker)
exports('FrequencyTuning', frequencytuning)
exports('Cancel', cancel)

RegisterNUICallback('complete', function(data, cb)
    if type(data) ~= 'table' or not activePromise or data.game ~= activeGame or data.requestId ~= activeTimeout then
        cb({ ok = false })
        return
    end

    if activeGame ~= 'keypad' then
        cb({ ok = true })
        finishGame({
            success = data.success == true,
            reason = data.success == true and 'completed' or 'failed',
            data = type(data.data) == 'table' and data.data or nil
        })
        return
    end

    local code = type(data.code) == 'string' and data.code:match('^%d%d%d%d$') and data.code or nil

    if not code then
        cb({ ok = false, feedback = 'error', close = false })
        return
    end

    if pendingKeypadResult or validatingRequest == activeTimeout then
        cb({ ok = false, close = false })
        return
    end

    if activeValidator then
        local requestId = activeTimeout
        validatingRequest = requestId
        local validated, response = pcall(activeValidator, code)

        if activeTimeout ~= requestId then
            cb({ ok = false, close = true })
            return
        end

        validatingRequest = nil
        response = validated and type(response) == 'table' and response or {
            success = false,
            close = true,
            reason = 'failed'
        }

        local success = response.success == true
        local close = response.close ~= false

        if close then
            pendingKeypadResult = {
                submitted = true,
                validated = true,
                success = success,
                reason = response.reason or (success and 'completed' or 'failed'),
                message = response.message
            }
        end

        cb({
            ok = true,
            feedback = success and 'success' or 'error',
            close = close
        })
        return
    end

    cb({ ok = true, close = true })
    finishGame({
        submitted = true,
        code = code,
        reason = 'completed'
    })
end)

RegisterNUICallback('keypadFeedbackComplete', function(data, cb)
    if type(data) ~= 'table' or activeGame ~= 'keypad' or data.requestId ~= activeTimeout or not pendingKeypadResult then
        cb({ ok = false })
        return
    end

    cb({ ok = true })
    finishGame(pendingKeypadResult)
end)

RegisterNUICallback('cancel', function(data, cb)
    if type(data) ~= 'table' or not activePromise or data.requestId ~= activeTimeout then
        cb({ ok = false })
        return
    end

    cb({ ok = true })
    cancelActiveGame('cancelled')
end)

AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    cancelActiveGame('cancelled')
    SetNuiFocus(false, false)
end)
