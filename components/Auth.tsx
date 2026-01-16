import React, { useState, useEffect } from 'react';
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
  const [missingConfig, setMissingConfig] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Verifica as chaves ao montar o componente
  useEffect(() => {
    const env = (import.meta as any).env;
    const url = env.VITE_SUPABASE_URL;
    const key = env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key || url.includes('seu-projeto') || url.includes('placeholder')) {
      setMissingConfig(true);
    }
  }, []);

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
           // Pequeno delay para dar tempo ao Trigger do banco
           await new Promise(r => setTimeout(r, 1000));
           
           let user = await storage.getCurrentUser();

           // Se o Trigger falhou, tenta criar manualmente
           if (!user) {
              console.log("Perfil não encontrado automaticamente. Tentando criação manual...");
              try {
                  await storage.createProfile(data.user.id, email, name, role, avatarCor);
                  user = await storage.getCurrentUser();
              } catch (manualCreateError) {
                  console.error("Falha ao criar perfil manual:", manualCreateError);
              }
           }
           
           if(user) {
               onLoginSuccess(user);
           } else {
               alert('Cadastro realizado! Por favor, faça login.');
               setView(AuthView.LOGIN);
           }
        } else {
            alert('Verifique seu e-mail para confirmar a conta.');
            setView(AuthView.LOGIN);
        }

      } else {
        // Login Normal
        const { error } = await storage.signIn(email, password);
        if (error) {
             if (error.message.includes("Failed to fetch")) {
                 setMissingConfig(true); // Ativa a tela de ajuda se falhar conexão
                 throw new Error("Falha na conexão. Verifique suas credenciais.");
             }
             throw new Error('E-mail ou senha incorretos.');
        }
        
        // Delay minúsculo para garantir propagação da sessão
        await new Promise(r => setTimeout(r, 100));

        const user = await storage.getCurrentUser();
        
        if (!user) {
             // Tenta buscar mais uma vez forçando refresh
             const retryUser = await storage.getCurrentUser(false);
             if (retryUser) {
                 onLoginSuccess(retryUser);
                 return;
             }
             throw new Error('Perfil de usuário não encontrado. Se você acabou de criar a conta, aguarde alguns instantes.');
        }
        
        if (user.status === 'suspended') throw new Error('Esta conta está suspensa.');
        
        onLoginSuccess(user);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Ocorreu um erro inesperado.';
      // Traduz erros comuns do Supabase
      if (msg.includes('Invalid login credentials')) setError('E-mail ou senha incorretos.');
      else if (msg.includes('Failed to fetch')) setError('Erro de conexão com o banco de dados.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (missingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-apple-bg font-sans">
        <div className="w-full max-w-lg bg-white rounded-[32px] p-10 apple-shadow border-l-8 border-ejn-gold animate-fadeIn">
          <h2 className="text-2xl font-black text-ejn-dark mb-4">Configuração Necessária ⚠️</h2>
          <p className="text-apple-text text-sm mb-6 leading-relaxed">
            O aplicativo não conseguiu conectar ao Supabase. Isso acontece porque o arquivo <code className="bg-gray-100 px-2 py-1 rounded text-red-500 font-mono">.env.local</code> ainda contém os valores de exemplo.
          </p>
          
          <div className="bg-apple-bg rounded-2xl p-6 mb-8 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-apple-secondary">Como resolver:</h3>
            <ol className="list-decimal list-inside text-sm space-y-3 font-medium text-apple-text">
              <li>Crie um projeto em <a href="https://supabase.com" target="_blank" className="text-ejn-medium underline hover:text-ejn-dark">supabase.com</a></li>
              <li>Vá em <strong>Project Settings &gt; API</strong></li>
              <li>Copie a <strong>URL</strong> e a <strong>anon key</strong></li>
              <li>Abra o arquivo <code className="font-mono text-xs bg-white px-1 py-0.5 rounded border border-gray-200">.env.local</code> no seu editor</li>
              <li>Substitua os valores de exemplo pelos reais</li>
              <li>Reinicie o servidor (<code className="font-mono text-xs bg-white px-1 py-0.5 rounded border border-gray-200">Ctrl+C</code> e <code className="font-mono text-xs bg-white px-1 py-0.5 rounded border border-gray-200">npm run dev</code>)</li>
            </ol>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-ejn-dark text-white rounded-xl font-bold uppercase tracking-widest hover:bg-ejn-medium apple-transition"
          >
            Já configurei, recarregar página
          </button>
        </div>
      </div>
    );
  }

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
              <div className="text-red-500 text-xs font-bold bg-red-50 p-4 rounded-xl border border-red-100 animate-fadeIn leading-relaxed">
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