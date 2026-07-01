const { addCommand } = require('../events');
const { Filters } = require('../db');

// filter - set or list filters
addCommand({ pattern: 'filter', fromMe: true, desc: 'Set auto-reply filter. Usage: .filter "word" "reply"' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;

    if (!match || !match.trim()) {
        const filters = Filters.get(jid);
        if (!filters.length) return sock.sendMessage(jid, { text: '📭 No filters set in this chat.' });
        const text = '*🔍 Active Filters:*\n\n' + filters.map(f => `• \`${f.pattern}\` → ${f.reply}`).join('\n');
        return sock.sendMessage(jid, { text });
    }

    const parts = match.match(/[""](.+?)[""]|'(.+?)'/g);
    if (!parts || parts.length < 2) return sock.sendMessage(jid, { text: '❌ Usage: `.filter "trigger" "reply"`' });

    const pattern = parts[0].replace(/["""'']/g, '');
    const reply = parts[1].replace(/["""'']/g, '');
    Filters.set(jid, pattern, reply);
    await sock.sendMessage(jid, { text: `✅ *Filter Set!*\n• Trigger: \`${pattern}\`\n• Reply: ${reply}` });
});

// stop - remove a filter
addCommand({ pattern: 'stop', fromMe: true, desc: 'Remove a filter. Usage: .stop "word"' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const parts = match?.match(/[""](.+?)[""]|'(.+?)'/g);
    if (!parts) return sock.sendMessage(jid, { text: '❌ Usage: `.stop "trigger"`' });

    const pattern = parts[0].replace(/["""'']/g, '');
    const deleted = Filters.delete(jid, pattern);
    if (!deleted) return sock.sendMessage(jid, { text: `❌ No filter found for: \`${pattern}\`` });
    await sock.sendMessage(jid, { text: `✅ Filter \`${pattern}\` removed!` });
});
