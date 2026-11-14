import * as SQLite from 'expo-sqlite';

export interface FavoritoDB {
  filme_id: number;
  titulo: string;
  poster_path: string | null;
  genero: string;
  nota: number;
  observacao: string;
}
let banco: SQLite.SQLiteDatabase | null = null;

let inicializando: Promise<SQLite.SQLiteDatabase> | null = null;
export async function conectarBanco() {
  if (banco) {
    return banco;
  }

  if (!inicializando) {
    inicializando = (async () => {
      const db = await SQLite.openDatabaseAsync('cinematch.db');

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS favoritos (
          filme_id INTEGER PRIMARY KEY NOT NULL,
          titulo TEXT NOT NULL,
          poster_path TEXT,
          genero TEXT,
          nota REAL,
          observacao TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS listas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS filmes_lista (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lista_id INTEGER NOT NULL,
          filme_id INTEGER NOT NULL,
          titulo TEXT NOT NULL,
          poster_path TEXT
        );
        CREATE TABLE IF NOT EXISTS avaliacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filme_id INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  nota REAL NOT NULL,
  comentario TEXT
);
      `);

      banco = db;
      return db;
    })().catch((error) => {
      inicializando = null;
      throw error;
    });
  }

  return inicializando;
}

// FAVORITOS

export async function salvarFavorito(filme: FavoritoDB) {
  const db = await conectarBanco();

  await db.runAsync(
    `INSERT OR REPLACE INTO favoritos
    (filme_id, titulo, poster_path, genero, nota, observacao)
    VALUES (?, ?, ?, ?, ?, ?)`,
    filme.filme_id,
    filme.titulo,
    filme.poster_path,
    filme.genero,
    filme.nota,
    filme.observacao
  );
}

export async function listarFavoritos() {
  const db = await conectarBanco();
  return await db.getAllAsync<FavoritoDB>(
    'SELECT * FROM favoritos'
  );
}

export async function atualizarObservacao(id: number, observacao: string) {
  const db = await conectarBanco();

  await db.runAsync(
    'UPDATE favoritos SET observacao = ? WHERE filme_id = ?',
    observacao,
    id
  );
}

export async function removerFavorito(id: number) {
  const db = await conectarBanco();

  await db.runAsync(
    'DELETE FROM favoritos WHERE filme_id = ?',
    id
  );
}

// LISTAS

export async function criarLista(nome: string) {
  const db = await conectarBanco();

  console.log('Banco:', db);
  console.log('Nome recebido:', nome);

  await db.execAsync(
    `INSERT INTO listas (nome) VALUES ('${nome.replace(/'/g, "''")}')`
  );

  console.log('Lista inserida com sucesso!');
}

export async function listarListas() {
  const db = await conectarBanco();

  return await db.getAllAsync<{ id: number; nome: string }>(
    'SELECT * FROM listas'
  );
}

export async function renomearLista(id: number, nome: string) {
  const db = await conectarBanco();

  const idSeguro = Number(id);
  const nomeSeguro = nome.replace(/'/g, "''");

  await db.execAsync(
    `UPDATE listas SET nome = '${nomeSeguro}' WHERE id = ${idSeguro}`
  );
}

export async function excluirLista(id: number) {
  const db = await conectarBanco();

  const idSeguro = Number(id);

  await db.execAsync(
    `DELETE FROM filmes_lista WHERE lista_id = ${idSeguro}`
  );

  await db.execAsync(
    `DELETE FROM listas WHERE id = ${idSeguro}`
  );
}

// FILMES DENTRO DAS LISTAS

export async function adicionarFilmeALista(
  listaId: number,
  filmeId: number,
  titulo: string,
  posterPath: string | null
) {
  const db = await conectarBanco();

  await db.runAsync(
    `INSERT INTO filmes_lista
    (lista_id, filme_id, titulo, poster_path)
    VALUES (?, ?, ?, ?)`,
    listaId,
    filmeId,
    titulo,
    posterPath
  );
}

export async function listarFilmesDaLista(listaId: number) {
  const db = await conectarBanco();

  return await db.getAllAsync(
    `SELECT * FROM filmes_lista WHERE lista_id = ${Number(listaId)}`
  );
}

export async function removerFilmeDaLista(
  listaId: number,
  filmeId: number
) {
  const db = await conectarBanco();

  await db.runAsync(
    'DELETE FROM filmes_lista WHERE lista_id = ? AND filme_id = ?',
    listaId,
    filmeId
  );
}
export async function salvarAvaliacao(
  filmeId: number,
  titulo: string,
  nota: number,
  comentario: string
) {
  const db = await conectarBanco();

  await db.runAsync(
    'INSERT INTO avaliacoes (filme_id, titulo, nota, comentario) VALUES (?, ?, ?, ?)',
    [filmeId, titulo, nota, comentario]
  );
}
export async function listarAvaliacoes() {
  const db = await conectarBanco();

  return await db.getAllAsync(
    'SELECT * FROM avaliacoes'
  );
}
export async function atualizarAvaliacao(
  id: number,
  nota: number,
  comentario: string
) {
  const db = await conectarBanco();

  await db.runAsync(
    'UPDATE avaliacoes SET nota = ?, comentario = ? WHERE id = ?',
    [nota, comentario, id]
  );
}
export async function excluirAvaliacao(id: number) {
  const db = await conectarBanco();

  await db.runAsync(
    'DELETE FROM avaliacoes WHERE id = ?',
    [id]
  );
}
// RESTAURAR DADOS RECEBIDOS DO FIRESTORE

export async function restaurarDados(dados: any) {
  const db = await conectarBanco();

  // Limpa os dados locais antigos
  await db.runAsync('DELETE FROM filmes_lista');
  await db.runAsync('DELETE FROM listas');
  await db.runAsync('DELETE FROM favoritos');
  await db.runAsync('DELETE FROM avaliacoes');

  // Restaura favoritos
  for (const favorito of dados.favoritos || []) {
    await db.runAsync(
      `INSERT INTO favoritos
      (filme_id, titulo, poster_path, genero, nota, observacao)
      VALUES (?, ?, ?, ?, ?, ?)`,
      favorito.filme_id,
      favorito.titulo,
      favorito.poster_path,
      favorito.genero,
      favorito.nota,
      favorito.observacao
    );
  }

  // Restaura listas e seus filmes
  for (const lista of dados.listas || []) {
    await db.runAsync(
      'INSERT INTO listas (id, nome) VALUES (?, ?)',
      lista.id,
      lista.nome
    );

    for (const filme of lista.filmes || []) {
      await db.runAsync(
        `INSERT INTO filmes_lista
        (lista_id, filme_id, titulo, poster_path)
        VALUES (?, ?, ?, ?)`,
        lista.id,
        filme.filme_id,
        filme.titulo,
        filme.poster_path
      );
    }
  }

  // Restaura avaliações
  for (const avaliacao of dados.avaliacoes || []) {
    await db.runAsync(
      `INSERT INTO avaliacoes
      (id, filme_id, titulo, nota, comentario)
      VALUES (?, ?, ?, ?, ?)`,
      avaliacao.id,
      avaliacao.filme_id,
      avaliacao.titulo,
      avaliacao.nota,
      avaliacao.comentario
    );
  }
}