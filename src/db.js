const fs = require('fs');
const path = require('path');

const DB_FILE = path.resolve(__dirname, '../data.json');

let db = { notes: [], filters: {}, afk: { active: false, reason: null, since: 0 } };

function load() {
    try {
        if (fs.existsSync(DB_FILE)) {
            db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        }
    } catch {}
}

function save() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

load();

const Notes = {
    getAll: () => db.notes || [],
    add: (note) => { db.notes.push(note); save(); },
    deleteAll: () => { db.notes = []; save(); },
};

const Filters = {
    get: (jid) => db.filters?.[jid] || [],
    set: (jid, pattern, reply) => {
        if (!db.filters) db.filters = {};
        if (!db.filters[jid]) db.filters[jid] = [];
        const existing = db.filters[jid].findIndex(f => f.pattern === pattern);
        if (existing >= 0) db.filters[jid][existing] = { pattern, reply };
        else db.filters[jid].push({ pattern, reply });
        save();
    },
    delete: (jid, pattern) => {
        if (!db.filters?.[jid]) return false;
        const before = db.filters[jid].length;
        db.filters[jid] = db.filters[jid].filter(f => f.pattern !== pattern);
        save();
        return db.filters[jid].length < before;
    },
};

const AFK = {
    get: () => db.afk || { active: false, reason: null, since: 0 },
    set: (reason) => { db.afk = { active: true, reason, since: Math.floor(Date.now() / 1000) }; save(); },
    clear: () => { db.afk = { active: false, reason: null, since: 0 }; save(); },
};

module.exports = { Notes, Filters, AFK };
