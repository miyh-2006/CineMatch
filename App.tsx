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

  useEffect(() => {
  alert('O teste do banco começou!');
  conectarBanco()
    .then(() => alert('Banco SQLite conectado!'))
    .catch((error) => alert('Erro no SQLite: ' + String(error)));
}, []);
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    setUsuario(user);

    if (user) {
      try {
        await sincronizarAoEntrar();
        console.log('Dados sincronizados com sucesso!');
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
  function quandoInternetVoltar() {
    sincronizarDados();
  }

  window.addEventListener('online', quandoInternetVoltar);

  return () => {
    window.removeEventListener('online', quandoInternetVoltar);
  };
}, []);
async function criarNovaLista() {
  if (!novaLista.trim()) return;

  try {
    await criarLista(novaLista.trim());
    await sincronizarDados();
    const atualizadas = await listarListas();
    setListas(atualizadas);
    setNovaLista('');
  } catch (error) {
  alert('Erro ao salvar lista: ' + String(error));
}
}
async function editarLista(lista: { id: number; nome: string }) {
  const novoNome = window.prompt('Digite o novo nome da lista:', lista.nome);

  if (!novoNome || !novoNome.trim()) return;
async function excluirListaDaTela(listaId: number) {
  const confirmar = window.confirm(
    'Tem certeza que deseja excluir esta lista?'
  );

  if (!confirmar) return;

  try {
    await excluirListaBanco(listaId);

    const atualizadas = await listarListas();
    setListas(atualizadas);

    if (listaSelecionada === listaId) {
      setListaSelecionada(null);
      setFilmesDaLista([]);
    }

    alert('Lista excluída com sucesso!');
  } catch (error) {
    console.error('Erro ao excluir lista:', error);
    alert('Não foi possível excluir a lista.');
  }
}
  try {
    await renomearLista(lista.id, novoNome.trim());

    const atualizadas = await listarListas();
    setListas(atualizadas);

    alert('Lista renomeada com sucesso!');
  } catch (error) {
    console.error('Erro ao renomear lista:', error);
    alert('Não foi possível renomear a lista.');
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
    const dados = await listarAvaliacoes();
    setAvaliacoes(dados);
  }

  carregarAvaliacoes();
}, []);
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
    await sincronizarDados();
    const salvos = await listarFavoritos();

    setFilmesFavoritosSalvos(salvos);
    setFavoritos(salvos.map((filme) => filme.filme_id));

  } catch (error) {
    console.error('Erro ao atualizar favorito:', error);
    alert('Não foi possível atualizar os favoritos.');
  }
}
async function avaliarFilme(filme: Filme) {
  const nota = Number(window.prompt('Dê uma nota de 0 a 10:'));

  if (isNaN(nota) || nota < 0 || nota > 10) {
    alert('Digite uma nota válida!');
    return;
  }

  const comentario = window.prompt('Escreva um comentário:') || '';

  await salvarAvaliacao(filme.id, filme.title, nota, comentario);
  await sincronizarDados();
  const dados = await listarAvaliacoes();
  setAvaliacoes(dados);

  alert('Avaliação salva!');
}
async function acessarConta() {
  try {
    if (modoCadastro) {
      await cadastrar(email, senha);
      alert('Conta criada com sucesso!');
    } else {
      await login(email, senha);
      alert('Login realizado com sucesso!');
    }
  } catch (error: any) {
    alert('Erro: ' + error.message);
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

  await excluirAvaliacao(id);
  await sincronizarDados();
  setAvaliacoes(await listarAvaliacoes());

  alert('Avaliação excluída!');
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
    await sincronizarDados();
    const atualizados = await listarFilmesDaLista(listaSelecionada);
    setFilmesDaLista(atualizados);

    alert('Filme adicionado à lista!');
  } catch (error) {
    console.error('Erro ao adicionar filme à lista:', error);
    alert('Não foi possível adicionar o filme.');
  }
}

async function excluirFilmeDaLista(filmeId: number) {
  if (listaSelecionada === null) return;

  try {
    await removerFilmeDaLista(listaSelecionada, filmeId);
    await sincronizarDados();
    const atualizados = await listarFilmesDaLista(listaSelecionada);
    setFilmesDaLista(atualizados);

    alert('Filme removido da lista!');
  } catch (error) {
    console.error('Erro ao remover filme:', error);
    alert('Não foi possível remover o filme.');
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

    alert('Lista excluída!');
  } catch (error) {
    console.error(error);
    alert('Erro ao excluir lista.');
  }
}
const filmesFiltrados = filmes.filter((filme) =>
  filme.title.toLowerCase().includes(busca.toLowerCase())
);
 
  const destaque = filmes[0];

  if (!usuario) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: '#12091A',
      justifyContent: 'center',
      padding: 30,
    }}>
      <Text style={{
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
      }}>
        🎬 CineMatch
      </Text>

      <TextInput
        placeholder="E-mail"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          backgroundColor: '#251A30',
          color: '#FFFFFF',
          padding: 15,
          borderRadius: 10,
          marginBottom: 15,
        }}
      />

      <TextInput
        placeholder="Senha"
        placeholderTextColor="#999"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        style={{
          backgroundColor: '#251A30',
          color: '#FFFFFF',
          padding: 15,
          borderRadius: 10,
          marginBottom: 15,
        }}
      />

      <TouchableOpacity
        onPress={acessarConta}
        style={{
          backgroundColor: '#8B3DAD',
          padding: 15,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: 'bold' }}>
          {modoCadastro ? 'Criar conta' : 'Entrar'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setModoCadastro(!modoCadastro)}
        style={{ marginTop: 20 }}
      >
        <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>
          {modoCadastro ? 'Já tenho conta? Entrar' : 'Não tenho conta? Cadastrar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <TouchableOpacity
  onPress={sairDaConta}
  style={{
    backgroundColor: '#6B2D91',
    padding: 10,
    borderRadius: 8,
    alignSelf: 'flex-end',
    marginBottom: 15,
  }}
>
  <Text style={{ color: '#FFFFFF' }}>Sair da conta</Text>
</TouchableOpacity>

          {/* CABEÇALHO */}
          <View style={styles.header}>
            <Text style={styles.logo}>
              Cine<Text style={styles.logoPink}>Match</Text>
            </Text>

            <Text style={styles.profile}>●</Text>
          </View>

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
  onPress={() => excluirFilmeDaLista(filme.filme_id)}
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
          onBlur={() => {
            atualizarObservacao(
              filme.filme_id,
              observacoes[filme.filme_id] || ''
            );
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
          {/* ROLETA */}
          <View style={styles.roulette}>
            <Text style={styles.rouletteEmoji}>🎲</Text>

            <View style={{ flex: 1 }}>
              <Text style={styles.rouletteTitle}>
                Sem ideia do que assistir?
              </Text>

              <Text style={styles.rouletteText}>
                Deixe o CineMatch escolher por você!
              </Text>
            </View>

            <Text style={styles.arrow}>➜</Text>
          </View>

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
  },

  poster: {
    width: '100%',
    height: 260,
    backgroundColor: '#261B35',
    borderRadius: 13,
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

  roulette: {
    backgroundColor: '#24152F',
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 30,
  },

  rouletteEmoji: {
    fontSize: 35,
    marginRight: 15,
  },

  rouletteTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },

  rouletteText: {
    color: '#B9A8C3',
    fontSize: 12,
    marginTop: 5,
  },

  arrow: {
    color: '#D65AFF',
    fontSize: 25,
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