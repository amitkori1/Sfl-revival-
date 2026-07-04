require('dotenv').config({ path: require('path').resolve(__dirname, '../config.env') });

const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    isJidGroup,
    downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { getCommands } = require('./events');
const { Filters } = require('./db');
const qrcode = require('qrcode-terminal');

// Load all plugins
fs.readdirSync(path.join(__dirname, 'plugins')).forEach(file => {
    if (file.endsWith('.js')) require('./plugins/' + file);
});

const { checkAfk } = require('./plugins/afk');

const SESSION_DIR = path.resolve(__dirname, '../session');
const PREFIX_RE = new RegExp(config.HANDLERS);

function getTextContent(msg) {
    const m = msg.message;
    return m?.conversation
        || m?.extendedTextMessage?.text
        || m?.imageMessage?.caption
        || m?.videoMessage?.caption
        || '';
}

function getQuotedParticipant(msg) {
    return msg.message?.extendedTextMessage?.contextInfo?.participant;
}

function getMentions(msg) {
    return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

async function startBot() {
    if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
    }

    const credsPath = path.join(SESSION_DIR, 'creds.json');
    if (!fs.existsSync(credsPath) && config.SESSION) {
        try {
            const credsData = Buffer.from(config.SESSION, 'base64').toString('utf-8');
            fs.writeFileSync(credsPath, credsData);
        } catch (e) {
            console.log('❌ Invalid base64 SESSION provided');
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !fs.existsSync(credsPath),
        auth: state,
        browser: ['SFL Bot', 'Desktop', '3.0'],
        generateHighQualityLinkPreview: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log('\n\n✅ Scan the QR code above with WhatsApp.\n');
            console.log('Go to: WhatsApp > Linked Devices > Link a Device\n');
        }
        if (connection === 'open') {
            console.log(`\n✅ SFL Bot connected! [${config.VERSION}]`);
            console.log(`   Mode: ${config.WORK_TYPE} | Prefix: ${config.HANDLERS.replace('^[', '').replace(']', '')[0] || '.'}\n`);
        }
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = code !== DisconnectReason.loggedOut;
            console.log(`Connection closed (code ${code}). Reconnect: ${shouldReconnect}`);
            if (shouldReconnect) {
                setTimeout(startBot, 3000);
            } else {
                console.log('❌ Logged out. Removing session and generating a new QR code.');
                fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                setTimeout(startBot, 3000);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message) continue;
            if (msg.key.remoteJid === 'status@broadcast') continue;

            const jid = msg.key.remoteJid;
            const isGroup = isJidGroup(jid);
            const fromMe = msg.key.fromMe;
            const botJid = sock.user.id;

            // Attach helpers to msg for plugin use
            msg.quotedParticipant = getQuotedParticipant(msg);
            msg.mentions = getMentions(msg);

            const text = getTextContent(msg);

            // Send read receipts
            if (config.SEND_READ && !fromMe) {
                await sock.readMessages([msg.key]);
            }

            // Check AFK
            if (!fromMe) {
                checkAfk(sock, msg, botJid);
            }

            // Check auto-filters (any message)
            if (text) {
                const filters = Filters.get(jid);
                for (const f of filters) {
                    if (text.toLowerCase().includes(f.pattern.toLowerCase())) {
                        await sock.sendMessage(jid, { text: f.reply, quoted: msg });
                        break;
                    }
                }
            }

            // Only process commands
            if (!text) continue;
            if (!PREFIX_RE.test(text[0])) continue;

            const body = text.slice(1).trim();
            const spaceIdx = body.indexOf(' ');
            const cmd = spaceIdx === -1 ? body : body.slice(0, spaceIdx);
            const match = spaceIdx === -1 ? '' : body.slice(spaceIdx + 1);

            const commands = getCommands();

            for (const { options, handler } of commands) {
                if (!options.pattern) continue;

                const patternRe = new RegExp(`^${options.pattern}$`, 'i');
                if (!patternRe.test(cmd)) continue;

                // fromMe check
                if (options.fromMe && !fromMe) continue;
                if (options.fromMe === false && fromMe) continue;

                // Work type check
                if (config.WORK_TYPE === 'private' && !fromMe) continue;

                // Group only check
                if (options.onlyGroup && !isGroup) {
                    await sock.sendMessage(jid, { text: '❌ This command can only be used in groups.' });
                    continue;
                }

                try {
                    await handler(sock, msg, match || null);
                } catch (err) {
                    console.error(`Error in command [${options.pattern}]:`, err.message);
                    await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` });
                }
                break;
            }
        }
    });

    // Handle anti-link
    if (config.ANTI_LINK) {
        sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
                if (msg.key.fromMe) continue;
                const text = getTextContent(msg);
                if (!text) continue;
                const hasLink = /https?:\/\/|chat\.whatsapp\.com/i.test(text);
                if (!hasLink) continue;

                const jid = msg.key.remoteJid;
                if (!isJidGroup(jid)) continue;

                const sender = msg.key.participant || msg.key.remoteJid;
                try {
                    await sock.groupParticipantsUpdate(jid, [sender], 'remove');
                    const alMsg = config.ANTILINK_MESSAGE !== 'default'
                        ? config.ANTILINK_MESSAGE
                        : `🚫 @${sender.split('@')[0]} was removed for sending a link.`;
                    await sock.sendMessage(jid, { text: alMsg, mentions: [sender] });
                } catch {}
            }
        });
    }
}

console.log('🤖 Starting SFL Bot...');
startBot().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
