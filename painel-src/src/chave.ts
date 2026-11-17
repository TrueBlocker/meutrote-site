/*
 * Chave de acesso (passkey / WebAuthn): o navegador pede o rosto, a digital ou o PIN do computador e assina um
 * desafio do servidor. A chave privada nunca sai do aparelho.
 *
 * O servidor manda as opções em JSON com os bytes em base64url; aqui convertemos para o formato do navegador e de
 * volta. Navegadores novos já têm isso pronto (parseCreationOptionsFromJSON / toJSON); os antigos usam a conversão
 * manual abaixo.
 */

type Json = Record<string, unknown>;

const b64 = {
  paraBytes(s: string): ArrayBuffer {
    const base = s.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(base + '==='.slice((base.length + 3) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  },
  deBytes(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
};

export function suportaChave(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window && !!navigator.credentials;
}

/** Tira campos nulos (o JSON da Yubico pode trazer "null", que o navegador recusa). */
function semNulos<T>(o: T): T {
  if (Array.isArray(o)) return o.map(semNulos) as T;
  if (o && typeof o === 'object') {
    const r: Json = {};
    for (const [k, v] of Object.entries(o as Json)) if (v !== null && v !== undefined) r[k] = semNulos(v);
    return r as T;
  }
  return o;
}

function opcoesCriacao(pk: Json): PublicKeyCredentialCreationOptions {
  const PKC = PublicKeyCredential as unknown as { parseCreationOptionsFromJSON?: (j: unknown) => PublicKeyCredentialCreationOptions };
  if (PKC.parseCreationOptionsFromJSON) return PKC.parseCreationOptionsFromJSON(pk);
  const user = pk.user as Json;
  return {
    ...(pk as object),
    challenge: b64.paraBytes(pk.challenge as string),
    user: { ...(user as object), id: b64.paraBytes(user.id as string) },
    excludeCredentials: ((pk.excludeCredentials as Json[]) ?? []).map((c) => ({ ...(c as object), id: b64.paraBytes(c.id as string) })),
  } as unknown as PublicKeyCredentialCreationOptions;
}

function opcoesUso(pk: Json): PublicKeyCredentialRequestOptions {
  const PKC = PublicKeyCredential as unknown as { parseRequestOptionsFromJSON?: (j: unknown) => PublicKeyCredentialRequestOptions };
  if (PKC.parseRequestOptionsFromJSON) return PKC.parseRequestOptionsFromJSON(pk);
  return {
    ...(pk as object),
    challenge: b64.paraBytes(pk.challenge as string),
    allowCredentials: ((pk.allowCredentials as Json[]) ?? []).map((c) => ({ ...(c as object), id: b64.paraBytes(c.id as string) })),
  } as unknown as PublicKeyCredentialRequestOptions;
}

function paraJson(c: PublicKeyCredential): Json {
  const nativo = (c as unknown as { toJSON?: () => Json }).toJSON;
  if (typeof nativo === 'function') {
    try {
      return nativo.call(c);
    } catch {
      // alguns gerenciadores de senha quebram o toJSON: cai na conversão manual
    }
  }
  const r = c.response as AuthenticatorAttestationResponse & AuthenticatorAssertionResponse;
  const response: Json = { clientDataJSON: b64.deBytes(r.clientDataJSON) };
  if ('attestationObject' in r && r.attestationObject) {
    response.attestationObject = b64.deBytes(r.attestationObject);
    const t = (r as unknown as { getTransports?: () => string[] }).getTransports;
    if (typeof t === 'function') response.transports = t.call(r);
  }
  if ('authenticatorData' in r && r.authenticatorData) {
    response.authenticatorData = b64.deBytes(r.authenticatorData);
    response.signature = b64.deBytes(r.signature);
    if (r.userHandle) response.userHandle = b64.deBytes(r.userHandle);
  }
  return {
    id: c.id,
    rawId: b64.deBytes(c.rawId),
    type: c.type,
    response,
    clientExtensionResults: c.getClientExtensionResults(),
    authenticatorAttachment: (c as unknown as { authenticatorAttachment?: string }).authenticatorAttachment ?? undefined,
  };
}

function mensagem(e: unknown): string {
  const nome = (e as { name?: string })?.name;
  if (nome === 'NotAllowedError') return 'Cancelado ou o tempo acabou. Tente de novo.';
  if (nome === 'InvalidStateError') return 'Este aparelho já tem uma chave de acesso cadastrada para você.';
  if (nome === 'SecurityError') return 'Chaves de acesso só funcionam no endereço oficial do painel.';
  return 'O navegador não conseguiu usar a chave de acesso.';
}

export async function criarChave(options: { publicKey: unknown }): Promise<Json> {
  try {
    const c = (await navigator.credentials.create({ publicKey: opcoesCriacao(semNulos(options.publicKey as Json)) })) as PublicKeyCredential | null;
    if (!c) throw new Error('vazio');
    return paraJson(c);
  } catch (e) {
    throw new Error(mensagem(e));
  }
}

export async function usarChave(options: { publicKey: unknown }): Promise<Json> {
  try {
    const c = (await navigator.credentials.get({ publicKey: opcoesUso(semNulos(options.publicKey as Json)) })) as PublicKeyCredential | null;
    if (!c) throw new Error('vazio');
    return paraJson(c);
  } catch (e) {
    throw new Error(mensagem(e));
  }
}
