local OV_Offline = {}

local _b64enc, _b64dec
do
    local b = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    _b64enc = function(data)
        return (data:gsub(".", function(x)
            local r, bv = "", x:byte()
            for i = 8, 1, -1 do r = r .. (bv % 2^i - bv % 2^(i-1) > 0 and "1" or "0") end
            return r
        end) .. "0000"):gsub("%d%d%d?%d?%d?%d?", function(x)
            if #x < 6 then return "" end
            local c = 0
            for i = 1, 6 do c = c + (x:sub(i,i) == "1" and 2^(6-i) or 0) end
            return b:sub(c+1, c+1)
        end) .. ({"", "==", "="})[#data % 3 + 1]
    end
    _b64dec = function(data)
        data = data:gsub("[^"..b.."=]", "")
        return (data:gsub(".", function(x)
            if x == "=" then return "" end
            local r, f = "", (b:find(x)-1)
            for i = 6, 1, -1 do r = r .. (f % 2^i - f % 2^(i-1) > 0 and "1" or "0") end
            return r
        end):gsub("%d%d%d?%d?%d?%d?%d?%d?", function(x)
            if #x ~= 8 then return "" end
            local c = 0
            for i = 1, 8 do c = c + (x:sub(i,i) == "1" and 2^(8-i) or 0) end
            return string.char(c)
        end))
    end
end

local _cacheDir = "obfusvault_cache"
local _interceptActive = false
local _originalHttpGet

local function _ensureDir()
    if not isfolder(_cacheDir) then makefolder(_cacheDir) end
end

local function _cacheKey(url)
    local encoded = _b64enc(url):gsub("[/+=]", function(c)
        return (c == "/" and "_" or c == "+" and "-" or "")
    end)
    return _cacheDir .. "/" .. encoded:sub(1, 80) .. ".ov"
end

local function _loadCache(url)
    local path = _cacheKey(url)
    local ok, data = pcall(readfile, path)
    if ok and data and #data > 0 then
        local decoded = _b64dec(data)
        local sep = decoded:find("\n")
        if sep then
            local ts = tonumber(decoded:sub(1, sep-1)) or 0
            local body = decoded:sub(sep+1)
            return body, ts
        end
    end
    return nil, 0
end

local function _saveCache(url, body)
    pcall(function()
        _ensureDir()
        local payload = tostring(os.time()) .. "\n" .. body
        writefile(_cacheKey(url), _b64enc(payload))
    end)
end

local function _intercept()
    if _interceptActive then return end
    _interceptActive = true

    _originalHttpGet = game.HttpGet

    game.HttpGet = function(self, url, nocache)
        local cached, ts = _loadCache(url)
        local fresh = cached ~= nil

        local ok, live = pcall(_originalHttpGet, self, url, nocache)

        if ok and live and #live > 10 then
            _saveCache(url, live)
            return live
        end

        if fresh then
            warn("[ObfusVault Offline] Using cached response for: " .. url)
            return cached
        end

        error("[ObfusVault Offline] No cached response and HTTP failed for: " .. url)
    end
end

local function _restore()
    if not _interceptActive then return end
    _interceptActive = false
    if _originalHttpGet then
        game.HttpGet = _originalHttpGet
        _originalHttpGet = nil
    end
end

function OV_Offline.enable()
    _intercept()
end

function OV_Offline.disable()
    _restore()
end

function OV_Offline.preload(urls)
    assert(type(urls) == "table", "[ObfusVault Offline] urls must be a table")
    local success, fail = 0, 0
    for _, url in ipairs(urls) do
        local ok, body = pcall(function()
            return game:HttpGet(url, true)
        end)
        if ok and body and #body > 10 then
            _saveCache(url, body)
            success = success + 1
        else
            fail = fail + 1
            warn("[ObfusVault Offline] Failed to preload: " .. url)
        end
    end
    return success, fail
end

function OV_Offline.clearAll()
    pcall(function()
        if isfolder(_cacheDir) then
            for _, f in ipairs(listfiles(_cacheDir)) do
                pcall(delfile, f)
            end
        end
    end)
end

function OV_Offline.listCached()
    local result = {}
    pcall(function()
        if isfolder(_cacheDir) then
            for _, f in ipairs(listfiles(_cacheDir)) do
                table.insert(result, f)
            end
        end
    end)
    return result
end

function OV_Offline.isCached(url)
    local cached = _loadCache(url)
    return cached ~= nil
end

return OV_Offline
