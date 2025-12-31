
import React, { useState } from 'react';
import { AuthView, User } from '../types';
import { storage } from '../services/storage';
import { AVATAR_COLORS, INITIAL_XP_TARGET } from '../constants';

interface AuthProps {
  onLoginSuccess: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<AuthView>(AuthView.LOGIN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const users = await storage.getUsers();

      if (view === AuthView.REGISTER) {
        if (users.find(u => u.email === email)) {
          throw new Error('E-mail já cadastrado.');
        }

        const newUser: User = {
          id: Math.random().toString(36).substring(2, 6).toUpperCase(),
          name,
          email,
          role: email.toLowerCase().includes('admin') ? 'gestor' : 'aluno',
          nivel: 1,
          xp: 0,
          xpProximoNivel: INITIAL_XP_TARGET,
          pontosTotais: 100,
          badges: ['Pioneiro EJN'],
          dataCriacao: new Date().toISOString(),
          avatarCor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          postsCount: 0,
          likesReceived: 0,
          commentsCount: 0,
          streak: 1,
          followersCount: 0,
          followingCount: 0,
          followingIds: [],
          status: 'active'
        };

        await storage.saveUser(newUser);
        onLoginSuccess(newUser);
      } else {
        const user = users.find(u => u.email === email);
        // Em um app real, verificaríamos senha. Aqui estamos simulando com o email.
        if (!user) throw new Error('Usuário não encontrado.');
        if (user.status === 'suspended') throw new Error('Esta conta está suspensa por moderação.');
        
        // Correções defensivas
        if (!user.followingIds) user.followingIds = [];
        if (!user.role) user.role = 'aluno';
        
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-apple-bg font-sans overflow-hidden">
      <div className="w-full max-w-[400px] animate-fadeIn">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-apple-text">Rede Social EJN</h1>
          <p className="text-apple-secondary mt-3 font-semibold text-sm">Painel do Aluno & Gestão</p>
        </div>

        <div className="bg-white rounded-[32px] p-10 apple-shadow">
          <h2 className="text-2xl font-bold text-apple-text mb-8 text-center">
            {view === AuthView.LOGIN ? 'Acesse' : 'Cadastre-se'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {view === AuthView.REGISTER && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-apple-secondary uppercase tracking-widest ml-1">Nome</label>
                <input
                  type="text"
                  required
                  className="w-full h-12 px-5 bg-apple-bg border border-apple-border rounded-xl focus:ring-0 focus:outline-none font-medium text-sm"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-apple-secondary uppercase tracking-widest ml-1">E-mail</label>
              <input
                type="email"
                required
                className="w-full h-12 px-5 bg-apple-bg border border-apple-border rounded-xl focus:ring-0 focus:outline-none font-medium text-sm"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-apple-secondary uppercase tracking-widest ml-1">Senha</label>
              <input
                type="password"
                required
                className="w-full h-12 px-5 bg-apple-bg border border-apple-border rounded-xl focus:ring-0 focus:outline-none font-medium text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-red-500 text-xs font-bold bg-red-50 p-4 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-ejn-gold text-ejn-dark font-bold rounded-full shadow-lg hover:shadow-ejn-gold/20 hover:scale-[1.02] active:scale-95 apple-transition disabled:opacity-50 disabled:scale-100 uppercase tracking-widest text-xs"
            >
              {loading ? 'Processando...' : (view === AuthView.LOGIN ? 'Entrar' : 'Começar Agora')}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button
              onClick={() => {
                setView(view === AuthView.LOGIN ? AuthView.REGISTER : AuthView.LOGIN);
                setError('');
              }}
              className="text-xs font-bold text-ejn-medium hover:text-ejn-dark transition-colors uppercase tracking-widest"
            >
              {view === AuthView.LOGIN ? 'Criar nova conta' : 'Já possuo cadastro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
