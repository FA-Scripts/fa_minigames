local activeGame
local activePromise
local activeTimeout
local activeValidator
local pendingKeypadResult

local DEFAULT_PRESET = 'medium'
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
    terminal = {
        easy = { entries = 12, rounds = 2, refreshInterval = 10000, timeLimit = 60000, timeout = 61000 },
        medium = { entries = 20, rounds = 3, refreshInterval = 10000, timeLimit = 60000, timeout = 61000 },
        hard = { entries = 28, rounds = 4, refreshInterval = 7000, timeLimit = 60000, timeout = 61000 }
    }
}

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

    if game == 'terminal' and input.timeLimit ~= nil and input.timeout == nil then
        normalized.timeout = math.max(tonumber(normalized.timeLimit) or 60000, 5000) + 1000
    end

    normalized.preset = gamePresets and gamePresets[presetName] and presetName or DEFAULT_PRESET
    return normalized
end

local function finishGame(result)
    if not activePromise then return false end

    local pending = activePromise
    activePromise = nil
    activeGame = nil
    activeTimeout = nil
    activeValidator = nil
    pendingKeypadResult = nil

    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close' })
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
    local requestId = ('%s:%s:%s'):format(game, GetGameTimer(), math.random(1000, 9999))
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
local function cancel() cancelActiveGame('cancelled') end

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
exports('Cancel', cancel)

RegisterNUICallback('complete', function(data, cb)
    if type(data) ~= 'table' or data.game ~= activeGame then
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

    if activeValidator then
        local validated, response = pcall(activeValidator, code)
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

RegisterNUICallback('keypadFeedbackComplete', function(_, cb)
    cb({ ok = true })

    if activeGame ~= 'keypad' or not pendingKeypadResult then return end
    finishGame(pendingKeypadResult)
end)

RegisterNUICallback('cancel', function(_, cb)
    cb({ ok = true })
    cancelActiveGame('cancelled')
end)

AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    cancelActiveGame('cancelled')
    SetNuiFocus(false, false)
end)
