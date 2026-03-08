local OV = {}
OV.__VERSION = "2.1.0"
OV.__NAME = "ObfusVault"
OV.__API = "https://obfusvault.xyz"

local _svc = setmetatable({}, { __index = function(t,k) local s=game:GetService(k); t[k]=s; return s end })
local _floor=math.floor; local _random=math.random; local _clock=os.clock
local _char=string.char; local _byte=string.byte; local _sub=string.sub
local _concat=table.concat; local _insert=table.insert; local _remove=table.remove

local function _lcg(seed)
    local s = seed % 2147483648
    local c = 1
    return function(lo, hi)
        local v = (1664525 * s + 1013904223) % 99999999 + c
        c = c + 1; s = v
        return lo + v % (hi - lo + 1)
    end
end

local function _rc4(data, key)
    local S = {}
    for i = 0, 255 do S[i] = i end
    local j = 0
    for i = 0, 255 do
        j = (j + S[i] + _byte(key, i % #key + 1)) % 256
        S[i], S[j] = S[j], S[i]
    end
    local x, y, r = 0, 0, {}
    for i = 1, #data do
        x = (x + 1) % 256
        y = (y + S[x]) % 256
        S[x], S[y] = S[y], S[x]
        r[i] = _char(_byte(data, i) ~ S[(S[x] + S[y]) % 256])
    end
    return _concat(r)
end

local _b64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
local _b64lut = {}
for i = 1, 64 do _b64lut[_sub(_b64chars,i,i)] = i-1 end

local function _b64enc(data)
    local out = {}
    local b = _b64chars
    for i = 1, #data, 3 do
        local a, c, d = _byte(data, i), _byte(data, i+1) or 0, _byte(data, i+2) or 0
        out[#out+1] = _sub(b,(a>>2)+1,(a>>2)+1)
        out[#out+1] = _sub(b,((a&3)<<4|(c>>4))+1,((a&3)<<4|(c>>4))+1)
        out[#out+1] = i+1<=#data and _sub(b,((c&15)<<2|(d>>6))+1,((c&15)<<2|(d>>6))+1) or "="
        out[#out+1] = i+2<=#data and _sub(b,(d&63)+1,(d&63)+1) or "="
    end
    return _concat(out)
end

local function _b64dec(s)
    local out = {}
    for i = 1, #s, 4 do
        local a,b,c,d = _b64lut[_sub(s,i,i)],_b64lut[_sub(s,i+1,i+1)],_b64lut[_sub(s,i+2,i+2)],_b64lut[_sub(s,i+3,i+3)]
        out[#out+1] = _char((a<<2)|(b>>4))
        if _sub(s,i+2,i+2) ~= "=" then out[#out+1] = _char(((b&15)<<4)|(c>>2)) end
        if _sub(s,i+3,i+3) ~= "=" then out[#out+1] = _char(((c&3)<<6)|d) end
    end
    return _concat(out)
end

local function _genKey(len)
    local chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    local out = {}
    for i = 1, len do
        out[i] = _sub(chars, _random(1, #chars), _random(1, #chars))
        if #out[i] == 0 then out[i] = "a" end
    end
    return _concat(out):sub(1, len)
end

local function _jsonEnc(t)
    local function enc(v)
        local tv = type(v)
        if tv == "string" then return '"' .. v:gsub('\\','\\\\'):gsub('"','\\"'):gsub('\n','\\n') .. '"'
        elseif tv == "number" then return tostring(v)
        elseif tv == "boolean" then return tostring(v)
        elseif tv == "table" then
            local p = {}
            if #v > 0 then
                for _,item in ipairs(v) do _insert(p, enc(item)) end
                return "[" .. _concat(p,",") .. "]"
            else
                for k,item in pairs(v) do _insert(p, '"'..k..'":'..enc(item)) end
                return "{" .. _concat(p,",") .. "}"
            end
        end
        return "null"
    end
    return enc(t)
end

local function _jsonDec(s)
    local pos = 1
    local function skip() while pos<=#s and _sub(s,pos,pos):match("%s") do pos=pos+1 end end
    local function val()
        skip()
        local c = _sub(s,pos,pos)
        if c=='"' then
            pos=pos+1; local r=""
            while pos<=#s do
                local ch=_sub(s,pos,pos)
                if ch=="\\" then
                    local e=_sub(s,pos+1,pos+1)
                    r=r..(e=="n" and "\n" or e=="r" and "\r" or e=="t" and "\t" or e)
                    pos=pos+2
                elseif ch=='"' then pos=pos+1; break
                else r=r..ch; pos=pos+1 end
            end
            return r
        elseif c=='{' then
            pos=pos+1; local t={}; skip()
            while _sub(s,pos,pos)~='}' do
                local k=val(); skip(); pos=pos+1; t[k]=val(); skip()
                if _sub(s,pos,pos)==',' then pos=pos+1 end
            end
            pos=pos+1; return t
        elseif c=='[' then
            pos=pos+1; local t={}; skip()
            while _sub(s,pos,pos)~=']' do
                _insert(t,val()); skip()
                if _sub(s,pos,pos)==',' then pos=pos+1 end
            end
            pos=pos+1; return t
        elseif c=='t' then pos=pos+4; return true
        elseif c=='f' then pos=pos+5; return false
        elseif c=='n' then pos=pos+4; return nil
        else
            local n=s:match("^-?%d+%.?%d*",pos)
            if n then pos=pos+#n; return tonumber(n) end
        end
    end
    return val()
end

local function _getHWID()
    local ok, id = pcall(function() return game:GetService("RbxAnalyticsService"):GetClientId() end)
    if ok and id and id~="" then return id end
    local ugs = UserSettings():GetService("UserGameSettings")
    local tag = "ov_hwid_v21"
    local charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    if not ugs:GetTutorialState(tag) then
        local t = (select(1, _svc.RunService.Heartbeat:Wait())) * 1000000
        local seed = t - t%1
        local rng = _lcg(seed)
        local hw = {}
        for i = 1, 32 do
            local idx = rng(1, #charset)
            hw[i] = _sub(charset, idx, idx)
        end
        local hwid = _concat(hw)
        ugs:SetTutorialState(tag, true)
        for i = 1, #hwid do ugs:SetTutorialState(tag..i, _byte(hwid,i)) end
        return hwid
    else
        local hw = {}
        for i = 1, 32 do
            local b = ugs:GetTutorialState(tag..i)
            hw[i] = _char(type(b)=="number" and b or 63)
        end
        return _concat(hw)
    end
end

local function _getReq()
    if syn and syn.request then return syn.request end
    if request then return request end
    if http_request then return http_request end
    if fluxus and fluxus.request then return fluxus.request end
    return nil
end

local function _httpPost(url, body, hdrs)
    local req = _getReq()
    if not req then error("[ObfusVault] No HTTP function available") end
    return req({ Url=url, Method="POST", Headers=hdrs or {["Content-Type"]="application/json"}, Body=body })
end

local function _cacheLoad(id)
    local ok, data = pcall(readfile, "obfusvault_cache/"..id..".ov")
    if not ok or not data or #data==0 then return nil end
    local dec = _b64dec(data)
    local nl = dec:find("\n")
    if not nl then return nil end
    local ts = tonumber(dec:sub(1,nl-1)) or 0
    local ttl_end = dec:find("\n", nl+1)
    local ttl = tonumber(dec:sub(nl+1, ttl_end-1)) or 0
    if os.time() > ts + ttl then return nil end
    return dec:sub(ttl_end+1)
end

local function _cacheSave(id, code, ttl)
    pcall(function()
        if not isfolder("obfusvault_cache") then makefolder("obfusvault_cache") end
        writefile("obfusvault_cache/"..id..".ov", _b64enc(tostring(os.time()).."\n"..tostring(ttl or 86400).."\n"..code))
    end)
end

local _lockdown = false
local function _halt(reason)
    _lockdown = true
    for _ = 1, math.huge do
        pcall(error, "[ObfusVault] " .. (reason or "fatal"))
        task.wait(0.1)
    end
end

local function _antiTamper()
    local ok = pcall(function()
        assert(type(game.HttpGet)=="function")
        assert(type(task.wait)=="function")
        assert(_svc.Players ~= nil)
    end)
    return ok
end

local _sessionToken = nil

local function _verify(cfg)
    assert(cfg.key, "[ObfusVault] config.key required")
    local hwid = _getHWID()
    local player = _svc.Players.LocalPlayer
    local executor = "unknown"
    pcall(function() executor = (select(1, identifyexecutor())) end)

    local cached = _cacheLoad(cfg.scriptId or "default")
    if cached and cfg.allowCache ~= false then
        _sessionToken = "cached"
        return true, cached
    end

    local payload = _jsonEnc({
        key=cfg.key, hwid=hwid,
        userId=tostring(player and player.UserId or 0),
        username=tostring(player and player.Name or "unknown"),
        placeId=tostring(game.PlaceId),
        executor=executor,
        scriptId=cfg.scriptId or "default",
        version=OV.__VERSION,
        ts=os.time()
    })

    local ok, res = pcall(_httpPost, OV.__API.."/api/vault/auth", payload, {
        ["Content-Type"]="application/json",
        ["X-OV-Version"]=OV.__VERSION,
        ["X-OV-Platform"]=executor
    })

    if not ok or not res then
        if cfg.offlineMode and cached then
            _sessionToken = "offline"; return true, cached
        end
        _halt("Auth server unreachable.")
    end

    local status = res.StatusCode or res.statusCode or 0
    if status == 401 then pcall(function() if isfile("obfusvault_cache/"..cfg.scriptId..".ov") then delfile("obfusvault_cache/"..cfg.scriptId..".ov") end end); _halt("Invalid or expired key.") end
    if status == 403 then _halt("HWID mismatch.") end
    if status == 429 then _halt("Rate limited.") end
    if status ~= 200 then _halt("Auth failed: "..tostring(status)) end

    local data = pcall(_jsonDec, res.Body or "") and _jsonDec(res.Body or "") or {}
    if not data or not data.token then _halt("Bad server response.") end

    _sessionToken = data.token
    local code = data.script and _rc4(_b64dec(data.script), cfg.key) or nil
    if code then _cacheSave(cfg.scriptId or "default", code, data.ttl or 86400) end
    return true, code
end

local function _heartbeat(cfg)
    task.spawn(function()
        while not _lockdown do
            task.wait(cfg.heartbeatInterval or 300)
            if _lockdown then break end
            pcall(_httpPost, OV.__API.."/api/vault/heartbeat", _jsonEnc({
                token=_sessionToken, scriptId=cfg.scriptId or "default", ts=os.time()
            }), {["Content-Type"]="application/json",["X-OV-Version"]=OV.__VERSION})
        end
    end)
end

function OV.protect(cfg)
    assert(type(cfg)=="table", "[ObfusVault] config must be a table")
    if not _antiTamper() then _halt("Integrity check failed.") end
    local ok, code = _verify(cfg)
    if not ok then _halt("Verification failed.") end
    if cfg.heartbeat ~= false then _heartbeat(cfg) end
    if code then
        local fn, err = loadstring("local _OV_SCRIPT_ID='"..tostring(cfg.scriptId or "default").."'\n"..code)
        if fn then return fn else _halt("Load error: "..tostring(err)) end
    end
    return function() end
end

function OV.run(cfg)
    local fn = OV.protect(cfg)
    if fn then
        local ok, err = pcall(fn)
        if not ok and not cfg.silent then error("[ObfusVault] Runtime error: "..tostring(err)) end
    end
end

function OV.obfuscate(src)
    assert(type(src)=="string", "[ObfusVault] src must be a string")
    local seed = os.time() % 2147483648
    local rng = _lcg(seed)
    local key = _genKey(16)

    local KEYWORDS = {["and"]=1,["break"]=1,["do"]=1,["else"]=1,["elseif"]=1,["end"]=1,
        ["false"]=1,["for"]=1,["function"]=1,["goto"]=1,["if"]=1,["in"]=1,["local"]=1,
        ["nil"]=1,["not"]=1,["or"]=1,["repeat"]=1,["return"]=1,["then"]=1,["true"]=1,
        ["until"]=1,["while"]=1}

    local strings = {}
    local names = {}
    local nameCounter = 0

    local function genName()
        nameCounter = nameCounter + 1
        local vowels = "aeiou"
        local consonants = "bcdfghjklmnprstvwxz"
        local n = "_OV"..string.format("%x",nameCounter).."_"
        local len = rng(3,7)
        for i = 1, len do
            if i%2==1 then n=n.._sub(consonants,rng(1,#consonants),rng(1,#consonants))
            else n=n.._sub(vowels,rng(1,#vowels),rng(1,#vowels)) end
        end
        return n
    end

    local out = src
    out = out:gsub('"([^"]*)"', function(s)
        local enc = _b64enc(_rc4(s, key))
        local idx = #strings
        strings[idx+1] = enc
        return '__OVS['..idx..']'
    end)
    out = out:gsub("'([^']*)'", function(s)
        local enc = _b64enc(_rc4(s, key))
        local idx = #strings
        strings[idx+1] = enc
        return '__OVS['..idx..']'
    end)
    out = out:gsub('([_a-zA-Z][_a-zA-Z0-9]*)', function(n)
        if KEYWORDS[n] then return n end
        if not names[n] then names[n] = genName() end
        return names[n]
    end)

    local b64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    local strTable = "{"
    for i, s in ipairs(strings) do
        strTable = strTable .. (i>1 and "," or "") .. '"'..s..'"'
    end
    strTable = strTable .. "}"

    local decVar = genName()
    local lutVar = genName()
    local rc4Var = genName()
    local keyVar = genName()
    local b64Var = genName()
    local tblVar = genName()
    local iVar = genName()
    local sVar = genName()
    local aVar = genName()
    local bVar = genName()
    local cVar = genName()
    local dVar = genName()

    local header = 'local '..keyVar..'="'..key..'"\n'
    header = header..'local '..b64Var..'="'..b64chars..'"\n'
    header = header..'local '..lutVar..'={}\n'
    header = header..'for '..iVar..'=1,64 do '..lutVar..'['..b64Var..':sub('..iVar..','..iVar..')]='..iVar..'-1 end\n'
    header = header..'local '..rc4Var..'=function('..sVar..','..aVar..')\n'
    header = header..'local S={}\nfor i=0,255 do S[i]=i end\nlocal j=0\n'
    header = header..'for i=0,255 do\nj=(j+S[i]+'..aVar..':byte(i%#'..aVar..'+1))%256\nS[i],S[j]=S[j],S[i]\nend\n'
    header = header..'local x,y,r=0,0,{}\nfor i=1,#'..sVar..' do\n'
    header = header..'x=(x+1)%256\ny=(y+S[x])%256\nS[x],S[y]=S[y],S[x]\n'
    header = header..'r[i]=string.char('..sVar..':byte(i)~S[(S[x]+S[y])%256])\nend\nreturn table.concat(r)\nend\n'
    header = header..'local '..decVar..'=function('..sVar..')\n'
    header = header..'local out={}\nfor '..iVar..'=1,#'..sVar..',4 do\n'
    header = header..'local '..aVar..','..bVar..','..cVar..','..dVar..'='..lutVar..'['..sVar..':sub('..iVar..','..iVar..')],'..lutVar..'['..sVar..':sub('..iVar..'+1,'..iVar..'+1)],'..lutVar..'['..sVar..':sub('..iVar..'+2,'..iVar..'+2)],'..lutVar..'['..sVar..':sub('..iVar..'+3,'..iVar..'+3)]\n'
    header = header..'out[#out+1]=string.char(('..aVar..'<<2)|('..bVar..'>4))\n'
    header = header..'if '..sVar..':sub('..iVar..'+2,'..iVar..'+2)~="=" then out[#out+1]=string.char((('..bVar..'&15)<<4)|('..cVar..'>2)) end\n'
    header = header..'if '..sVar..':sub('..iVar..'+3,'..iVar..'+3)~="=" then out[#out+1]=string.char((('..cVar..'&3)<<6)|'..dVar..') end\n'
    header = header..'end\nreturn '..rc4Var..'(table.concat(out),'..keyVar..')\nend\n'
    header = header..'local '..tblVar..'='..strTable..'\n'
    header = header..'local __OVS={}\n'
    header = header..'for '..iVar..'=0,#'..tblVar..'-1 do __OVS['..iVar..']='..decVar..'('..tblVar..'['..iVar..'+1]) end\n'

    return header .. out
end

function OV.deobfuscate(src)
    local r = src
    r = r:gsub('string%.char%(([%d,%s]+)%)', function(n)
        local chars = {}
        for num in n:gmatch("%d+") do chars[#chars+1] = _char(tonumber(num)) end
        return '"'.._concat(chars)..'"'
    end)
    r = r:gsub('bit32%.bxor%((%d+),%s*(%d+)%)', function(a,b) return tostring(tonumber(a)~tonumber(b)) end)
    r = r:gsub('bit32%.band%((%d+),%s*(%d+)%)', function(a,b) return tostring(tonumber(a)&tonumber(b)) end)
    r = r:gsub('bit32%.bor%((%d+),%s*(%d+)%)', function(a,b) return tostring(tonumber(a)|tonumber(b)) end)
    r = r:gsub('%-%-[^\n]*', '')
    r = r:gsub('%-%-%[%[.-%]%]', '')
    r = r:gsub('\n\n\n+', '\n\n')
    return r
end

function OV.getToken() return _sessionToken end
function OV.isVerified() return _sessionToken ~= nil and not _lockdown end
function OV.clearCache(id) pcall(function() if isfile("obfusvault_cache/"..(id or "default")..".ov") then delfile("obfusvault_cache/"..(id or "default")..".ov") end end) end
function OV.setAPI(url) OV.__API = url end

return OV
