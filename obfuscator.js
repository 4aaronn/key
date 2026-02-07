const $ = id => document.getElementById(id);

const randId = (l = 10) =>
    "_" + Math.random().toString(36).slice(2, 2 + l);

function wrapLayer(code, type) {
    const fn = randId();
    const data = randId();
    const out = randId();
    const i = randId();
    const res = randId();
    const loader = randId();

    const bytes = new TextEncoder().encode(code);
    let encoded = "";
    let logic = "";

    if (type === "rot") {
        const off = Math.floor(Math.random() * 60) + 15;
        for (const b of bytes) encoded += "\\" + ((b + off) & 255);
        logic = `${out}[#${out}+1]=string.char((${data}:byte(${i})-${off})%256)`;
    }

    if (type === "xor") {
        const key = Math.floor(Math.random() * 254) + 1;
        for (const b of bytes) encoded += "\\" + (b ^ key);
        logic = `${out}[#${out}+1]=string.char(bit32.bxor(${data}:byte(${i}),${key}))`;
    }

    if (type === "inv") {
        for (const b of bytes) encoded += "\\" + (255 - b);
        logic = `${out}[#${out}+1]=string.char(255-${data}:byte(${i}))`;
    }

    return `
        local function ${fn}()
            local ${data}="${encoded}"
            local ${out}={}
            for ${i}=1,#${data} do ${logic} end
            local ${res}=table.concat(${out})
            local ${loader}=(loadstring or load)
            if ${loader} then
                local f=${loader}(${res})
                if f then pcall(f) end
            end
        end
        ${fn}()
    `.replace(/\s+/g, ' ');
}

function addAntiDump() {
    return `
        local ok, mt = pcall(getmetatable, _G)
        if ok and mt == nil then
            local _mt = { __metatable = "locked" }
            pcall(setmetatable, _G, _mt)
        end

        if debug and debug.sethook then
            pcall(debug.sethook, function()
                error("dump attempt detected")
            end, "c")
        end

        if debug and debug.getlocal then
            local _getlocal = debug.getlocal
            debug.getlocal = function()
                error("dump attempt")
            end
        end
    `.replace(/\s+/g, ' ');
}


function addWatermark() {
    return `
        --[[ Obfuscated by nigga ts as trash anti dump  ]]
    `.replace(/\s+/g, ' ');
}

function build() {
    const src = $('input').value;
    if (!src.trim()) return;

    const bytes = new TextEncoder().encode(src);
    const seed = Math.floor(Math.random() * 255);
    let key = seed;
    let ops = [];

    for (let i = 0; i < bytes.length; i++) {
        ops.push((bytes[i] ^ key) + (i % 7));
        key = (key + 13) % 255;
    }

    const opsVar = randId();
    const stk = randId();
    const ip = randId();
    const run = randId();

    let payload = `
        local ${opsVar}={${ops.join(',')}}
        local function ${run}()
            local ${stk}={}
            local ${ip}=${seed}
            for i=1,#${opsVar} do
                local v=(${opsVar}[i]-((i-1)%7))
                ${stk}[#${stk}+1]=string.char(bit32.bxor(v,${ip}))
                ${ip}=(${ip}+13)%255
            end
            local f=(loadstring or load)(table.concat(${stk}))
            if f then pcall(f) end
        end
        ${run}()
    `.replace(/\s+/g, ' ');

    const layers = [];
    if ($('opt-rot').checked) layers.push("rot");
    if ($('opt-xor').checked) layers.push("xor");
    if ($('opt-inv').checked) layers.push("inv");

    layers.sort(() => Math.random() - 0.5);
    for (const l of layers) payload = wrapLayer(payload, l);

    payload = addWatermark() + addAntiDump() + payload;
    $('output').value = payload;
}

function copy() {
    $('output').select();
    try {
        document.execCommand('copy');
    } catch (e) {
        navigator.clipboard.writeText($('output').value);
    }
}

$('input').value =
`print("why am i so tuff?")`;
