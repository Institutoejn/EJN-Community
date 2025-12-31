
import React, { useState } from 'react';
import { AuthView, User } from '../types';
import { storage } from '../services/storage';
import { AVATAR_COLORS } from '../constants';

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
      if (view === AuthView.REGISTER) {
        // Cadastro Supabase
        const avatarCor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
        const role = email.toLowerCase().includes('admin') ? 'gestor' : 'aluno';

        const { data, error } = await storage.signUp(email, password, {
            name: name,
            role: role,
            avatarCor: avatarCor
        });

        if (error) throw error;
        
        // Se o cadastro na Auth funcionou, verifica o perfil público
        if (data.user) {
           // Pequeno delay para dar tempo ao banco (se houver trigger)
           await new Promise(r => setTimeout(r, 1000));
           
           let user = await storage.getCurrentUser();

           // Se o usuário não foi encontrado (significa que não há Trigger no banco),
           // criamos o perfil manualmente agora para não travar o app.
           if (!user) {
              console.log("Perfil não encontrado automaticamente. Criando manualmente...");
              try {
                  await storage.createProfile(data.user.id, email, name, role, avatarCor);
                  // Tenta buscar novamente após criar
                  user = await storage.getCurrentUser();
              } catch (manualCreateError) {
                  console.error("Falha ao criar perfil manual:", manualCreateError);
              }
           }
           
           if(user) {
               onLoginSuccess(user);
           } else {
               // Fallback final: se mesmo assim falhar, pede login
               alert('Cadastro realizado com sucesso! Por favor, faça login.');
               setView(AuthView.LOGIN);
           }
        } else {
            // Caso exija confirmação de e-mail configurada no Supabase
            alert('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
            setView(AuthView.LOGIN);
        }

      } else {
        // Login Normal
        const { error } = await storage.signIn(email, password);
        if (error) throw new Error('E-mail ou senha incorretos.');
        
        const user = await storage.getCurrentUser();
        
        if (!user) {
             throw new Error('Perfil de usuário não encontrado. Entre em contato com o suporte.');
        }
        
        if (user.status === 'suspended') throw new Error('Esta conta está suspensa.');
        
        onLoginSuccess(user);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro inesperado.');
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
                minLength={6}
                className="w-full h-12 px-5 bg-apple-bg border border-apple-border rounded-xl focus:ring-0 focus:outline-none font-medium text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-red-500 text-xs font-bold bg-red-50 p-4 rounded-xl border border-red-100 animate-fadeIn">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-ejn-gold text-ejn-dark font-bold rounded-full shadow-lg hover:shadow-ejn-gold/20 hover:scale-[1.02] active:scale-95 apple-transition disabled:opacity-50 disabled:scale-100 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-ejn-dark border-t-transparent rounded-full animate-spin"></div>}
              {loading ? 'Processando...' : (view === AuthView.LOGIN ? 'Entrar' : 'Começar Agora')}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button
              onClick={() => {
                setView(view === AuthView.LOGIN ? AuthView.REGISTER : AuthView.LOGIN);
                setError('');
                setName('');
                setEmail('');
                setPassword('');
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
