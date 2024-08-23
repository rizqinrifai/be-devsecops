const express = require('express');
const app = express();
const port = 3003;

app.use(express.json());

// Simulasi database sederhana
let users = [
  { id: 1, username: 'admin', password: 'admin123' },
  { id: 2, username: 'user', password: 'user123' }
];

app.get('/', (req, res) => {
  res.send('<h1>DEVSECOPSE PROJECT TESTING</h1>');
});

// Endpoint login yang rentan terhadap SQL Injection
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Peringatan: Ini adalah contoh yang buruk dan rentan terhadap SQL Injection
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  // Simulasi query database
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    res.json({ message: 'Login berhasil', user });
  } else {
    res.status(401).json({ message: 'Login gagal' });
  }
});

// Endpoint yang rentan terhadap XSS
app.get('/user/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (user) {
    // Peringatan: Ini adalah contoh yang buruk dan rentan terhadap XSS
    res.send(`<h1>Profil Pengguna</h1><p>Username: ${user.username}</p>`);
  } else {
    res.status(404).send('Pengguna tidak ditemukan');
  }
});

// Endpoint dengan potensi kebocoran informasi
app.get('/debug', (req, res) => {
  // Peringatan: Ini adalah contoh yang buruk dan dapat menyebabkan kebocoran informasi
  res.json({
    users: users,
    serverInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage()
    }
  });
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});