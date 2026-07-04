const { addCommand } = require('../events');
const { getCommands } = require('../events');
const config = require('../config');
const os = require('os');
const { execSync } = require('child_process');
const axios = require('axios');

function secondsToHms(d) {
    d = Number(d);
    const h = Math.floor(d / 3600);
    const m = Math.floor((d % 3600) / 60);
    const s = Math.floor(d % 60);
    return [h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
}

// sysd - system info
addCommand({ pattern: 'sysd', fromMe: true, desc: 'Show system information' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const platform = os.platform();
    const arch = os.arch();
    const cpus = os.cpus()[0]?.model || 'Unknown';
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const uptime = secondsToHms(os.uptime());
    const nodeVer = process.version;

    await sock.sendMessage(jid, {
        text: `💻 *System Info*\n\n*OS:* \`${platform} ${arch}\`\n*CPU:* \`${cpus}\`\n*RAM:* \`${freeMem}GB free / ${totalMem}GB total\`\n*Uptime:* \`${uptime}\`\n*Node.js:* \`${nodeVer}\`\n*Bot Version:* \`${config.VERSION}\``
    });
});

// calc
addCommand({ pattern: 'calc', fromMe: true, desc: 'Calculate a math expression. Usage: .calc 2+2' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    if (!match?.trim()) return sock.sendMessage(jid, { text: '❌ Usage: `.calc 2+2`' });
    try {
        const sanitized = match.trim().replace(/[^0-9+\-*/%().\s]/g, '');
        // eslint-disable-next-line no-new-func
        const result = Function(`'use strict'; return (${sanitized})`)();
        await sock.sendMessage(jid, { text: `🧮 *${sanitized}* = \`${result}\`` });
    } catch {
        await sock.sendMessage(jid, { text: '❌ Invalid math expression.' });
    }
});

// weather
addCommand({ pattern: 'weather', fromMe: true, desc: 'Get weather for a city. Usage: .weather London' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    if (!match?.trim()) return sock.sendMessage(jid, { text: '❌ Usage: `.weather <city>`' });
    try {
        const city = encodeURIComponent(match.trim());
        const { data } = await axios.get(
            `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${config.WEATHER_API}`
        );
        await sock.sendMessage(jid, {
            text: `🌍 *Weather in ${data.name}, ${data.sys?.country}*\n\n🌡 *Temp:* \`${data.main.temp}°C\` (feels like ${data.main.feels_like}°C)\n🔆 *Max/Min:* \`${data.main.temp_max}°C / ${data.main.temp_min}°C\`\nℹ️ *Condition:* \`${data.weather[0].description}\`\n💧 *Humidity:* \`${data.main.humidity}%\`\n💨 *Wind:* \`${data.wind.speed} m/s\`\n☁️ *Cloud Cover:* \`${data.clouds.all}%\``
        });
    } catch {
        await sock.sendMessage(jid, { text: '❌ City not found or weather service unavailable.' });
    }
});

// info
addCommand({ pattern: 'info', fromMe: true, desc: 'Bot info' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, {
        text: `ℹ️ *SFL Bot Info*\n\n*Version:* \`${config.VERSION}\`\n*Mode:* \`${config.WORK_TYPE}\`\n*Prefix:* \`${config.HANDLERS.replace('^[', '').replace(']', '')[0] || '.'}\`\n*Node.js:* \`${process.version}\``
    });
});
