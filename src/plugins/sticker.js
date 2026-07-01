const { addCommand } = require('../events');
const { downloadMedia } = require('../helpers');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, execSync } = require('child_process');

function isFfmpegAvailable() {
    try { execSync('ffmpeg -version', { stdio: 'ignore' }); return true; } catch { return false; }
}

// sticker - convert image/video to sticker
addCommand({ pattern: 'sticker', fromMe: true, desc: 'Convert replied image/video to a sticker' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;

    if (!quoted) return sock.sendMessage(jid, { text: '❌ Reply to an image or video to convert it to a sticker.' });

    const isImage = !!quoted.imageMessage;
    const isVideo = !!quoted.videoMessage;

    if (!isImage && !isVideo) return sock.sendMessage(jid, { text: '❌ Sticker creation supports images and videos only.' });

    const waitMsg = await sock.sendMessage(jid, { text: '⏳ Creating sticker...' });

    try {
        // Reconstruct a message object for downloadMediaMessage
        const fakeMsg = {
            key: { remoteJid: jid, id: ctx.stanzaId, fromMe: false },
            message: quoted
        };
        const { buffer } = await downloadMedia(fakeMsg, sock);

        if (isImage) {
            // Use sharp if available for webp conversion, otherwise send buffer directly
            let webpBuffer;
            try {
                const sharp = require('sharp');
                webpBuffer = await sharp(buffer)
                    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .webp()
                    .toBuffer();
            } catch {
                webpBuffer = buffer;
            }
            await sock.sendMessage(jid, { sticker: webpBuffer });
        } else if (isVideo) {
            if (!isFfmpegAvailable()) {
                return sock.sendMessage(jid, { text: '❌ ffmpeg not found. Install ffmpeg to convert videos to stickers.' });
            }
            const tmpIn = path.join(os.tmpdir(), `st_in_${Date.now()}`);
            const tmpOut = path.join(os.tmpdir(), `st_out_${Date.now()}.webp`);
            fs.writeFileSync(tmpIn, buffer);

            await new Promise((resolve, reject) => {
                execFile('ffmpeg', [
                    '-i', tmpIn,
                    '-vcodec', 'libwebp',
                    '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,fps=15',
                    '-lossless', '1',
                    '-loop', '0',
                    '-an',
                    '-vsync', '0',
                    '-t', '6',
                    tmpOut
                ], (err) => {
                    fs.rmSync(tmpIn, { force: true });
                    if (err) reject(err); else resolve();
                });
            });

            const webpBuffer = fs.readFileSync(tmpOut);
            fs.rmSync(tmpOut, { force: true });
            await sock.sendMessage(jid, { sticker: webpBuffer });
        }

        await sock.sendMessage(jid, { delete: waitMsg.key });
    } catch (e) {
        await sock.sendMessage(jid, { text: `❌ Failed to create sticker: ${e.message}` });
    }
});
