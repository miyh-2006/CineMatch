import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { auth } from './firebase';

export async function cadastrar(email: string, senha: string) {
  return await createUserWithEmailAndPassword(auth, email, senha);
}

export async function login(email: string, senha: string) {
  return await signInWithEmailAndPassword(auth, email, senha);
}

export async function logout() {
  return await signOut(auth);
}