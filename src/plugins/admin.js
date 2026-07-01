const { addCommand } = require('../events');
const config = require('../config');

async function isAdmin(sock, jid, userJid) {
    const meta = await sock.groupMetadata(jid);
    return meta.participants.some(p => p.id === userJid && (p.admin === 'admin' || p.admin === 'superadmin'));
}

// ban
addCommand({ pattern: 'ban', fromMe: true, onlyGroup: true, desc: 'Ban a member from the group' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const botJid = sock.user.id.replace(':' + sock.user.id.split(':')[1]?.split('@')[0] + '@', '@').replace(/:\d+/, '');

    if (!await isAdmin(sock, jid, sender)) return sock.sendMessage(jid, { text: '❌ Only admins can use this command.' });

    let target = msg.quotedParticipant || (msg.mentions?.[0]);
    if (!target) return sock.sendMessage(jid, { text: '❌ Reply to a user or mention them to ban.' });

    const banMsg = config.BAN_MESSAGE !== 'default' ? config.BAN_MESSAGE : `@${target.split('@')[0]} has been *banned*! 🚫`;
    await sock.sendMessage(jid, { text: banMsg, mentions: [target] });
    await sock.groupParticipantsUpdate(jid, [target], 'remove');
});

// add
addCommand({ pattern: 'add', fromMe: true, onlyGroup: true, desc: 'Add a member to the group' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!await isAdmin(sock, jid, sender)) return sock.sendMessage(jid, { text: '❌ Only admins can use this command.' });

    if (!match) return sock.sendMessage(jid, { text: '❌ Provide a phone number. Example: `.add 1234567890`' });
    const numbers = match.trim().split(/\s+/);
    for (const num of numbers) {
        const clean = num.replace(/[^0-9]/g, '');
        if (!clean) continue;
        const target = clean + '@s.whatsapp.net';
        await sock.groupParticipantsUpdate(jid, [target], 'add');
        const addMsg = config.ADD_MESSAGE !== 'default' ? config.ADD_MESSAGE : `✅ \`${clean}\` has been added!`;
        await sock.sendMessage(jid, { text: addMsg });
    }
});

// promote
addCommand({ pattern: 'promote', fromMe: true, onlyGroup: true, desc: 'Promote a member to admin' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!await isAdmin(sock, jid, sender)) return sock.sendMessage(jid, { text: '❌ Only admins can use this command.' });

    let target = msg.quotedParticipant || msg.mentions?.[0];
    if (!target) return sock.sendMessage(jid, { text: '❌ Reply to or mention the user to promote.' });

    await sock.groupParticipantsUpdate(jid, [target], 'promote');
    const promoteMsg = config.PROMOTE_MESSAGE !== 'default' ? config.PROMOTE_MESSAGE : `⬆️ @${target.split('@')[0]} has been *promoted* to admin!`;
    await sock.sendMessage(jid, { text: promoteMsg, mentions: [target] });
});

// demote
addCommand({ pattern: 'demote', fromMe: true, onlyGroup: true, desc: 'Demote an admin to member' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!await isAdmin(sock, jid, sender)) return sock.sendMessage(jid, { text: '❌ Only admins can use this command.' });

    let target = msg.quotedParticipant || msg.mentions?.[0];
    if (!target) return sock.sendMessage(jid, { text: '❌ Reply to or mention the user to demote.' });

    await sock.groupParticipantsUpdate(jid, [target], 'demote');
    const demoteMsg = config.DEMOTE_MESSAGE !== 'default' ? config.DEMOTE_MESSAGE : `⬇️ @${target.split('@')[0]} has been *demoted*!`;
    await sock.sendMessage(jid, { text: demoteMsg, mentions: [target] });
});

// mute
addCommand({ pattern: 'mute', fromMe: true, onlyGroup: true, desc: 'Mute the group (admins only)' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!await isAdmin(sock, jid, sender)) return sock.sendMessage(jid, { text: '❌ Only admins can use this command.' });

    await sock.groupSettingUpdate(jid, 'announcement');
    const muteMsg = config.MUTE_MESSAGE !== 'default' ? config.MUTE_MESSAGE : '🔇 Group has been *muted*. Only admins can send messages.';
    await sock.sendMessage(jid, { text: muteMsg });
});

// unmute
addCommand({ pattern: 'unmute', fromMe: true, onlyGroup: true, desc: 'Unmute the group' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!await isAdmin(sock, jid, sender)) return sock.sendMessage(jid, { text: '❌ Only admins can use this command.' });

    await sock.groupSettingUpdate(jid, 'not_announcement');
    const unmuteMsg = config.UNMUTE_MESSAGE !== 'default' ? config.UNMUTE_MESSAGE : '🔊 Group has been *unmuted*. All members can send messages.';
    await sock.sendMessage(jid, { text: unmuteMsg });
});

// invite
addCommand({ pattern: 'invite', fromMe: true, onlyGroup: true, desc: 'Get the group invite link' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!await isAdmin(sock, jid, sender)) return sock.sendMessage(jid, { text: '❌ Only admins can use this command.' });

    const code = await sock.groupInviteCode(jid);
    await sock.sendMessage(jid, { text: `🔗 *Invite Link:*\nhttps://chat.whatsapp.com/${code}` });
});
