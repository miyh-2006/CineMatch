import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

import {
  listarFavoritos,
  listarListas,
  listarAvaliacoes,
  listarFilmesDaLista,
  restaurarDados,
} from './database';

export async function sincronizarDados() {
  const usuario = auth.currentUser;

  if (!usuario) return;

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
    doc(db, 'usuarios', usuario.uid),
    {
      favoritos,
      listas: listasComFilmes,
      avaliacoes,
      atualizadoEm: serverTimestamp(),
    },
    { merge: true }
  );
}
export async function sincronizarAoEntrar() {
  const usuario = auth.currentUser;

  if (!usuario) return;

  const referencia = doc(db, 'usuarios', usuario.uid);
  const documento = await getDoc(referencia);

  if (documento.exists()) {
    await restaurarDados(documento.data());
    console.log('Dados recuperados do Firestore!');
  } else {
    await sincronizarDados();
    console.log('Primeiros dados enviados ao Firestore!');
  }
}