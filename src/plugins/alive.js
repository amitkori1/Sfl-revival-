const { addCommand } = require('../events');
const config = require('../config');

function secondsToHms(d) {
    d = Number(d);
    const h = Math.floor(d / 3600);
    const m = Math.floor((d % 3600) / 60);
    const s = Math.floor(d % 60);
    return [h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
}

// alive
addCommand({ pattern: 'alive', fromMe: true, desc: 'Check if the bot is alive' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    if (config.ALIVE_MESSAGE !== 'default') {
        return sock.sendMessage(jid, { text: config.ALIVE_MESSAGE.replace('{version}', config.VERSION) });
    }
    const uptime = secondsToHms(process.uptime());
    await sock.sendMessage(jid, {
        text: `🤖 *SFL Bot is Alive!*\n\n*Version:* \`${config.VERSION}\`\n*Uptime:* \`${uptime}\`\n*Mode:* \`${config.WORK_TYPE}\``
    });
});

// ping
addCommand({ pattern: 'ping', fromMe: true, desc: 'Check bot response time' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const start = Date.now();
    const sent = await sock.sendMessage(jid, { text: '🏓 Pinging...' });
    const elapsed = Date.now() - start;
    await sock.sendMessage(jid, { text: `🏓 *Pong!* \`${elapsed}ms\``, edit: sent.key });
});
