// Importa as funções do Firebase responsáveis por criar contas,
// realizar login e encerrar a sessão do usuário.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

// Importa a configuração da autenticação do nosso projeto.
import { auth } from './firebase';

// Cadastra um novo usuário usando e-mail e senha.
// O Firebase verifica os dados e cria a conta.
export async function cadastrar(email: string, senha: string) {
  return await createUserWithEmailAndPassword(auth, email.trim(), senha);
}

// Realiza o login de um usuário que já possui uma conta.
// O Firebase verifica se o e-mail e a senha estão corretos.
export async function login(email: string, senha: string) {
  return await signInWithEmailAndPassword(auth, email.trim(), senha);
}

// Encerra a sessão do usuário que está conectado.
export async function logout() {
  return await signOut(auth);
}