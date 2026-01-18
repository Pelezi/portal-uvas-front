'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaWhatsapp, FaInstagram, FaMapMarkerAlt, FaPhone, FaFacebook, FaYoutube } from 'react-icons/fa';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-teal-400 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold text-gray-800">Videira</h1>
              <p className="text-xs text-gray-600">Igreja de Cristo</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="#sobre" className="text-gray-700 hover:text-purple-600 transition">Sobre</Link>
            <Link href="#portais" className="text-gray-700 hover:text-purple-600 transition">Portais</Link>
            <Link href="#eventos" className="text-gray-700 hover:text-purple-600 transition">Eventos</Link>
            <Link href="#membros" className="text-gray-700 hover:text-purple-600 transition">Área de Membros</Link>
            <Link href="#blog" className="text-gray-700 hover:text-purple-600 transition">Blog</Link>
            <Link href="#ofertas" className="text-gray-700 hover:text-purple-600 transition">Oferta Online</Link>
          </nav>

          <Link href="/auth/login" className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition" target="_blank" rel="noopener noreferrer">
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-500 to-teal-400 opacity-90"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center justify-center min-h-[500px] text-center text-white">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold text-3xl">V</span>
              </div>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-4">
              Bem-Vindo a Igreja Videira
            </h2>
            <p className="text-xl md:text-2xl mb-12 opacity-90">
              Uma igreja de Vencedores
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <button className="bg-purple-600 text-white px-8 py-3 rounded-full hover:bg-purple-700 transition shadow-lg">
                Encontre uma Célula 🔍
              </button>
              <button className="bg-pink-600 text-white px-8 py-3 rounded-full hover:bg-pink-700 transition shadow-lg">
                Encontro com Deus 💝
              </button>
              <button className="bg-teal-600 text-white px-8 py-3 rounded-full hover:bg-teal-700 transition shadow-lg">
                Área de Membros 👤
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Nossa Visão */}
      <section id="sobre" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-center text-purple-600 mb-8">
            Nossa Visão
          </h3>
          <p className="text-center text-gray-700 max-w-3xl mx-auto text-lg leading-relaxed">
            Nosso anseio é edificar uma igreja de vencedores onde cada membro é um sacerdote e 
            cada casa uma extensão da igreja, conquistando assim a nossa geração para Cristo através 
            das células que se multiplicam.
          </p>
        </div>
      </section>

      {/* Endereços */}
      <section id="enderecos" className="py-20 bg-gradient-to-r from-purple-600 to-purple-800 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg">
              <h3 className="text-3xl font-bold mb-6">Endereços</h3>
              <p className="text-lg mb-2">Conheça nossa igreja em Caruaru</p>
              
              <div className="mt-8 bg-purple-700 p-6 rounded-lg">
                <h4 className="text-2xl font-bold mb-4">Videira Bueno</h4>
                <p className="mb-2">Av. 12º Alagoas 320, Bueno Cardoso - CEP 55016-280</p>
                <p className="mb-6">Cultos: Domingo às 10:00 e às 19:00</p>
                
                <div className="flex gap-4">
                  <a href="#" className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition">
                    <FaMapMarkerAlt className="text-xl" />
                  </a>
                  <a href="https://wa.me/5581999999999" className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition">
                    <FaWhatsapp className="text-xl" />
                  </a>
                  <a href="#" className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center hover:bg-pink-600 transition">
                    <FaInstagram className="text-xl" />
                  </a>
                </div>
                
                <p className="mt-6 text-sm opacity-80">
                  Clique para ser direcionado
                </p>
              </div>
            </div>

            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <FaMapMarkerAlt className="text-6xl mb-4 mx-auto text-red-500" />
                <p className="text-lg">Mapa Interativo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Equipe Pastoral */}
      <section id="equipe" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-center text-purple-600 mb-4">
            Equipe Pastoral
          </h3>
          <p className="text-center text-gray-600 mb-12">Líderes</p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="w-48 h-48 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-teal-400">
                  <div className="w-full h-full flex items-center justify-center text-white text-6xl">
                    👤
                  </div>
                </div>
                <h4 className="text-xl font-bold text-gray-800">Pastor {i}</h4>
                <p className="text-gray-600">Líder</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dízimos e Ofertas */}
      <section id="ofertas" className="py-20 bg-gradient-to-r from-teal-400 to-green-500">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div className="text-white">
              <h3 className="text-4xl font-bold mb-6">Dízimos e Ofertas</h3>
              <p className="text-lg mb-4">
                Uma vida de entrega, seja dízimos e ofertas através das nossas digitais.
              </p>
              <p className="text-lg mb-8">Obrigado!</p>
              <button className="bg-white text-teal-600 px-8 py-3 rounded-full hover:bg-gray-100 transition font-bold">
                Saiba Mais
              </button>
            </div>

            <div className="bg-white p-8 rounded-lg text-center">
              <div className="w-48 h-48 mx-auto mb-4 bg-gray-200 flex items-center justify-center">
                <div className="text-6xl">📱</div>
              </div>
              <p className="text-gray-700 font-bold">Escaneie o QRCode para</p>
              <p className="text-gray-700">acessar o PIX</p>
            </div>
          </div>
        </div>
      </section>

      {/* Blog da Videira */}
      <section id="blog" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-center text-purple-600 mb-4">
            Blog da Videira
          </h3>
          <p className="text-center text-gray-600 mb-12">
            Fique por Dentro de todas a Notícias e Receba Dicas que vão edificar sua vida
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { title: 'A perfeita restituição', category: 'Palavra da Célula' },
              { title: 'O Esboço do Descanso', category: 'Palavra da Célula' },
              { title: 'Quatro pilares da igreja', category: 'Palavra da Célula' }
            ].map((post, i) => (
              <div key={i} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition">
                <div className="h-48 bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center">
                  <span className="text-white text-6xl">📖</span>
                </div>
                <div className="p-6">
                  <p className="text-sm text-purple-600 mb-2">{post.category}</p>
                  <h4 className="text-xl font-bold text-gray-800 mb-4">{post.title}</h4>
                  <p className="text-gray-600 text-sm">
                    Palavras de fé e inspiração para sua vida...
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h5 className="font-bold mb-4">Portais</h5>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-purple-400 transition">Escola de Grape</Link></li>
                <li><Link href="#" className="hover:text-purple-400 transition">Transparência</Link></li>
                <li><Link href="#" className="hover:text-purple-400 transition">Videira Fit</Link></li>
                <li><Link href="#" className="hover:text-purple-400 transition">Comunidade</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold mb-4">Institucional</h5>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-purple-400 transition">Home</Link></li>
                <li><Link href="#" className="hover:text-purple-400 transition">Sobre a Videira</Link></li>
                <li><Link href="#" className="hover:text-purple-400 transition">Visão Pastoral</Link></li>
                <li><Link href="#" className="hover:text-purple-400 transition">Lideres</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold mb-4">Contribua</h5>
              <div className="bg-white p-4 rounded-lg text-center">
                <div className="w-32 h-32 mx-auto bg-gray-200 mb-2 flex items-center justify-center">
                  <span className="text-4xl">📱</span>
                </div>
                <p className="text-gray-800 text-xs">Escaneie o QRCode do nosso PIX</p>
              </div>
            </div>

            <div>
              <h5 className="font-bold mb-4">Redes Sociais</h5>
              <div className="flex gap-4 mb-6">
                <a href="#" className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-purple-600 transition">
                  <FaInstagram />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-purple-600 transition">
                  <FaFacebook />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-purple-600 transition">
                  <FaYoutube />
                </a>
              </div>
              <p className="text-sm text-gray-400">
                Igreja Videira<br />
                Uma igreja de vencedores
              </p>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>Todos os Direitos Reservados - Igreja Videira © 2026</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp Float Button */}
      <a 
        href="https://wa.me/5581999999999" 
        className="fixed bottom-6 right-6 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition z-50"
        target="_blank"
        rel="noopener noreferrer"
      >
        <FaWhatsapp className="text-white text-3xl" />
      </a>
    </div>
  );
}
