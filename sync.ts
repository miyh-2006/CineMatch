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

  // Marca a sincronização como pendente antes de tentar enviar.
  marcarPendente(uid);

  // Se estiver sem internet, mantém os dados locais.
  if (
    typeof navigator !== 'undefined' &&
    !navigator.onLine
  ) {
    console.log('Sem internet. Dados aguardando sincronização.');
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

    // Só limpa a pendência depois que o envio termina.
    limparPendencia(uid);

    console.log('Dados sincronizados com sucesso!');
  } catch (error) {
    console.log(
      'Falha na sincronização. Os dados continuam salvos localmente.',
      error
    );
  }
}

export async function sincronizarAoEntrar() {
  const usuario = auth.currentUser;

  if (!usuario) return;

  const uid = usuario.uid;

  // Se existem alterações locais pendentes, envia primeiro.
  if (existePendencia(uid)) {
    console.log('Encontradas alterações pendentes.');

    await sincronizarDados();

    return;
  }

  // Sem internet, não tenta recuperar dados da nuvem.
  if (
    typeof navigator !== 'undefined' &&
    !navigator.onLine
  ) {
    console.log('Sem internet. Mantendo dados locais.');
    return;
  }

  try {
    const referencia = doc(db, 'usuarios', uid);
    const documento = await getDoc(referencia);

    if (documento.exists()) {
      await restaurarDados(documento.data());

      console.log('Dados recuperados do Firestore!');
    } else {
      await sincronizarDados();

      console.log('Primeiros dados enviados ao Firestore!');
    }
  } catch (error) {
    console.log('Não foi possível recuperar os dados da nuvem:', error);
  }
}