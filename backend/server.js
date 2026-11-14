const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const TOKEN = process.env.TMDB_ACCESS_TOKEN;

app.get('/', (req, res) => {
  res.send('Servidor CineMatch funcionando!');
});

// Filmes populares
app.get('/api/filmes/populares', async (req, res) => {
  try {
    const resposta = await fetch(
      'https://api.themoviedb.org/3/movie/popular?language=pt-BR&page=1',
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          accept: 'application/json'
        }
      }
    );

    const dados = await resposta.json();
    res.json(dados.results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar filmes populares.' });
  }
});

// Buscar filmes
app.get('/api/filmes/buscar', async (req, res) => {
  try {
    const nome = req.query.nome;

    const resposta = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(nome)}&language=pt-BR`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          accept: 'application/json'
        }
      }
    );

    const dados = await resposta.json();
    res.json(dados.results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar filmes.' });
  }
});

const PORTA = 3001;

app.listen(PORTA, () => {
  console.log(`CineMatch rodando na porta ${PORTA}`);
});