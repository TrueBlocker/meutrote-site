/* Tipos do servidor (mesmos do app: Projeto-app-Trote/src/types/api.ts). */

export type Role = 'USER' | 'ADMIN' | 'BIKE_OPERATOR';

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UserSummaryDto {
  id: number;
  username: string;
  role: Role;
  blocked: boolean;
  blockedReason: string | null;
  createdAt: string | null;
}

export type FeedbackType = 'SUGESTAO' | 'CRITICA' | 'ELOGIO' | 'PROBLEMA';
export type FeedbackStatus = 'RECEBIDA' | 'EM_ANALISE' | 'ENCAMINHADA' | 'RESOLVIDA' | 'NAO_PROCEDE';
export type FeedbackTopic = 'GERAL' | 'BIKES';

export interface FeedbackDto {
  id: number;
  content: string;
  type: FeedbackType;
  createdAt: string;
  user: { id: number; username: string; role: Role };
  status: FeedbackStatus;
  adminResponse: string | null;
  respondedAt: string | null;
  supportCount: number;
  hidden: boolean;
  topic?: FeedbackTopic;
}

export interface ModerateFeedbackRequest {
  status?: FeedbackStatus;
  adminResponse?: string;
  hidden?: boolean;
  topic?: FeedbackTopic;
}

export type ReportReason = 'OFENSIVO' | 'FALSO' | 'PESSOAL' | 'SPAM' | 'OUTRO';

export interface ReportedItem {
  feedback: FeedbackDto;
  reports: number;
  reasons: ReportReason[];
  details: string[];
  lastReportAt: string;
}

export interface StatsDto {
  from: string;
  to: string;
  people: { total: number; newInPeriod: number; activeInPeriod: number; blocked: number };
  activity: {
    workouts: number;
    activePeople: number;
    totalKm: number;
    totalHours: number;
    whoMinutes: number;
    goalPeople: number;
    bySport: Record<string, number>;
    byWeekday: number[];
    byHour: number[];
  };
  ombudsman: {
    posts: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    answered: number;
    avgFirstResponseHours: number | null;
    resolved: number;
    supports: number;
    top: { id: number; type: string; status: string; content: string; supports: number; adminResponse: string | null }[];
  };
  events: { count: number; going: number; list: { id: number; title: string; startsAt: string; cancelled: boolean; going: number }[] };
  engagement: { leaguePlayers: number; achievements: number; surveys: number; surveyAnswers: number };
  daily: { date: string; workouts: number; activePeople: number; newUsers: number; posts: number; km: number }[];
}

export type ExportFile = 'report.pdf' | 'mural.csv' | 'numeros.csv';

export interface ParkEventDto {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  cancelled: boolean;
  goingCount: number;
  media: { kind: 'IMAGE' | 'VIDEO'; displayUrl: string }[];
}

export interface UpsertEventRequest {
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt?: string | null;
  cancelled?: boolean;
}

export interface DayHoursDto {
  diaSemana: number;
  nome: string;
  fechado: boolean;
  abre: string | null;
  fecha: string | null;
}

export type BikeAvailability = 'TEM_BIKES' | 'SEM_BIKES';
export type OverrideType = 'ABERTO' | 'FECHADO';

export interface ParkOperationsDto {
  horarios: DayHoursDto[];
  horariosAluguel: DayHoursDto[];
  horariosProvisorios: boolean;
  abertoAgora: boolean;
  aluguelAberto: boolean;
  fechaAs: string | null;
  abreAs: string | null;
  abreDia: string | null;
  bikes: { disponibilidade: BikeAvailability; observacao: string | null; atualizadoEm: string | null; atualizadoHaMin: number | null } | null;
  textoCombinado: string;
  aviso: { texto: string; atualizadoEm: string | null } | null;
  painel: {
    funcionamentoPrevisto: 'ABERTO' | 'FECHADO';
    excecao: { tipo: OverrideType; ate: string; definidaPor: string | null; definidaEm: string | null } | null;
    disponibilidade: { valor: BikeAvailability; observacao: string | null; definidaPor: string | null; definidaEm: string | null };
  } | null;
}

export interface DayHoursRequest {
  diaSemana: number;
  fechado: boolean;
  abre: string | null;
  fecha: string | null;
}

/* ── painel web ─────────────────────────────────────────────── */

export type SecondFactor = 'PASSKEY' | 'TOTP';

export interface WebTokens {
  username: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionExpiresAt?: string;
}

export interface WebMe {
  id: number;
  username: string;
  role: Role;
  totpEnabled: boolean;
  passkeys: number;
  viaPainel: boolean;
}

export interface Passkey {
  id: number;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface WebSession {
  id: string;
  method: SecondFactor;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

export interface AuditEntry {
  id: number;
  username: string | null;
  origin: 'APP' | 'WEB';
  action: string;
  path: string;
  status: number;
  ip: string | null;
  at: string;
}
