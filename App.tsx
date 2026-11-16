import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  StatusBar,
  Image,
  ImageBackground,
  ActivityIndicator,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';

import {
  criarLista,
  listarListas,
  conectarBanco,
  renomearLista,
  excluirLista as excluirListaBanco,
  salvarFavorito,
  listarFavoritos,
  removerFavorito,
  atualizarObservacao,
  adicionarFilmeALista,
  listarFilmesDaLista,
  removerFilmeDaLista,
  salvarAvaliacao,
  listarAvaliacoes,
  atualizarAvaliacao,
  excluirAvaliacao,
} from './database';

import { cadastrar, login, logout } from './auth';

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import { sincronizarAoEntrar, sincronizarDados } from './sync';

type Filme = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  genre_ids: number[];
};

const API_URL = 'https://vigilant-tribble-wrjgq5jxq6rv36x9-3001.app.github.dev/api/filmes/populares';

const IMAGES_URL = 'https://image.tmdb.org/t/p/w500';

const generos: Record<number, string> = {
  28: 'Ação',
  12: 'Aventura',
  16: 'Animação',
  18: 'Drama',
  27: 'Terror',
  35: 'Comédia',
  53: 'Suspense',
  878: 'Ficção científica',
  10749: 'Romance',
  14: 'Fantasia',
};

// Valida o formato do e-mail, incluindo domínio e extensão (ex.: .com ou .com.br).
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}(?:\.[A-Za-z]{2,})?$/;

// Regras de segurança exigidas somente para novas contas.
function validarSenha(senha: string) {
  return {
    tamanho: senha.length >= 8,
    maiuscula: /[A-Z]/.test(senha),
    minuscula: /[a-z]/.test(senha),
    numero: /[0-9]/.test(senha),
    especial: /[^A-Za-z0-9]/.test(senha),
  };
}

// Componente principal: guarda os dados da tela e coordena as funcionalidades do app.
export default function App() {
  const [filmes, setFilmes] = useState<Filme[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [listas, setListas] = useState<{ id: number; nome: string }[]>([]);
  const [novaLista, setNovaLista] = useState('');
  const [listaSelecionada, setListaSelecionada] = useState<number | null>(null);
  const [filmesDaLista, setFilmesDaLista] = useState<any[]>([]);
  const [favoritos, setFavoritos] = useState<number[]>([]);
  const [filmesFavoritosSalvos, setFilmesFavoritosSalvos] = useState<any[]>([]);
  const [observacoes, setObservacoes] = useState<Record<number, string>>({});
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [usuario, setUsuario] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [modoCadastro, setModoCadastro] = useState(false);
  const [erroAuth, setErroAuth] = useState('');
  const [carregandoAuth, setCarregandoAuth] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aba, setAba] = useState<'inicio' | 'favoritos' | 'listas' | 'avaliacoes'>('inicio');

  // Inicializa o SQLite, banco local usado para manter os dados no aparelho.
  useEffect(() => {
    conectarBanco().catch((error) => {
      console.error('Erro ao conectar ao SQLite:', error);
      alert('Não foi possível iniciar o banco de dados local.');
    });
  }, []);
// Observa o login do Firebase e carrega os dados do usuário.
useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);

      if (user) {
        try {
          await sincronizarAoEntrar();

          // Atualiza a tela com os dados locais após a sincronização inicial.
          const [listasSalvas, favoritosSalvos, avaliacoesSalvas] =
            await Promise.all([
              listarListas(),
              listarFavoritos(),
              listarAvaliacoes(),
            ]);

          setListas(listasSalvas);
          setFilmesFavoritosSalvos(favoritosSalvos);
          setFavoritos(favoritosSalvos.map((filme) => filme.filme_id));
          setAvaliacoes(avaliacoesSalvas);

          const mapa: Record<number, string> = {};
          favoritosSalvos.forEach((filme) => {
            mapa[filme.filme_id] = filme.observacao || '';
          });
          setObservacoes(mapa);
        } catch (error) {
          console.error('Erro na sincronização:', error);
        }
      }
    });

    return unsubscribe;
  }, []);
  const { width } = useWindowDimensions();

  const larguraCard =
    width >= 1100 ? '18%' :
    width >= 700 ? '23%' : '48%';

  // Busca os filmes populares na API do TMDB.
  useEffect(() => {
    async function carregarFilmes() {
      try {
        const resposta = await fetch(API_URL);

        if (!resposta.ok) {
          throw new Error('Não foi possível carregar os filmes.');
        }

        const dados = await resposta.json();

        setFilmes(dados);
      } catch (error) {
        console.error(error);
        setErro('Não foi possível conectar ao servidor.');
      } finally {
        setCarregando(false);
      }
    }

    carregarFilmes();
  }, []);
  useEffect(() => {
  if (typeof window === 'undefined') return;

  function quandoInternetVoltar() {
    sincronizarDados().catch((error) => {
      console.log('Não foi possível sincronizar os dados:', error);
    });
  }

  window.addEventListener('online', quandoInternetVoltar);

  return () => {
    window.removeEventListener('online', quandoInternetVoltar);
  };
}, []);
// CRUD de listas: cria a lista e atualiza a interface.
async function criarNovaLista() {
  if (!novaLista.trim()) return;

  try {
    await criarLista(novaLista.trim());

    const atualizadas = await listarListas();
    setListas(atualizadas);
    setNovaLista('');

    sincronizarDados().catch((error) => {
      console.log('Sincronização pendente:', error);
    });

  } catch (error) {
    alert('Erro ao salvar lista: ' + String(error));
  }
}
async function editarLista(lista: { id: number; nome: string }) {
  const novoNome = window.prompt(
    'Digite o novo nome da lista:',
    lista.nome
  );

  if (novoNome === null || !novoNome.trim()) return;

  try {
    await renomearLista(lista.id, novoNome.trim());

    const atualizadas = await listarListas();
    setListas(atualizadas);

    sincronizarDados().catch((error) => {
      console.log('Sincronização pendente:', error);
    });

    alert('Lista renomeada com sucesso!');
  } catch (error) {
    console.error('Erro ao renomear lista:', error);
    alert('Não foi possível renomear a lista.');
  }
}

async function excluirListaDaTela(listaId: number) {
  if (!window.confirm('Deseja excluir esta lista?')) return;

  try {
    await excluirListaBanco(listaId);

    const atualizadas = await listarListas();
    setListas(atualizadas);

    if (listaSelecionada === listaId) {
      setListaSelecionada(null);
      setFilmesDaLista([]);
    }

    sincronizarDados().catch((error) => {
      console.log('Sincronização pendente:', error);
    });

    alert('Lista excluída!');
  } catch (error) {
    console.error('Erro ao excluir lista:', error);
    alert('Não foi possível excluir a lista.');
  }
}
useEffect(() => {
  async function carregarListasSalvas() {
    try {
      const dados = await listarListas();
      setListas(dados);
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
    }
  }

  carregarListasSalvas();
}, []);
useEffect(() => {
  async function carregarFilmesDaLista() {
    if (listaSelecionada === null) {
      setFilmesDaLista([]);
      return;
    }

    try {
      const dados = await listarFilmesDaLista(listaSelecionada);
      setFilmesDaLista(dados);
    } catch (error) {
      console.error('Erro ao carregar filmes da lista:', error);
    }
  }

  carregarFilmesDaLista();
}, [listaSelecionada]);
useEffect(() => {
  async function carregarFavoritosSalvos() {
    try {
      const salvos = await listarFavoritos();
      setFilmesFavoritosSalvos(salvos);
      setFavoritos(salvos.map((filme) => filme.filme_id));

      const mapa: Record<number, string> = {};

      salvos.forEach((filme) => {
        mapa[filme.filme_id] = filme.observacao || '';
      });

      setObservacoes(mapa);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    }
  }

  carregarFavoritosSalvos();
}, []);
useEffect(() => {
  async function carregarAvaliacoes() {
    try {
      const dados = await listarAvaliacoes();
      setAvaliacoes(dados);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
    }
  }

  carregarAvaliacoes();
}, []);
// CRUD de favoritos: adiciona ou remove e atualiza a cópia na nuvem.
async function alternarFavorito(id: number) {
  try {
    const jaFavoritado = favoritos.includes(id);

    if (jaFavoritado) {
      await removerFavorito(id);
    } else {
      const filme = filmes.find((item) => item.id === id);

      if (!filme) return;

      await salvarFavorito({
        filme_id: filme.id,
        titulo: filme.title,
        poster_path: filme.poster_path,
        genero: generos[filme.genre_ids[0]] || 'Filme',
        nota: filme.vote_average,
        observacao: observacoes[id] || '',
      });
    }

    const salvos = await listarFavoritos();

    setFilmesFavoritosSalvos(salvos);
    setFavoritos(salvos.map((filme) => filme.filme_id));

    sincronizarDados().catch((error) => {
      console.log('Sincronização pendente:', error);
    });

  } catch (error) {
    console.error('Erro ao atualizar favorito:', error);
    alert('Não foi possível atualizar os favoritos.');
  }
}

// Registra uma avaliação e envia a alteração para sincronização.
async function avaliarFilme(filme: Filme) {
  const nota = Number(window.prompt('Dê uma nota de 0 a 10:'));

  if (isNaN(nota) || nota < 0 || nota > 10) {
    alert('Digite uma nota válida!');
    return;
  }

  const comentario = window.prompt('Escreva um comentário:') || '';

  try {
    await salvarAvaliacao(filme.id, filme.title, nota, comentario);

    const dados = await listarAvaliacoes();
    setAvaliacoes(dados);

    sincronizarDados().catch((error) => {
      console.log('Sincronização pendente:', error);
    });

    alert('Avaliação salva!');
  } catch (error) {
    console.error('Erro ao salvar avaliação:', error);
    alert('Não foi possível salvar a avaliação.');
  }
}

// Faz login ou cadastro e apresenta os problemas dentro do próprio formulário.
async function acessarConta() {
  setErroAuth('');
  const emailLimpo = email.trim();

  if (!EMAIL_VALIDO.test(emailLimpo)) {
    setErroAuth('Confira o e-mail: informe usuário, @, domínio e extensão (ex.: nome@email.com).');
    return;
  }

  // A senha forte é exigida no cadastro; contas antigas continuam podendo entrar.
  if (modoCadastro) {
    const regras = validarSenha(senha);
    if (Object.values(regras).some((regra) => !regra)) {
      setErroAuth('Complete todos os requisitos da senha antes de criar sua conta.');
      return;
    }
  } else if (!senha) {
    setErroAuth('Digite sua senha para entrar.');
    return;
  }

  setCarregandoAuth(true);
  try {
    if (modoCadastro) await cadastrar(emailLimpo, senha);
    else await login(emailLimpo, senha);
  } catch (error: any) {
    const codigo = error?.code;
    const mensagens: Record<string, string> = {
      'auth/invalid-email': 'Digite um e-mail válido.',
      'auth/email-already-in-use': 'Este e-mail já possui uma conta. Tente entrar.',
      'auth/weak-password': 'A senha não atende aos requisitos de segurança.',
      'auth/invalid-credential': 'E-mail ou senha incorretos.',
      'auth/wrong-password': 'E-mail ou senha incorretos.',
      'auth/user-not-found': 'E-mail ou senha incorretos.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
      'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
    };
    setErroAuth(mensagens[codigo] || 'Não foi possível acessar sua conta. Tente novamente.');
  } finally {
    setCarregandoAuth(false);
  }
}

async function sairDaConta() {
  await logout();
  setEmail('');
  setSenha('');
}
async function editarAvaliacao(item: any) {
  const notaTexto = window.prompt('Nova nota:', String(item.nota));

  if (notaTexto === null) return;

  const nota = Number(notaTexto);

  if (isNaN(nota) || nota < 0 || nota > 10) {
    alert('Digite uma nota de 0 a 10!');
    return;
  }

  const comentario = window.prompt('Novo comentário:', item.comentario || '');

  if (comentario === null) return;

  await atualizarAvaliacao(item.id, nota, comentario);
  await sincronizarDados();
  setAvaliacoes(await listarAvaliacoes());
  alert('Avaliação atualizada!');
}
async function removerAvaliacao(id: number) {
  if (!window.confirm('Deseja excluir esta avaliação?')) return;

  try {
    await excluirAvaliacao(id);

    const dados = await listarAvaliacoes();
    setAvaliacoes(dados);

    sincronizarDados().catch((error) => {
      console.log('Sincronização pendente:', error);
    });

    alert('Avaliação excluída!');
  } catch (error) {
    console.error('Erro ao excluir avaliação:', error);
    alert('Não foi possível excluir a avaliação.');
  }
}
async function adicionarFilmeSelecionado(filme: Filme) {
  if (listaSelecionada === null) {
    alert('Selecione uma lista primeiro!');
    return;
  }

  try {
    await adicionarFilmeALista(
      listaSelecionada,
      filme.id,
      filme.title,
      filme.poster_path
    );

    const atualizados = await listarFilmesDaLista(listaSelecionada);
    setFilmesDaLista(atualizados);

    sincronizarDados().catch((error) => {
      console.log('Sincronização pendente:', error);
    });

    alert('Filme adicionado à lista!');
  } catch (error) {
    console.error('Erro ao adicionar filme à lista:', error);
    alert('Não foi possível adicionar o filme.');
  }
}
async function excluirFilmeDaLista(listaId: number, filmeId: number) {
  try {
    await removerFilmeDaLista(listaId, filmeId);

    const atualizados = await listarFilmesDaLista(listaId);
    setFilmesDaLista(atualizados);

    sincronizarDados().catch((error) => {
      console.log('Sincronização pendente:', error);
    });
  } catch (error) {
    console.error('Erro ao remover filme da lista:', error);
    alert('Não foi possível remover o filme.');
  }
}
const filmesFiltrados = filmes.filter((filme) =>
  filme.title.toLowerCase().includes(busca.toLowerCase())
);
 
  const destaque = filmes[0];

  if (!usuario) {
    const requisitosSenha = validarSenha(senha);
    const requisitos = [
      ['Pelo menos 8 caracteres', requisitosSenha.tamanho],
      ['Uma letra maiúscula', requisitosSenha.maiuscula],
      ['Uma letra minúscula', requisitosSenha.minuscula],
      ['Um número', requisitosSenha.numero],
      ['Um caractere especial (!@#$...)', requisitosSenha.especial],
    ] as const;

    return (
      <ScrollView contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled">
        <StatusBar barStyle="light-content" />
        <View style={styles.loginContainer}>
          <View style={styles.loginGlow} />
          <View style={styles.loginCard}>
            <Image source={require('./assets/claquete.png')} style={styles.loginLogoImage} resizeMode="contain" />
            <Text style={styles.loginTitle}>Cine<Text style={styles.logoPink}>Match</Text></Text>
            <Text style={styles.loginSubtitle}>SEU UNIVERSO DE FILMES</Text>
            <Text style={styles.loginWelcome}>{modoCadastro ? 'Crie sua conta' : 'Bem-vindo de volta'}</Text>
            <Text style={styles.loginDescription}>
              {modoCadastro ? 'Entre para salvar seus filmes favoritos.' : 'Entre e continue descobrindo histórias.'}
            </Text>

            <Text style={styles.fieldLabel}>E-MAIL</Text>
            <TextInput
              placeholder="seuemail@exemplo.com"
              placeholderTextColor="#82758D"
              value={email}
              onChangeText={(valor) => { setEmail(valor); setErroAuth(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.loginInput}
            />
            {!!email && !EMAIL_VALIDO.test(email.trim()) && (
              <Text style={styles.fieldFeedback}>Informe um e-mail completo, com @, domínio e extensão.</Text>
            )}

            <Text style={styles.fieldLabel}>SENHA</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                placeholder="Digite sua senha"
                placeholderTextColor="#82758D"
                value={senha}
                onChangeText={(valor) => { setSenha(valor); setErroAuth(''); }}
                secureTextEntry={!mostrarSenha}
                autoCapitalize="none"
                style={styles.passwordInput}
              />
              <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)} style={styles.showPasswordButton}>
                <Text style={styles.showPasswordText}>{mostrarSenha ? 'Ocultar' : 'Mostrar'}</Text>
              </TouchableOpacity>
            </View>

            {modoCadastro ? (
              <View style={styles.passwordRules}>
                <Text style={styles.rulesTitle}>Sua senha precisa ter:</Text>
                {requisitos.map(([texto, valido]) => (
                  <Text key={texto} style={[styles.ruleItem, valido && styles.ruleValid]}>
                    {valido ? '✓' : '○'}  {texto}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.loginHint}>Use a senha cadastrada na sua conta.</Text>
            )}

            {!!erroAuth && <Text style={styles.loginError}>⚠  {erroAuth}</Text>}

            <TouchableOpacity onPress={acessarConta} disabled={carregandoAuth} style={[styles.loginButton, carregandoAuth && styles.buttonDisabled]}>
              {carregandoAuth ? <ActivityIndicator color="#FFFFFF" /> :
                <Text style={styles.loginButtonText}>{modoCadastro ? 'CRIAR MINHA CONTA' : 'ENTRAR'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setModoCadastro(!modoCadastro); setErroAuth(''); }} style={styles.loginSwitchButton}>
              <Text style={styles.loginSwitch}>{modoCadastro ? 'Já tem uma conta? Entrar' : 'Ainda não tem conta? Criar conta'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.loginFooter}>CINEMATCH • DESCUBRA, SALVE E AVALIE</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Barra superior: marca e navegação principal do aplicativo. */}
          <View style={styles.topBar}>
            <View style={styles.brand}>
              <Image source={require('./assets/claquete.png')} style={styles.brandLogoImage} resizeMode="contain" />
              <Text style={styles.logo}>Cine<Text style={styles.logoPink}>Match</Text></Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {([['inicio', '⌂  Início'], ['favoritos', '♥  Favoritos'], ['listas', '▤  Minhas listas'], ['avaliacoes', '★  Avaliações']] as const).map(([id, nome]) => (
                <TouchableOpacity key={id} onPress={() => setAba(id)} style={[styles.tab, aba === id && styles.tabAtiva]}>
                  <Text style={[styles.tabTexto, aba === id && styles.tabTextoAtivo]}>{nome}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={sairDaConta} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
          </View>

          {aba === 'inicio' && (
            <>
          {/* APRESENTAÇÃO */}
          <Text style={styles.subtitle}>
            SEU UNIVERSO DE FILMES
          </Text>

          <Text style={styles.title}>
            Encontre seu próximo
            {'\n'}
            <Text style={styles.highlight}>
              filme favorito.
            </Text>
          </Text>

          {/* PESQUISA */}
          <TextInput
            style={styles.search}
            placeholder="🔍  Pesquisar filmes..."
            placeholderTextColor="#999"
            value={busca}
            onChangeText={setBusca}
          />

          {/* DESTAQUE */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              🔥 Em destaque
            </Text>
          </View>

          {destaque && (
            <ImageBackground
              source={{
                uri: destaque.backdrop_path
                  ? IMAGES_URL + destaque.backdrop_path
                  : undefined,
              }}
              style={styles.featured}
              imageStyle={styles.featuredImage}
            >
              <View style={styles.featuredOverlay}>
                <Text style={styles.featuredTag}>
                  RECOMENDAÇÃO DO DIA
                </Text>

                <Text style={styles.featuredTitle}>
                  {destaque.title}
                </Text>

                <Text style={styles.featuredDescription}>
                  {destaque.overview || 'Descubra essa história no CineMatch.'}
                </Text>

                <Text style={styles.featuredRating}>
                  ★ {destaque.vote_average.toFixed(1)}
                </Text>
              </View>
            </ImageBackground>
          )}

          {/* FILMES POPULARES */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              ✨ Filmes populares
            </Text>

            <Text style={styles.seeAll}>
              {filmesFiltrados.length} filmes
            </Text>
          </View>

          {carregando ? (
            <ActivityIndicator
              size="large"
              color="#D65AFF"
              style={{ marginVertical: 40 }}
            />
          ) : erro ? (
            <Text style={styles.error}>{erro}</Text>
          ) : filmesFiltrados.length === 0 ? (
            <Text style={styles.error}>
              Nenhum filme encontrado.
            </Text>
          ) : (
            <View style={styles.movieList}>
              {filmesFiltrados.map((filme) => (
                <View
                  style={[
                    styles.movieCard,
                    { width: larguraCard },
                  ]}
                  key={filme.id}
                >
                  {filme.poster_path ? (
                    <Image
                      source={{
                        uri: IMAGES_URL + filme.poster_path,
                      }}
                      style={styles.poster}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.poster} />
                  )}
                <TouchableOpacity
  onPress={() => alternarFavorito(filme.id)}
  style={{
    backgroundColor: '#251A30',
    padding: 8,
    borderRadius: 20,
    alignSelf: 'flex-end',
    marginTop: 8,
  }}
>
  <Text style={{ fontSize: 20 }}>
    {favoritos.includes(filme.id) ? '❤️' : '🤍'}
  </Text>
</TouchableOpacity>
<TouchableOpacity
  onPress={() => adicionarFilmeSelecionado(filme)}
  style={{
    backgroundColor: '#54236B',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  }}
>
  <Text style={{ color: '#FFFFFF', textAlign: 'center', fontSize: 12 }}>
    + Adicionar à lista
  </Text>
</TouchableOpacity>
<TouchableOpacity
  onPress={() => avaliarFilme(filme)}
  style={{
    backgroundColor: '#6B2D91',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  }}
>
  <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>
    ⭐ Avaliar filme
  </Text>
</TouchableOpacity>
                  <Text style={styles.movieName} numberOfLines={2}>
                    {filme.title}
                  </Text>

                  <Text style={styles.movieGenre}>
                    {generos[filme.genre_ids[0]] || 'Filme'}
                  </Text>

                  <Text style={styles.rating}>
                    ★ {filme.vote_average.toFixed(1)}
                  </Text>
                </View>
              ))}
            </View>
          )}
            </>
          )}
          {aba === 'listas' && (
            <>
{/* MINHAS LISTAS */}
<View style={{ marginTop: 30, marginBottom: 25 }}>
  <Text style={{
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  }}>
    Minhas Listas
  </Text>

  <TextInput
    placeholder="Nome da nova lista..."
    placeholderTextColor="#999"
    value={novaLista}
    onChangeText={setNovaLista}
    style={{
      backgroundColor: '#251A30',
      color: '#FFFFFF',
      padding: 14,
      borderRadius: 10,
      marginBottom: 10,
    }}
  />

  <TouchableOpacity
onPress={criarNovaLista}
    style={{
      backgroundColor: '#8A2BE2',
      padding: 13,
      borderRadius: 10,
      marginBottom: 15,
    }}
  >
    <Text style={{
      color: '#FFFFFF',
      textAlign: 'center',
      fontWeight: 'bold',
    }}>
      + Criar lista
    </Text>
  </TouchableOpacity>

  {listas.map((lista) => (
  <View
    key={lista.id}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    }}
  >
    <TouchableOpacity
      onPress={() => setListaSelecionada(lista.id)}
      style={{
        backgroundColor: listaSelecionada === lista.id
          ? '#8A2BE2'
          : '#251A30',
        padding: 14,
        borderRadius: 10,
        flex: 1,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 15 }}>
        {lista.nome}
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() => editarLista(lista)}
      style={{
        backgroundColor: '#54236B',
        padding: 14,
        borderRadius: 10,
      }}
    >
      <Text style={{ color: '#FFFFFF' }}>✏️</Text>
    </TouchableOpacity>
    <TouchableOpacity
  onPress={() => excluirListaDaTela(lista.id)}
  style={{
    backgroundColor: '#8B2635',
    padding: 14,
    borderRadius: 10,
  }}
>
  <Text style={{ color: '#FFFFFF' }}>🗑️</Text>
</TouchableOpacity>
  </View>
))}
</View>
{listaSelecionada !== null && (
  <View style={{ marginBottom: 25 }}>
    <Text style={{
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
    }}>
      Filmes da lista selecionada
    </Text>

    {filmesDaLista.length === 0 ? (
      <Text style={{ color: '#999' }}>
        Nenhum filme adicionado a esta lista ainda.
      </Text>
    ) : (
      filmesDaLista.map((filme) => (
        <View
          key={filme.id}
          style={{
            backgroundColor: '#251A30',
            padding: 12,
            borderRadius: 10,
            marginBottom: 8,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 15 }}>
            {filme.titulo}
          </Text>
          <TouchableOpacity
  onPress={() => excluirFilmeDaLista(listaSelecionada!, filme.filme_id)}
  style={{
    backgroundColor: '#8B2635',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  }}
>
  <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>
    Remover filme
  </Text>
</TouchableOpacity>
        </View>
        
      ))
    )}
  </View>
)}
            </>
          )}
          {aba === 'favoritos' && (
            <>
{/* MEUS FAVORITOS */}
<View style={{ marginTop: 30, marginBottom: 25 }}>
  <Text style={{
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  }}>
    ❤️ Meus Favoritos
  </Text>

  {filmesFavoritosSalvos.length === 0 ? (
    <Text style={{ color: '#999' }}>
      Você ainda não tem filmes favoritos.
    </Text>
  ) : (
    filmesFavoritosSalvos.map((filme) => (
      <View
        key={filme.filme_id}
        style={{
          backgroundColor: '#251A30',
          padding: 12,
          borderRadius: 10,
          marginBottom: 12,
        }}
      >
        <Text style={{
          color: '#FFFFFF',
          fontSize: 17,
          fontWeight: 'bold',
        }}>
          {filme.titulo}
        </Text>

        <Text style={{ color: '#FFD700', marginTop: 5 }}>
          ★ {filme.nota?.toFixed(1)}
        </Text>

        <TextInput
          placeholder="Escreva uma observação sobre o filme..."
          placeholderTextColor="#999"
          value={observacoes[filme.filme_id] || ''}
          onChangeText={(texto) => {
            setObservacoes((atuais) => ({
              ...atuais,
              [filme.filme_id]: texto,
            }));
          }}
          onBlur={async () => {
            try {
              await atualizarObservacao(
                filme.filme_id,
                observacoes[filme.filme_id] || ''
              );

              sincronizarDados().catch((error) => {
                console.log('Sincronização pendente:', error);
              });
            } catch (error) {
              console.error('Erro ao salvar observação:', error);
              alert('Não foi possível salvar a observação.');
            }
          }}
          style={{
            backgroundColor: '#382442',
            color: '#FFFFFF',
            padding: 10,
            borderRadius: 8,
            marginTop: 10,
          }}
        />
        <TouchableOpacity
  onPress={() => alternarFavorito(filme.filme_id)}
  style={{
    backgroundColor: '#6B1D40',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  }}
>
  <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>
    Remover dos favoritos
  </Text>
</TouchableOpacity>
      </View>
    ))
  )}
</View>
            </>
          )}
          {aba === 'avaliacoes' && (
            <>
{/* AVALIAÇÕES */}
<View style={{ marginTop: 30, marginBottom: 25 }}>
  <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 15 }}>
    ⭐ Minhas Avaliações
  </Text>

  {avaliacoes.length === 0 ? (
    <Text style={{ color: '#999' }}>Nenhuma avaliação ainda.</Text>
  ) : (
    avaliacoes.map((item) => (
      <View key={item.id} style={{ backgroundColor: '#251A30', padding: 12, borderRadius: 10, marginBottom: 10 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 }}>
          {item.titulo}
        </Text>
        <Text style={{ color: '#FFD700', marginTop: 5 }}>
          Nota: {item.nota}/10
        </Text>
        <Text style={{ color: '#FFFFFF', marginTop: 5 }}>
          {item.comentario}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 10, gap: 10 }}>
  <TouchableOpacity
    onPress={() => editarAvaliacao(item)}
    style={{ backgroundColor: '#6B2D91', padding: 8, borderRadius: 8 }}
  >
    <Text style={{ color: '#FFFFFF' }}>Editar</Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() => removerAvaliacao(item.id)}
    style={{ backgroundColor: '#8B1E3F', padding: 8, borderRadius: 8 }}
  >
    <Text style={{ color: '#FFFFFF' }}>Excluir</Text>
  </TouchableOpacity>
</View>
      </View>
    ))
  )}
</View>
                      </>
          )}
{/* RODAPÉ */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              CineMatch © 2026
            </Text>

            <Text style={styles.footerText}>
              Feito para amantes de cinema 💜
            </Text>

            <Text style={styles.footerText}>
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Tela de autenticação: cartão central, campos claros e feedback de validação.
  loginScroll: { flexGrow: 1, backgroundColor: '#0B0712' },
  loginContainer: { flex: 1, minHeight: 700, backgroundColor: '#0B0712', justifyContent: 'center', alignItems: 'center', padding: 22, overflow: 'hidden' },
  loginGlow: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: '#35134D', opacity: 0.35, top: -120, right: -120 },
  loginCard: { width: '100%', maxWidth: 460, backgroundColor: '#171020', borderColor: '#382448', borderWidth: 1, borderRadius: 24, padding: 28, shadowColor: '#D65AFF', shadowOpacity: 0.18, shadowRadius: 24, elevation: 10 },
  loginLogoImage: { width: 104, height: 104, alignSelf: 'center', marginBottom: 10, borderRadius: 22 },
  loginTitle: { color: '#FFFFFF', fontSize: 34, fontWeight: 'bold', textAlign: 'center' },
  loginSubtitle: { color: '#D65AFF', textAlign: 'center', letterSpacing: 3, marginTop: 8, marginBottom: 28, fontSize: 10 },
  loginWelcome: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  loginDescription: { color: '#A99CAF', fontSize: 13, marginBottom: 22 },
  fieldLabel: { color: '#D9C5E5', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, marginTop: 12, marginBottom: 7 },
  loginInput: { backgroundColor: '#241A30', color: '#FFFFFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#493258', fontSize: 14 },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#241A30', borderRadius: 12, borderWidth: 1, borderColor: '#493258' },
  passwordInput: { flex: 1, color: '#FFFFFF', padding: 15, fontSize: 14 },
  showPasswordButton: { paddingHorizontal: 14, paddingVertical: 12 },
  showPasswordText: { color: '#D65AFF', fontSize: 12, fontWeight: 'bold' },
  fieldFeedback: { color: '#F0B45B', fontSize: 11, marginTop: 6 },
  passwordRules: { backgroundColor: '#21172B', borderRadius: 12, padding: 13, marginTop: 12, borderWidth: 1, borderColor: '#392747' },
  rulesTitle: { color: '#DCCBE5', fontSize: 12, fontWeight: 'bold', marginBottom: 7 },
  ruleItem: { color: '#9D91A8', fontSize: 11, marginTop: 4 },
  ruleValid: { color: '#83D9A2' },
  loginHint: { color: '#A99CAF', fontSize: 12, marginTop: 8, marginBottom: 4 },
  loginError: { color: '#FFB1BD', backgroundColor: '#3A1828', borderWidth: 1, borderColor: '#71334A', padding: 12, borderRadius: 10, marginTop: 13, fontSize: 12 },
  loginButton: { backgroundColor: '#963CC0', padding: 16, borderRadius: 12, marginTop: 20, minHeight: 52, justifyContent: 'center', shadowColor: '#C44DFF', shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 },
  buttonDisabled: { opacity: 0.65 },
  loginButtonText: { color: '#FFFFFF', textAlign: 'center', fontWeight: 'bold', letterSpacing: 1 },
  loginSwitchButton: { marginTop: 20, padding: 8 },
  loginSwitch: { color: '#E3B5F7', textAlign: 'center', fontSize: 13 },
  loginFooter: { color: '#74647F', fontSize: 9, letterSpacing: 2, marginTop: 22 },
  topBar: { marginTop: 24, marginBottom: 25, flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: 14, backgroundColor: '#15101D', borderRadius: 18, borderWidth: 1, borderColor: '#2D2039' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandLogoImage: { width: 44, height: 44, borderRadius: 10 },
  brandIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#8B3DAD', alignItems: 'center', justifyContent: 'center' },
  brandIconText: { color: '#FFFFFF', fontSize: 17 },
  tabs: { alignItems: 'center', gap: 6 },
  tab: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 11, backgroundColor: '#211B2B', borderWidth: 1, borderColor: '#30233C' },
  tabAtiva: { backgroundColor: '#71349A', borderColor: '#B65BE0' },
  tabTexto: { color: '#B9AFC1', fontSize: 13 },
  tabTextoAtivo: { color: '#FFFFFF', fontWeight: 'bold' },
  logoutButton: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#382442' },
  logoutText: { color: '#FFFFFF', fontSize: 12 },
  container: {
    flex: 1,
    backgroundColor: '#0B0911',
  },

  content: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    paddingHorizontal: 30,
    paddingBottom: 20,
  },

  header: {
    marginTop: 35,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
  },

  logoPink: {
    color: '#D65AFF',
  },

  profile: {
    color: '#D65AFF',
    fontSize: 28,
  },

  subtitle: {
    color: '#D65AFF',
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 45,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 12,
    lineHeight: 45,
  },

  highlight: {
    color: '#D65AFF',
  },

  search: {
    backgroundColor: '#211B2B',
    color: '#FFFFFF',
    borderRadius: 13,
    padding: 17,
    marginTop: 25,
    fontSize: 15,
    maxWidth: 650,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 38,
    marginBottom: 18,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: 'bold',
  },

  seeAll: {
    color: '#D65AFF',
    fontSize: 13,
  },

  featured: {
    minHeight: 280,
    justifyContent: 'flex-end',
    backgroundColor: '#29163B',
    borderRadius: 18,
    overflow: 'hidden',
  },

  featuredImage: {
    borderRadius: 18,
  },

  featuredOverlay: {
    backgroundColor: 'rgba(11, 9, 17, 0.78)',
    padding: 25,
    borderRadius: 18,
  },

  featuredTag: {
    color: '#E48AFF',
    fontSize: 11,
    letterSpacing: 2,
  },

  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: 'bold',
    marginTop: 12,
  },

  featuredDescription: {
    color: '#D4C9DC',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },

  featuredRating: {
    color: '#F4C95D',
    fontSize: 15,
    marginTop: 12,
  },

  movieList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  movieCard: {
    marginBottom: 28,
    padding: 9,
    backgroundColor: '#17121F',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#30233C',
  },

  poster: {
    width: '100%',
    height: 260,
    backgroundColor: '#261B35',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#493258',
  },

  movieName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 10,
  },

  movieGenre: {
    color: '#A99CAF',
    fontSize: 12,
    marginTop: 5,
  },

  rating: {
    color: '#F4C95D',
    fontSize: 13,
    marginTop: 7,
  },

  error: {
    color: '#FF8A9B',
    fontSize: 14,
    marginVertical: 30,
  },

  footer: {
    alignItems: 'center',
    marginBottom: 30,
  },

  footerText: {
    color: '#756A7D',
    fontSize: 11,
    marginTop: 7,
    textAlign: 'center',
  },
});
