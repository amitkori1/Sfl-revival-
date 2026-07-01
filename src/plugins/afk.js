const { addCommand } = require('../events');
const { AFK } = require('../db');
const { secondsToHms } = require('../helpers');
const config = require('../config');

addCommand({ pattern: 'afk', fromMe: true, desc: 'Set AFK status. Usage: .afk [reason]' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const reason = match?.trim() || null;
    AFK.set(reason);
    const text = reason
        ? `💤 *AFK Mode ON*\nReason: _${reason}_`
        : '💤 *AFK Mode ON*';
    await sock.sendMessage(jid, { text });
});

addCommand({ pattern: 'afkoff', fromMe: true, desc: 'Turn off AFK status' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const afk = AFK.get();
    if (!afk.active) return sock.sendMessage(jid, { text: '❌ AFK mode is not active.' });
    const duration = secondsToHms(Math.floor(Date.now() / 1000) - afk.since);
    AFK.clear();
    await sock.sendMessage(jid, { text: `✅ *AFK Mode OFF*\nYou were away for: _${duration}_` });
});

// This is exported so the main loop can check AFK on incoming messages
function checkAfk(sock, msg, botJid) {
    const afk = AFK.get();
    if (!afk.active) return;

    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');

    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant;

    const botNumber = botJid.split('@')[0].split(':')[0];
    const isMentioned = mentions.some(m => m.split('@')[0] === botNumber);
    const isReplied = quotedSender?.split('@')[0] === botNumber;

    const shouldNotify = !isGroup || isMentioned || isReplied;
    if (!shouldNotify) return;

    const sinceText = secondsToHms(Math.floor(Date.now() / 1000) - afk.since);
    const afkMsg = config.AFK_MESSAGE !== 'default'
        ? config.AFK_MESSAGE
        : `💤 *I am currently AFK*${afk.reason ? `\nReason: _${afk.reason}_` : ''}\n⏱ Away for: _${sinceText}_`;

    sock.sendMessage(jid, { text: afkMsg, quoted: msg });
}

module.exports = { checkAfk };
