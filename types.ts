
export interface Comment {
  id: string;
  userName: string;
  avatarUrl?: string;
  avatarCor: string;
  text: string;
  timestamp: string;
  userId: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  avatarCor?: string;
  content: string;
  timestamp: string;
  likes: number;
  likedByMe?: boolean;
  imageUrl?: string;
  comments: Comment[];
  isPinned?: boolean;
  status?: 'published' | 'hidden' | 'reported';
}

export interface Notification {
  id: string;
  type: 'LIKE' | 'COMMENT' | 'XP' | 'MISSION';
  title: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'aluno' | 'gestor';
  nivel: number;
  xp: number;
  xpProximoNivel: number;
  pontosTotais: number;
  badges: string[];
  dataCriacao: string;
  avatarCor: string;
  bio?: string;
  location?: string;
  website?: string;
  avatarUrl?: string;
  coverUrl?: string;
  postsCount: number;
  likesReceived: number;
  commentsCount: number;
  streak: number;
  followersCount: number;
  followingCount: number;
  followingIds: string[];
  status?: 'active' | 'suspended';
}

export interface Mission {
  id: string;
  title: string;
  desc: string;
  rewardXP: number;
  rewardCoins: number;
  icon: string;
  type: 'daily' | 'achievement' | 'special';
  isActive: boolean;
}

export interface RewardItem {
  id: string;
  title: string;
  cost: number;
  desc: string;
  longDesc: string;
  icon: string;
  imageUrl: string;
  stock: number;
  category: 'Mentoria' | 'Badge' | 'Evento' | 'Produto';
}

export interface AppSettings {
  platformName: string;
  xpPerPost: number;
  xpPerComment: number;
  xpPerLikeReceived: number;
  coinsPerPost: number;
}

export interface TrendingTopic {
  tag: string;
  count: number;
}

export enum AuthView {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER'
}

export type AppView = 'FEED' | 'PROFILE' | 'RANKING' | 'MISSIONS' | 'ADMIN';
export type AdminSubView = 'DASHBOARD' | 'USERS' | 'POSTS' | 'MISSIONS_MGMT' | 'REWARDS_MGMT' | 'SETTINGS';
