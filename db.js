// db.js - the ONLY file that knows how guestbook data is stored
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const GUESTBOOK_FILE = path.join(__dirname, 'guestbook.json');
const MAX_ENTRIES = 50;

// ----- Private helpers (not exported) -----

async function readAll() {
    try {
        const text = await fs.readFile(GUESTBOOK_FILE, 'utf8');
        return JSON.parse(text);
    } catch (err) {
        if (err.code === 'ENOENT') return []; // file doesn't exist yet
        throw err; // anything else is a real problem for the error handler
    }
}

async function writeAll(entries) {
    await fs.writeFile(GUESTBOOK_FILE, JSON.stringify(entries, null, 2));
}

// ----- Public functions (exported) -----

async function getAllEntries() {
    return readAll();
}

async function getEntryById(id) {
    const entries = await readAll();
    return entries.find(entry => entry.id === id) || null;
}

async function addEntry({ name, msg }) {
    const entries = await readAll();
    const entry = {
        id: crypto.randomUUID(),
        name,
        msg,
        createdAt: new Date().toISOString()
    };
    entries.push(entry);
    await writeAll(entries.slice(-MAX_ENTRIES));
    return entry;
}

async function updateEntry(id, { name, msg }) {
    const entries = await readAll();
    const entry = entries.find(e => e.id === id);
    if (!entry) return null;

    entry.name = name;
    entry.msg = msg;
    entry.updatedAt = new Date().toISOString();
    await writeAll(entries);
    return entry;
}

async function deleteEntry(id) {
    const entries = await readAll();
    const remaining = entries.filter(e => e.id !== id);
    if (remaining.length === entries.length) return false; // nothing matched

    await writeAll(remaining);
    return true;
}

module.exports = { getAllEntries, getEntryById, addEntry, updateEntry, deleteEntry };