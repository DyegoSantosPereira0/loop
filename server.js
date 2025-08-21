// server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// ===== CONFIGURAÇÕES =====
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'seusegredojwt123';

app.use(cors());
app.use(bodyParser.json());

// ===== MONGODB =====
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://userLoop:Dy15987123@cluster0.l8la7tw.mongodb.net/loop_estudos?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.log('Erro MongoDB:', err));

// ===== SCHEMAS =====
const usuarioSchema = new mongoose.Schema({ username: String, password: String });
const materiaSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  nome: String,
  peso: Number,
  ciclos: { type: Number, default: 0 },
  revisoes: [{ type: Date }]
});
const historicoSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  materia: String,
  mensagem: String,
  dificuldade: Number,
  acertos: Number,
  data: { type: Date, default: Date.now }
});

const Usuario = mongoose.model('Usuario', usuarioSchema);
const Materia = mongoose.model('Materia', materiaSchema);
const Historico = mongoose.model('Historico', historicoSchema);

// ===== JWT MIDDLEWARE =====
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token não fornecido' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
};

// ===== ROTAS DE AUTENTICAÇÃO =====
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const novoUsuario = new Usuario({ username, password: hashed });
    await novoUsuario.save();
    res.json({ message: 'Usuário criado com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao registrar usuário', error: err });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await Usuario.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Usuário não encontrado' });

    const valido = await bcrypt.compare(password, user.password);
    if (!valido) return res.status(400).json({ message: 'Senha incorreta' });

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Erro no login', error: err });
  }
});

// ===== CRUD DE MATÉRIAS =====
app.get('/materias', authMiddleware, async (req, res) => {
  try {
    const materias = await Materia.find({ userId: req.user.id });
    res.json(materias);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar matérias', error: err });
  }
});

app.post('/materias', authMiddleware, async (req, res) => {
  try {
    const { nome, peso } = req.body;
    const materia = new Materia({ userId: req.user.id, nome, peso });
    await materia.save();
    res.json(materia);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar matéria', error: err });
  }
});

app.put('/materias/:id', authMiddleware, async (req, res) => {
  try {
    const { nome, peso } = req.body;
    const materia = await Materia.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { nome, peso },
      { new: true }
    );
    res.json(materia);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar matéria', error: err });
  }
});

app.delete('/materias/:id', authMiddleware, async (req, res) => {
  try {
    const materia = await Materia.findOne({ _id: req.params.id, userId: req.user.id });
    if (!materia) return res.status(404).json({ message: 'Matéria não encontrada' });

    await Historico.deleteMany({ userId: req.user.id, materia: materia.nome });
    await Materia.deleteOne({ _id: req.params.id, userId: req.user.id });

    res.json({ message: 'Matéria e histórico deletados com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao deletar matéria', error: err });
  }
});

// ===== HISTÓRICO =====
app.post('/historico', authMiddleware, async (req, res) => {
  try {
    const { materia, mensagem, dificuldade, acertos } = req.body;
    const hist = new Historico({ userId: req.user.id, materia, mensagem, dificuldade, acertos });
    await hist.save();
    res.json(hist);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao salvar histórico', error: err });
  }
});

app.get('/historico', authMiddleware, async (req, res) => {
  try {
    const historico = await Historico.find({ userId: req.user.id }).sort({ data: -1 });
    res.json(historico);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar histórico', error: err });
  }
});

// ===== REVISÕES =====
app.post('/materias/:id/revisoes', authMiddleware, async (req, res) => {
  try {
    const { datas } = req.body;
    const materia = await Materia.findOne({ _id: req.params.id, userId: req.user.id });
    if (!materia) return res.status(404).json({ message: 'Matéria não encontrada' });

    materia.revisoes.push(...datas.map(d => new Date(d)));
    await materia.save();
    res.json(materia);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao salvar revisões', error: err });
  }
});

app.get('/materias/:id/revisoes', authMiddleware, async (req, res) => {
  try {
    const materia = await Materia.findOne({ _id: req.params.id, userId: req.user.id });
    if (!materia) return res.status(404).json({ message: 'Matéria não encontrada' });
    res.json(materia.revisoes);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar revisões', error: err });
  }
});

// ===== ROTAS DE PÁGINAS =====
// Login primeiro
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'login.html'));
});

// Index depois
app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ===== INICIAR SERVIDOR =====
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
