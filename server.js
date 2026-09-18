const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const os = require('os');
const { Filter } = require('bad-words');
const filter = new Filter();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

let visitorCount = 0;
const ipRequestCounts = new Map();

const MAINTENANCE_MODE = false; // Set to true to enable maintenance mode

function getSavedMessages(parsedUrl, res) {
    const DATA_FILE = path.join(__dirname, 'messages.json');

    const action = parsedUrl && parsedUrl.searchParams ? parsedUrl.searchParams.get('action') : null;
    if (action === 'clear' && res) {
        const defaultMsg = ["All messages cleared by admin."];
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultMsg, null, 2));

        res.writeHead(302, { 'Location': '/admin' });
        return res.end();
    }
    if (!fs.existsSync(DATA_FILE)) return ['server booted up'];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

const fortunes = [
    "You will earn lots of money.",
    "You will have a great day.",
    "You will find love soon.",
    "You will achieve your goals."
];

const animalFacts = [
    "Giraffes can run up to 35 mph.",
    "Penguins have a special gland that filters salt from seawater.",
    "Octopuses have three hearts.",
    "Bats are the only mammals that can fly."
];

// const MIME_TYPES = {
//     '.html': 'text/html',
//     '.css': 'text/css',
//     '.js': 'text/javascript',
//     '.png': 'image/png',
//     '.jpg': 'image/jpeg',
//     '.gif': 'image/gif',
//     '.svg': 'image/svg+xml',
//     '.mp4': 'video/mp4',
//     '.json': 'application/json',
//     '.ico': 'image/x-icon'
// };

const LOG_FILE = path.join(__dirname, 'server.log');
const MAX_LOG_SIZE = 1024 * 1024;

function trimLogFile() {
    if (!fs.existsSync(LOG_FILE)) return;

    const stats = fs.statSync(LOG_FILE);
    console.log('log states:', JSON.stringify(stats, null, 2));
    if (stats.size > MAX_LOG_SIZE) {
        const logContent = fs.readFileSync(LOG_FILE, 'utf8');
        const recentLines = logContent.split('\n').slice(-1000);
        fs.writeFileSync(LOG_FILE, recentLines.join('\n'));

    }
}

trimLogFile();

http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const reqPath = parsedUrl.pathname;

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const logLine =
        `[${new Date().toISOString()}] IP: ${clientIp} [${req.method}] Path: ${reqPath}\n`;
    fs.appendFile(path.join(__dirname, 'server.log'), logLine, (err) => {
        if (err) console.error('Log write failed', err);
    });

    const now = Date.now();
    const windowMs = 10000;
    const maxRequests = 10;


    for (const [ip, data] of ipRequestCounts) {
        if (now > data.resetTime) {
            ipRequestCounts.delete(ip);
        }
    }

    const ipData = ipRequestCounts.get(clientIp) || { count: 0, resetTime: now + windowMs }

    if (reqPath === '/goat') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end('<h1>You are the G.O.A.T!</h1>');
    }

    if (reqPath === '/proxy') {
        try {
            const response = await fetch('https://catfact.ninja/fact');
            const data = await response.json();
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(`<h1>Cat Fact</h1><p>${data.fact}</p><a href="/">Home</a>`);
        } catch (err) {
            console.error('Proxy error:', err);
            res.writeHead(502, { 'Content-Type': 'text/html' });
            return res.end('<h1>502 Bad Gateway</h1>');
        }
    }


    if (now > ipData.resetTime) {
        ipData.count = 0;
        ipData.resetTime = now + windowMs
    }

    ipData.count++;
    ipRequestCounts.set(clientIp, ipData);

    if (ipData.count > maxRequests) {
        res.writeHead(429, { 'Content-Type': 'text/html', 'Retry-After': '10' });
        return res.end('<h1>429 Too Many Requests</h1><p>Please wait 10 seconds.</p>')
    }

    if (MAINTENANCE_MODE && reqPath !== '/api/system') {
        res.writeHead(503, { 'Content-Type': 'text/html', 'Retry-After': '300' });
        return res.end('<h1>503 Maintenance mode</h1><p>We are upgrading the server. Back soon!</p>');
    }

    if (reqPath === '/roll') {
        const roll = Math.floor(Math.random() * 6) + 1;
        console.log(`Roll: ${roll}`);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(`<h1>${roll}</h1>`);
    }

    if (reqPath === '/animal-facts') {
        const randomFact = animalFacts[Math.floor(Math.random() * animalFacts.length)];
        console.log(`Animal Fact: ${randomFact}`);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(`<h1>${randomFact}</h1>`);
    }

    if (reqPath === '/api/stats') {
        const stats = {
            visitorCount: visitorCount,
            uptimeSeconds: process.uptime(),
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(stats));
    }

    if (reqPath === '/api/system') {
        const systemInfo = {
            platform: os.platform(),
            cpus: os.cpus().length,
            freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
            totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
            uptimeMinutes: Math.round(process.uptime() / 60),
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(systemInfo, null, 2));
    }


    // Route Normalization: Map root to index.html & append .html to extensionless routes
    let normalizedPath = reqPath === '/' ? '/index.html' : reqPath;
    if (!path.extname(normalizedPath)) {
        normalizedPath += '.html';
    }

    const filePath = path.join(PUBLIC_DIR, normalizedPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mime.lookup(filePath) || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                return res.end('<h1>404: Page Not Found</h1>');
            }

            console.error('File read error:', err);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            return res.end('<h1>500: Internal Server Error</h1>');
        }

        const savedMessages = getSavedMessages(parsedUrl, res);
        if (!Array.isArray(savedMessages)) return; // redirect or non-array result handled inside getSavedMessages
        const messageListHTML = savedMessages.map(msg => `<li>${msg}</li>`).join('');

        let finalContent = content;

        if (ext === '.html') {

            let randomFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
            console.log(randomFortune);

            let animalFact = animalFacts[Math.floor(Math.random() * animalFacts.length)];
            console.log(animalFact);

            // Track visits to the home page
            if (normalizedPath === '/index.html') {
                visitorCount++;
                console.log(`[VISIT #${visitorCount}] Connection from: ${req.socket.remoteAddress}`);
            }

            const newMsg = parsedUrl.searchParams.get('msg');

            if (newMsg) {
                const messages = getSavedMessages();
                const cleanedInput = newMsg.replace(/\s+/g, ' ').trim();
                const compactInput = cleanedInput.replace(/\s+/g, ' ');

                const filteredMsg = filter.isProfane(compactInput)
                    ? '[message removed]'
                    : filter.clean(compactInput);

                const DATA_FILE = path.join(__dirname, 'messages.json');
                messages.push(filteredMsg);
                fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
                res.writeHead(302, { 'Location': '/shoutbox' });
                return res.end();
            }

            // Server-Driven Theme Handling
            const theme = parsedUrl.searchParams.get('theme') === 'dark' ? 'dark-mode' : 'light-mode';

            // Replace template placeholders in HTML files
            finalContent = content.toString()
                .replace('{{COUNT}}', String(visitorCount))
                .replace('{{FORTUNE}}', randomFortune)
                .replace('{{THEME_CLASS}}', theme)
                .replace('{{ANIMAL_FACT}}', animalFact)
                .replace('{{MESSAGES}}', messageListHTML);
        }

        console.log(`[REQUEST] ${req.socket.remoteAddress} accessed ${normalizedPath}`);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(finalContent);
    });
}).listen(PORT, '0.0.0.0', () => {
    console.log(`Server live! Listening on port http://localhost:${PORT}...`);
});