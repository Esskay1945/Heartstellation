const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.enable('trust proxy');
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- IN-MEMORY DATA STORE (Ephemeral) ---
const users = []; // { username, password }
const proposals = []; // { id, creator, name, message, musicUrl, response, timestamp }

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a room based on proposal ID (for creators watching specific proposals)
    socket.on('join_proposal', (proposalId) => {
        socket.join(proposalId);
        console.log(`User ${socket.id} joined proposal room: ${proposalId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// --- API ROUTES ---

// 1. Register
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Missing fields' });
    if (users.find(u => u.username === username)) return res.status(400).json({ success: false, message: 'User exists' });

    users.push({ username, password });
    res.json({ success: true, message: 'Registered' });
});

// 2. Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    res.json({ success: true, username });
});

// 3. Create Proposal (Upload Music)
app.post('/api/proposals/create', upload.single('bgmFile'), (req, res) => {
    const { username, name, message, musicUrl } = req.body;
    let finalMusicUrl = musicUrl || '';

    if (req.file) {
        finalMusicUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    const newProposal = {
        id: Date.now().toString(),
        creator: username,
        name,
        message,
        musicUrl: finalMusicUrl,
        response: 'pending',
        timestamp: new Date()
    };

    proposals.push(newProposal);
    res.json({ success: true, proposal: newProposal });
});

// 4. Get User's Proposals
app.get('/api/proposals', (req, res) => {
    const { username } = req.query;
    if (!username) return res.json([]);
    const userProposals = proposals.filter(p => p.creator === username);
    res.json(userProposals);
});

// 5. Respond to Proposal (From forever.html)
app.post('/api/respond', (req, res) => {
    const { id, response, message } = req.body;
    const proposal = proposals.find(p => p.id === id);

    if (proposal) {
        proposal.response = response;
        proposal.timestamp = new Date();

        // Notify the creator via Socket.io
        io.to(id).emit('response_received', {
            id,
            response,
            message
        });

        console.log(`Response for ${id}: ${response} - Notification sent via Socket`);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Proposal not found' });
    }
});

// Start Server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
