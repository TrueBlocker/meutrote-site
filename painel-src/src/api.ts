/*
 * Conversa com o servidor do MeuTrote.
 *
 * Segurança do lado do navegador:
 * - o token de acesso (15 min) fica só na memória;
 * - o de renovação fica no sessionStorage (some ao fechar a aba) e só vale enquanto a sessão estiver aberta no
 *   servidor (no máximo 8 h; 30 min parado e acaba);
 * - nada de cookies, nada de terceiros (a política de segurança da página só deixa falar com o servidor do app).
 */
import type {
  AuditEntry,
  DayHoursRequest,
  ExportFile,
  FeedbackDto,
  ModerateFeedbackRequest,
  OverrideType,
  PageResponse,
  ParkEventDto,
  ParkOperationsDto,
  Passkey,
  ReportedItem,
  Role,
  SecondFactor,
  StatsDto,
  UpsertEventRequest,
  UserSummaryDto,
  WebMe,
  WebSession,
  WebTokens,
} from './types';

export const SERVIDOR = 'https://meutrote-app-da-comunidade.onrender.com';
const API = SERVIDOR + '/api/v1';
const CHAVE_RENOVACAO = 'meutrote.painel.renovacao';

export class ErroApi extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

let acesso: string | null = null;
let aoSair: (() => void) | null = null;

/** Chamado quando a sessão acaba (expirou ou foi encerrada em outro lugar). */
export function quandoSessaoAcabar(fn: () => void): void {
  aoSair = fn;
}

function guardarRenovacao(t: string | null): void {
  try {
    if (t) sessionStorage.setItem(CHAVE_RENOVACAO, t);
    else sessionStorage.removeItem(CHAVE_RENOVACAO);
  } catch {
    // aba anônima sem armazenamento: a sessão vale até recarregar a página
  }
}

function lerRenovacao(): string | null {
  try {
    return sessionStorage.getItem(CHAVE_RENOVACAO);
  } catch {
    return null;
  }
}

function aplicar(t: WebTokens): void {
  acesso = t.accessToken;
  guardarRenovacao(t.refreshToken);
}

async function bruto(caminho: string, init: RequestInit = {}, comToken = true): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (comToken && acesso) headers.set('Authorization', 'Bearer ' + acesso);
  try {
    return await fetch(API + caminho, { ...init, headers, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
  } catch {
    throw new ErroApi('Sem conexão com o servidor. Ele pode estar acordando: espere uns segundos e tente de novo.', 0);
  }
}

async function erroDe(r: Response): Promise<ErroApi> {
  let msg = `Erro ${r.status}.`;
  try {
    const p = await r.json();
    if (p && typeof p.detail === 'string') msg = p.detail;
    if (p && Array.isArray(p.errors) && p.errors.length) msg = p.errors.map((e: { message: string }) => e.message).join(' ');
  } catch {
    // sem corpo
  }
  if (r.status === 429) msg = 'Muitas tentativas seguidas. Espere alguns minutos.';
  return new ErroApi(msg, r.status);
}

let renovando: Promise<boolean> | null = null;

/** Renova o acesso com o token de renovação. Uma renovação por vez. */
export function renovar(): Promise<boolean> {
  if (renovando) return renovando;
  const t = lerRenovacao();
  if (!t) return Promise.resolve(false);
  renovando = (async () => {
    try {
      const r = await bruto('/admin-web/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: t }) }, false);
      if (!r.ok) {
        guardarRenovacao(null);
        acesso = null;
        return false;
      }
      aplicar((await r.json()) as WebTokens);
      return true;
    } catch {
      return false;
    } finally {
      renovando = null;
    }
  })();
  return renovando;
}

async function pedir<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  let r = await bruto(caminho, init);
  if (r.status === 401 && (await renovar())) r = await bruto(caminho, init);
  if (r.status === 401) {
    acesso = null;
    guardarRenovacao(null);
    aoSair?.();
    throw new ErroApi('Sua sessão acabou. Entre de novo.', 401);
  }
  if (!r.ok) throw await erroDe(r);
  if (r.status === 204) return undefined as T;
  const tipo = r.headers.get('Content-Type') ?? '';
  return (tipo.includes('json') ? await r.json() : await r.text()) as T;
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

/* ── entrada ─────────────────────────────────────────────────── */

export async function entrarSenha(username: string, password: string): Promise<{ challenge: string; methods: SecondFactor[] }> {
  const r = await bruto('/admin-web/auth/login', { method: 'POST', ...json({ username, password }) }, false);
  if (!r.ok) throw await erroDe(r);
  return r.json();
}

export async function entrarCodigo(challenge: string, code: string): Promise<void> {
  const r = await bruto('/admin-web/auth/totp/verify', { method: 'POST', ...json({ challenge, code }) }, false);
  if (!r.ok) throw await erroDe(r);
  aplicar(await r.json());
}

export async function opcoesChave(challenge: string): Promise<{ requestId: string; options: { publicKey: unknown } }> {
  const r = await bruto('/admin-web/auth/passkey/options', { method: 'POST', ...json({ challenge }) }, false);
  if (!r.ok) throw await erroDe(r);
  return r.json();
}

export async function entrarChave(challenge: string, requestId: string, credential: unknown): Promise<void> {
  const r = await bruto('/admin-web/auth/passkey/verify', { method: 'POST', ...json({ challenge, requestId, credential }) }, false);
  if (!r.ok) throw await erroDe(r);
  aplicar(await r.json());
}

export async function sair(): Promise<void> {
  try {
    if (acesso) await bruto('/admin-web/logout', { method: 'POST' });
  } finally {
    acesso = null;
    guardarRenovacao(null);
  }
}

/** Ao abrir a página: retoma a sessão da aba, se ainda valer. */
export async function retomar(): Promise<boolean> {
  return lerRenovacao() ? renovar() : false;
}

/* ── painel ──────────────────────────────────────────────────── */

export const eu = () => pedir<WebMe>('/admin-web/me');
export const chaves = () => pedir<Passkey[]>('/admin-web/passkeys');
export const opcoesNovaChave = () =>
  pedir<{ requestId: string; options: { publicKey: unknown } }>('/admin-web/passkeys/register/options', { method: 'POST' });
export const salvarNovaChave = (requestId: string, credential: unknown, label: string) =>
  pedir<Passkey[]>('/admin-web/passkeys/register/verify', { method: 'POST', ...json({ requestId, credential, label }) });
export const apagarChave = (id: number) => pedir<Passkey[]>(`/admin-web/passkeys/${id}`, { method: 'DELETE' });
export const sessoes = () => pedir<WebSession[]>('/admin-web/sessions');
export const encerrarSessao = (sid: string) => pedir<void>(`/admin-web/sessions/${encodeURIComponent(sid)}`, { method: 'DELETE' });
export const encerrarTodas = () => pedir<void>('/admin-web/sessions/revoke-all', { method: 'POST' });
export const historico = (username?: string) =>
  pedir<AuditEntry[]>(`/admin-web/audit?limit=200${username ? '&username=' + encodeURIComponent(username) : ''}`);

/* ── gestão (mesmas rotas do app) ───────────────────────────── */

export const numeros = (from: string, to: string) =>
  pedir<StatsDto>(`/admin/stats?from=${from}&to=${to}`);

export async function linkExportacao(file: ExportFile, from: string, to: string): Promise<string> {
  const d = await pedir<{ path: string }>('/admin/exports/link', { method: 'POST', ...json({ file, from, to }) });
  return SERVIDOR + d.path;
}

export const pessoas = (username: string) => pedir<UserSummaryDto[]>(`/admin/users?username=${encodeURIComponent(username)}`);
export const mudarPapel = (id: number, role: Role) => pedir<UserSummaryDto>(`/admin/users/${id}/role`, { method: 'PUT', ...json({ role }) });
export const bloquear = (id: number, blocked: boolean, reason?: string) =>
  pedir<UserSummaryDto>(`/admin/users/${id}/block`, { method: 'PUT', ...json({ blocked, reason }) });

export const filaModeracao = (page = 0) => pedir<PageResponse<FeedbackDto>>(`/admin/moderation?page=${page}&size=30`);
export const muralTodas = (page = 0) => pedir<PageResponse<FeedbackDto>>(`/feedbacks?page=${page}&size=30&sort=recent`);
export const denuncias = () => pedir<ReportedItem[]>('/admin/feedbacks/reports');
export const manterDenunciada = (id: number) => pedir<FeedbackDto>(`/admin/feedbacks/${id}/reports/dismiss`, { method: 'POST' });
export const moderar = (id: number, req: ModerateFeedbackRequest) =>
  pedir<FeedbackDto>(`/admin/feedbacks/${id}`, { method: 'PATCH', ...json(req) });
export const apagarPublicacao = (id: number) => pedir<void>(`/admin/feedbacks/${id}`, { method: 'DELETE' });

export const eventos = (page = 0) => pedir<PageResponse<ParkEventDto>>(`/admin/events?page=${page}&size=50`);
export const criarEvento = (req: UpsertEventRequest) => pedir<ParkEventDto>('/admin/events', { method: 'POST', ...json(req) });
export const editarEvento = (id: number, req: UpsertEventRequest) =>
  pedir<ParkEventDto>(`/admin/events/${id}`, { method: 'PUT', ...json(req) });
export const apagarEvento = (id: number) => pedir<void>(`/admin/events/${id}`, { method: 'DELETE' });

export const painelParque = () => pedir<ParkOperationsDto>('/bikes/panel');
export const salvarParque = (horarios: DayHoursRequest[], aviso: string, horariosProvisorios: boolean) =>
  pedir<ParkOperationsDto>('/admin/park/status', { method: 'PUT', ...json({ horarios, aviso, horariosProvisorios }) });
export const excecao = (tipo: OverrideType) => pedir<ParkOperationsDto>('/bikes/override', { method: 'PUT', ...json({ tipo }) });
export const tirarExcecao = () => pedir<ParkOperationsDto>('/bikes/override', { method: 'DELETE' });
