const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const SESSION_DIR = path.resolve(__dirname, '../session');

async function connectForQR() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['SFL Bot', 'Desktop', '3.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            console.log('\n\n✅ Scan the QR code above with WhatsApp.\n');
            console.log('Go to: WhatsApp > Linked Devices > Link a Device\n');
        }
        if (connection === 'open') {
            console.log('\n🎉 Successfully connected! Session saved to ./session/');
            console.log('\nNow run: npm start\n');
            process.exit(0);
        }
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code === DisconnectReason.loggedOut) {
                console.log('❌ Logged out. Please delete the ./session folder and run qr again.');
                process.exit(1);
            }
            console.log('Connection closed. Reconnecting...');
            connectForQR();
        }
    });
}

console.log('🤖 SFL Bot - QR Code Generator');
console.log('================================\n');
connectForQR().catch(console.error);
