import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/** Datas do servidor vêm sem fuso, já no horário de São Paulo. */
export function dataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length <= 19 ? iso : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function data(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR');
}

export function hojeISO(deslocDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + deslocDias);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function num(n: number | null | undefined, casas = 0): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: 0 });
}

export function mensagemDe(e: unknown): string {
  return e instanceof Error ? e.message : 'Algo deu errado.';
}

/** Carrega algo do servidor com estado de carregando/erro e um "recarregar". */
export function useCarregar<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [dado, setDado] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const vivo = useRef(true);
  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const r = await fn();
      if (vivo.current) setDado(r);
    } catch (e) {
      if (vivo.current) setErro(mensagemDe(e));
    } finally {
      if (vivo.current) setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    vivo.current = true;
    void recarregar();
    return () => {
      vivo.current = false;
    };
  }, [recarregar]);
  return { dado, setDado, erro, carregando, recarregar };
}

export function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'ok' | 'info'; children: ReactNode }) {
  if (!children) return null;
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function Dialogo({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [aoFechar]);
  return (
    <div className="fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="dialogo" role="dialog" aria-modal="true" aria-label={titulo}>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

/** Pede confirmação antes de algo que não dá para desfazer. */
export function useConfirmar() {
  const [pedido, setPedido] = useState<{ texto: string; acao: () => void; perigo?: boolean } | null>(null);
  const confirmar = (texto: string, acao: () => void, perigo = true) => setPedido({ texto, acao, perigo });
  const elemento = pedido ? (
    <Dialogo titulo="Confirmar" aoFechar={() => setPedido(null)}>
      <p style={{ marginBottom: 18 }}>{pedido.texto}</p>
      <div className="linha-botoes" style={{ justifyContent: 'flex-end' }}>
        <button className="botao" onClick={() => setPedido(null)}>Cancelar</button>
        <button
          className={pedido.perigo ? 'botao botao--perigo' : 'botao botao--forte'}
          onClick={() => {
            const a = pedido.acao;
            setPedido(null);
            a();
          }}
          autoFocus
        >
          Confirmar
        </button>
      </div>
    </Dialogo>
  ) : null;
  return { confirmar, elemento };
}

export const TIPO_POST: Record<string, string> = { SUGESTAO: 'Sugestão', CRITICA: 'Crítica', ELOGIO: 'Elogio', PROBLEMA: 'Problema' };
export const STATUS_POST: Record<string, string> = {
  RECEBIDA: 'Recebida',
  EM_ANALISE: 'Em análise',
  ENCAMINHADA: 'Encaminhada',
  RESOLVIDA: 'Resolvida',
  NAO_PROCEDE: 'Não procede',
};
export const MOTIVO: Record<string, string> = {
  OFENSIVO: 'Ofensivo',
  FALSO: 'Informação falsa',
  PESSOAL: 'Dados pessoais',
  SPAM: 'Spam',
  OUTRO: 'Outro',
};
export const PAPEL: Record<string, string> = { USER: 'Frequentador', ADMIN: 'Administração', BIKE_OPERATOR: 'Operador de bikes' };
