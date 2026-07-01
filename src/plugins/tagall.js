const { addCommand } = require('../events');

// tagall
addCommand({ pattern: 'tagall', fromMe: true, onlyGroup: true, desc: 'Tag all members in the group' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const meta = await sock.groupMetadata(jid);
    const participants = meta.participants;
    const mentions = participants.map(p => p.id);
    const text = match
        ? `${match}\n\n` + mentions.map(m => `@${m.split('@')[0]}`).join(' ')
        : mentions.map(m => `▫️ @${m.split('@')[0]}`).join('\n');
    await sock.sendMessage(jid, { text, mentions });
});

// tagadmin - tag only admins
addCommand({ pattern: 'tagadmin', fromMe: true, onlyGroup: true, desc: 'Tag all admins in the group' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const meta = await sock.groupMetadata(jid);
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    if (!admins.length) return sock.sendMessage(jid, { text: '❌ No admins found.' });
    const text = (match ? `${match}\n\n` : '👑 *Admins:*\n') + admins.map(m => `@${m.split('@')[0]}`).join('\n');
    await sock.sendMessage(jid, { text, mentions: admins });
});
