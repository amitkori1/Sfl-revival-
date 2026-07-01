const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

async function downloadMedia(msg, sock) {
    const tmpFile = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
    const buffer = await downloadMediaMessage(msg, 'buffer', {});
    fs.writeFileSync(tmpFile, buffer);
    return { tmpFile, buffer };
}

function secondsToHms(d) {
    d = Number(d);
    const h = Math.floor(d / 3600);
    const m = Math.floor((d % 3600) / 60);
    const s = Math.floor(d % 60);
    const hDisplay = h > 0 ? `${h}h ` : '';
    const mDisplay = m > 0 ? `${m}m ` : '';
    const sDisplay = s > 0 ? `${s}s` : '';
    return hDisplay + mDisplay + sDisplay || '0s';
}

function jidToPhone(jid) {
    return jid?.split('@')[0] || jid;
}

module.exports = { downloadMedia, secondsToHms, jidToPhone };
