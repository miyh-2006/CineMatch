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
} from 'react-native';

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

const API_URL = 'http://localhost:3001/api/filmes/populares';

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

  const filmesFiltrados = filmes.filter((filme) =>
    filme.title.toLowerCase().includes(busca.toLowerCase())
  );

  const destaque = filmes[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

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