const { addCommand } = require('../events');
const config = require('../config');
const { downloadMedia } = require('../helpers');

// kickme - leave the group
addCommand({ pattern: 'kickme', fromMe: true, onlyGroup: true, desc: 'Leave the current group' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const text = config.KICKME_MESSAGE !== 'default' ? config.KICKME_MESSAGE : '👋 Leaving this group. Goodbye!';
    await sock.sendMessage(jid, { text });
    await sock.groupLeave(jid);
});

// block - block a user
addCommand({ pattern: 'block', fromMe: true, desc: 'Block a user' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const target = msg.quotedParticipant || msg.mentions?.[0];
    if (!target && jid.endsWith('@s.whatsapp.net')) {
        await sock.updateBlockStatus(jid, 'block');
        return sock.sendMessage(jid, { text: '🚫 *User blocked!*' });
    }
    if (!target) return sock.sendMessage(jid, { text: '❌ Reply to or mention a user to block.' });
    const blockMsg = config.BLOCK_MESSAGE !== 'default' ? config.BLOCK_MESSAGE : `🚫 @${target.split('@')[0]} has been *blocked*!`;
    await sock.updateBlockStatus(target, 'block');
    await sock.sendMessage(jid, { text: blockMsg, mentions: [target] });
});

// unblock - unblock a user
addCommand({ pattern: 'unblock', fromMe: true, desc: 'Unblock a user' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const target = msg.quotedParticipant || msg.mentions?.[0];
    if (!target && jid.endsWith('@s.whatsapp.net')) {
        await sock.updateBlockStatus(jid, 'unblock');
        return sock.sendMessage(jid, { text: '✅ *User unblocked!*' });
    }
    if (!target) return sock.sendMessage(jid, { text: '❌ Reply to or mention a user to unblock.' });
    const unblockMsg = config.UNBLOCK_MESSAGE !== 'default' ? config.UNBLOCK_MESSAGE : `✅ @${target.split('@')[0]} has been *unblocked*!`;
    await sock.updateBlockStatus(target, 'unblock');
    await sock.sendMessage(jid, { text: unblockMsg, mentions: [target] });
});

// jid - get JID of a user
addCommand({ pattern: 'jid', fromMe: true, desc: 'Get the JID of a user or chat' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const target = msg.quotedParticipant || msg.mentions?.[0];
    if (target) {
        await sock.sendMessage(jid, { text: `📋 *User JID:*\n\`${target}\`` });
    } else {
        await sock.sendMessage(jid, { text: `📋 *Chat JID:*\n\`${jid}\`` });
    }
});

// pp - set profile picture from replied image
addCommand({ pattern: 'pp', fromMe: true, desc: 'Set profile picture from replied image' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted?.imageMessage) return sock.sendMessage(jid, { text: '❌ Reply to an image to set as profile picture.' });

    try {
        const { buffer } = await downloadMedia({ message: quoted }, sock);
        await sock.updateProfilePicture(sock.user.id, buffer);
        await sock.sendMessage(jid, { text: '✅ *Profile picture updated!*' });
    } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Failed to update profile picture.' });
    }
});

// setbio - set status/bio
addCommand({ pattern: 'setbio', fromMe: true, desc: 'Set your WhatsApp bio/status. Usage: .setbio <text>' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    if (!match?.trim()) return sock.sendMessage(jid, { text: '❌ Provide a bio. Usage: `.setbio <text>`' });
    await sock.updateProfileStatus(match.trim());
    await sock.sendMessage(jid, { text: '✅ *Bio updated successfully!*' });
});
