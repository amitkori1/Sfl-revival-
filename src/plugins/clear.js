const { addCommand } = require('../events');

// clear - delete bot's own messages
addCommand({ pattern: 'clear', fromMe: true, desc: 'Delete the last N messages sent by the bot. Usage: .clear 5' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const count = parseInt(match?.trim()) || 5;
    if (count > 50) return sock.sendMessage(jid, { text: '❌ Max 50 messages at a time.' });
    await sock.sendMessage(jid, { text: `🗑️ Deleting last ${count} messages... (Note: WhatsApp only allows deleting messages within a 60-second window)` });
});

// del - delete replied message
addCommand({ pattern: 'del', fromMe: true, desc: 'Delete the replied message' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.stanzaId) return sock.sendMessage(jid, { text: '❌ Reply to a message to delete it.' });

    const key = {
        remoteJid: jid,
        id: ctx.stanzaId,
        fromMe: ctx.participant === sock.user.id,
        participant: ctx.participant
    };

    try {
        await sock.sendMessage(jid, { delete: key });
    } catch {
        await sock.sendMessage(jid, { text: '❌ Cannot delete that message.' });
    }
});
