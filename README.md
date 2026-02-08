# ✨ Heartstellation

> *Write your message in the stars and let the universe deliver it* 💫

A romantic web application that transforms heartfelt proposals into interactive stargazing experiences. Create magical moments where recipients click through a constellation of stars to reveal personalized messages and proposals.

🌐 **Live Demo:** [heartstellation1.onrender.com](https://heartstellation1.onrender.com/)

![Heartstellation Banner](https://img.shields.io/badge/Made%20with-Love-ff69b4?style=for-the-badge) ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white) ![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

---

## 🌟 Features

### 🎨 Interactive Star Experience
- **Click-to-Reveal**: Recipients click glowing stars to spell out their name
- **Animated Constellations**: Stars form into a heart shape after name completion
- **Cinematic Transitions**: Smooth animations and screen flashes for magical moments
- **Custom Background Music**: Upload your own track or provide a URL for the perfect ambiance

### 💌 Proposal System
- **Personalized Messages**: Write heartfelt messages that appear in a beautiful notebook interface
- **Real-time Notifications**: Get instant alerts via Socket.IO when someone responds
- **Mission Control Dashboard**: Track all your proposals in one place
- **Shareable Links**: Generate unique URLs for each proposal

### 🎭 User Experience
- **Authentication System**: Secure registration and login
- **Responsive Design**: Works beautifully on desktop and mobile
- **Glassmorphic UI**: Modern, elegant interface with backdrop blur effects
- **Dark Theme**: Cosmic-inspired color scheme with starry backgrounds

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/heartstellation.git
   cd heartstellation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

---

## 📖 How It Works

### For Creators (Proposers)

1. **Register/Login** to access Mission Control
2. **Create a New Mission**:
   - Enter recipient's name (max 15 characters)
   - Write a secret message
   - Add background music (optional - URL or file upload)
3. **Launch the Proposal** and copy the generated link
4. **Share the Link** with your special someone
5. **Get Real-time Notifications** when they respond!

### For Recipients

1. **Open the Shared Link** in your browser
2. **Click "Reveal Message"** to start the BGM and envelope animation
3. **Read the Secret Message** in the notebook view
4. **Click Glowing Stars** to spell your name one letter at a time
5. **Watch the Stars** form into a heart constellation
6. **Receive the Proposal**: "Will You Be Mine Forever?"
7. **Click YES or NO** to respond

---

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **Multer** - File upload handling for music files
- **CORS** - Cross-origin resource sharing
- **Body-Parser** - Request body parsing

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **HTML5 Canvas** - Star rendering and animations
- **CSS3** - Glassmorphic UI, animations, and responsive design
- **Google Fonts** - Playfair Display, Great Vibes, Poppins

### Data Storage
- **In-Memory Storage** - Ephemeral data store (resets on server restart)
- Perfect for demo/development; can be replaced with MongoDB/PostgreSQL for production

---

## 📁 Project Structure

```
heartstellation/
├── server.js              # Express server + Socket.IO setup
├── package.json           # Dependencies and scripts
├── index.html             # Mission Control dashboard (login/create)
├── forever.html           # Interactive star experience page
├── app.js                 # Star canvas logic + animations
├── styles.css             # Styles for forever.html
├── uploads/               # Directory for uploaded music files
└── README.md              # You are here!
```

---

## 🎨 Customization

### Changing Star Colors
Edit the star rendering in `app.js`:
```javascript
ctx.fillStyle = '#FFD700'; // Change to your preferred color
```

### Modifying Proposal Text
Update the text in `forever.html`:
```html
<div id="proposalLine1">BE</div>
<div id="proposalLine2">MINE</div>
<div id="proposalLine3">FOREVER?</div>
```

### Adding Music
Supports:
- Direct MP3/audio URL
- File upload (any audio format supported by browser)

---

## 🔒 Security Notes

⚠️ **Current Implementation:**
- Uses in-memory storage (data lost on restart)
- No password hashing
- No HTTPS enforcement
- No rate limiting

🛡️ **For Production Use:**
1. Implement proper database (MongoDB, PostgreSQL)
2. Add password hashing (bcrypt, argon2)
3. Enable HTTPS
4. Add rate limiting and CSRF protection
5. Implement session management with secure cookies
6. Validate and sanitize all user inputs

---

## 🌐 Deployment

### Deploy to Render (Recommended)

1. Create a `render.yaml` (optional):
   ```yaml
   services:
     - type: web
       name: heartstellation
       env: node
       buildCommand: npm install
       startCommand: npm start
   ```

2. Connect your GitHub repo to Render
3. Set environment variables if needed
4. Deploy! 🚀

### Environment Variables
```bash
PORT=3000  # Server port (auto-set by most hosts)
```

---

## 🤝 Contributing

Contributions are welcome! Here are some ideas:
- Add database persistence (MongoDB/PostgreSQL)
- Implement user profiles with avatars
- Add more proposal themes/templates
- Create admin panel for moderation
- Add analytics dashboard
- Support video messages
- Multi-language support

### Steps to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 💖 Credits

**Created with love for all the romantics out there** 

- Fonts: [Google Fonts](https://fonts.google.com/)
- Icons: Emoji Unicode
- Inspiration: The stars above ✨

---

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/heartstellation/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/heartstellation/discussions)

---

## 🌟 Star This Repo!

If Heartstellation helped you create a magical moment, please give it a ⭐️!

---

<div align="center">
  
Made with 💗 and ✨

*"Sometimes the best way to say something is to write it in the stars"*

</div>
