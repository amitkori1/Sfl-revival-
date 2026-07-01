const { addCommand } = require('../events');
const { Notes } = require('../db');

// notes - list all saved notes
addCommand({ pattern: 'notes', fromMe: true, desc: 'List all saved notes' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const notes = Notes.getAll();
    if (!notes.length) return sock.sendMessage(jid, { text: '📭 No notes saved yet.\n\nUse `.save <text>` to save a note.' });
    const text = '*📒 Saved Notes:*\n\n' + notes.map((n, i) => `*${i + 1}.* ${n}`).join('\n\n');
    await sock.sendMessage(jid, { text });
});

// save - save a note
addCommand({ pattern: 'save', fromMe: true, desc: 'Save a note. Usage: .save <text>' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    if (!match) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const qtext = quoted?.conversation || quoted?.extendedTextMessage?.text;
        if (!qtext) return sock.sendMessage(jid, { text: '❌ Provide text or reply to a message.\nUsage: `.save <your note>`' });
        Notes.add(qtext);
        return sock.sendMessage(jid, { text: '✅ *Note saved successfully!*' });
    }
    Notes.add(match.trim());
    await sock.sendMessage(jid, { text: '✅ *Note saved successfully!*' });
});

// delnotes - delete all notes
addCommand({ pattern: 'delnotes', fromMe: true, desc: 'Delete all saved notes' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    Notes.deleteAll();
    await sock.sendMessage(jid, { text: '🗑️ *All notes deleted!*' });
});
