const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

let visitorCount = 0;

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

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.json': 'application/json',
    '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const reqPath = parsedUrl.pathname;

    if (reqPath === '/goat') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end('<h1>You are the G.O.A.T!</h1>');
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

    // Route Normalization: Map root to index.html & append .html to extensionless routes
    let normalizedPath = reqPath === '/' ? '/index.html' : reqPath;
    if (!path.extname(normalizedPath)) {
        normalizedPath += '.html';
    }

    const filePath = path.join(PUBLIC_DIR, normalizedPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            return res.end('<h1>404: Page Not Found</h1>');
        }

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

            // Server-Driven Theme Handling
            const theme = parsedUrl.searchParams.get('theme') === 'dark' ? 'dark-mode' : 'light-mode';

            // Replace template placeholders in HTML files
            finalContent = content.toString()
                .replace('{{COUNT}}', String(visitorCount))
                .replace('{{FORTUNE}}', randomFortune)
                .replace('{{THEME_CLASS}}', theme)
                .replace('{{ANIMAL_FACT}}', animalFact);
        }

        console.log(`[REQUEST] ${req.socket.remoteAddress} accessed ${normalizedPath}`);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(finalContent);
    });
}).listen(PORT, '0.0.0.0', () => {
    console.log(`Server live! Listening on port http://localhost:${PORT}...`);
});