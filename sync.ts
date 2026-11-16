import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { auth, db } from './firebase';

import {
  listarFavoritos,
  listarListas,
  listarAvaliacoes,
  listarFilmesDaLista,
  restaurarDados,
} from './database';

function chavePendente(uid: string) {
  return `cinematch_sync_pendente_${uid}`;
}

function marcarPendente(uid: string) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(chavePendente(uid), 'true');
  }
}

function existePendencia(uid: string) {
  if (typeof localStorage === 'undefined') return false;

  return localStorage.getItem(chavePendente(uid)) === 'true';
}

function limparPendencia(uid: string) {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(chavePendente(uid));
  }
}

export async function sincronizarDados() {
  const usuario = auth.currentUser;

  if (!usuario) return;

  const uid = usuario.uid;

  marcarPendente(uid);

  if (
    typeof navigator !== 'undefined' &&
    !navigator.onLine
  ) {
    return;
  }

  try {
    const favoritos = await listarFavoritos();
    const listas = await listarListas();
    const avaliacoes = await listarAvaliacoes();

    const listasComFilmes = await Promise.all(
      listas.map(async (lista) => ({
        ...lista,
        filmes: await listarFilmesDaLista(lista.id),
      }))
    );

    await setDoc(
      doc(db, 'usuarios', uid),
      {
        favoritos,
        listas: listasComFilmes,
        avaliacoes,
        atualizadoEm: serverTimestamp(),
      },
      { merge: true }
    );

    limparPendencia(uid);
  } catch (error) {
    console.error('Erro ao sincronizar os dados:', error);
  }
}

export async function sincronizarAoEntrar() {
  const usuario = auth.currentUser;

  if (!usuario) return;

  const uid = usuario.uid;

  if (existePendencia(uid)) {
    await sincronizarDados();
    return;
  }

  if (
    typeof navigator !== 'undefined' &&
    !navigator.onLine
  ) {
    return;
  }

  try {
    const referencia = doc(db, 'usuarios', uid);
    const documento = await getDoc(referencia);

    if (documento.exists()) {
      await restaurarDados(documento.data());
    } else {
      await sincronizarDados();
    }
  } catch (error) {
    console.error('Erro ao recuperar os dados da nuvem:', error);
  }
}