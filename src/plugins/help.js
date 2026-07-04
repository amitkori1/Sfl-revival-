const { addCommand, getCommands } = require('../events');
const config = require('../config');

// help
addCommand({ pattern: 'help', fromMe: true, desc: 'Show list of commands' }, async (sock, msg, match) => {
    const jid = msg.key.remoteJid;
    const cmds = getCommands().filter(c => c.options.desc && c.options.pattern);

    const prefix = config.HANDLERS.replace('^[', '').replace(']', '')[0] || '.';
    const grouped = {};
    cmds.forEach(c => {
        const cat = c.options.category || 'General';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(`• \`${prefix}${c.options.pattern}\` — ${c.options.desc}`);
    });

    let text = `🤖 *SFL Bot Commands* | v${config.VERSION}\n\n`;
    for (const [cat, list] of Object.entries(grouped)) {
        text += `*━━ ${cat} ━━*\n${list.join('\n')}\n\n`;
    }
    text += `_Prefix: \`${prefix}\`  |  Mode: \`${config.WORK_TYPE}\`_`;
    await sock.sendMessage(jid, { text });
});
