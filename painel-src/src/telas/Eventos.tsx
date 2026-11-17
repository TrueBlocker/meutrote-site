import { useState } from 'react';
import * as api from '../api';
import type { ParkEventDto, UpsertEventRequest } from '../types';
import { Aviso, Dialogo, dataHora, mensagemDe, useCarregar, useConfirmar } from '../util';

/** "2026-11-20T08:00:00" → "2026-11-20T08:00" (campo datetime-local) e de volta. */
const paraCampo = (iso: string | null) => (iso ? iso.slice(0, 16) : '');
const doCampo = (v: string) => (v ? (v.length === 16 ? v + ':00' : v) : null);

export function Eventos() {
  const { dado, setDado, erro, carregando } = useCarregar(() => api.eventos(0), []);
  const [editando, setEditando] = useState<ParkEventDto | 'novo' | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const { confirmar, elemento } = useConfirmar();

  const apagar = (e: ParkEventDto) =>
    confirmar(`Apagar o evento "${e.title}"? ${e.goingCount} pessoa(s) confirmaram presença. Se ele só não vai mais acontecer, prefira marcar como cancelado.`, async () => {
      try {
        await api.apagarEvento(e.id);
        setDado((d) => (d ? { ...d, content: d.content.filter((x) => x.id !== e.id) } : d));
        setOk('Evento apagado.');
      } catch (er) {
        setFalha(mensagemDe(er));
      }
    });

  const lista = [...(dado?.content ?? [])].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const agora = new Date().toISOString().slice(0, 16);

  return (
    <>
      <div className="cabeca">
        <div>
          <h1>Eventos</h1>
          <p>A agenda do parque que aparece no app. Fotos e vídeos continuam sendo enviados pelo app.</p>
        </div>
        <button className="botao botao--forte" onClick={() => setEditando('novo')}>Novo evento</button>
      </div>

      <Aviso>{erro ?? falha}</Aviso>
      <Aviso tipo="ok">{ok}</Aviso>
      {carregando && !dado ? <div className="carregando">Carregando…</div> : null}

      {dado ? (
        <div className="cartao" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="tabela">
            <thead><tr><th>Quando</th><th>Evento</th><th>Local</th><th>Presenças</th><th className="acoes">Ações</th></tr></thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.id} style={{ opacity: e.startsAt.slice(0, 16) < agora ? 0.6 : 1 }}>
                  <td style={{ whiteSpace: 'nowrap' }}>{dataHora(e.startsAt)}</td>
                  <td>
                    <b>{e.title}</b> {e.cancelled ? <span className="etiqueta etiqueta--vermelho">Cancelado</span> : null}
                    {e.media.length ? <span className="miudo"> · {e.media.length} foto(s)/vídeo(s)</span> : null}
                    {e.description ? <div className="miudo">{e.description.slice(0, 120)}{e.description.length > 120 ? '…' : ''}</div> : null}
                  </td>
                  <td>{e.location ?? '—'}</td>
                  <td>{e.goingCount}</td>
                  <td className="acoes">
                    <div className="linha-botoes" style={{ justifyContent: 'flex-end' }}>
                      <button className="botao botao--pequeno" onClick={() => setEditando(e)}>Editar</button>
                      <button className="botao botao--pequeno botao--perigo" onClick={() => apagar(e)}>Apagar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {lista.length === 0 ? <tr><td colSpan={5} className="vazio">Nenhum evento ainda.</td></tr> : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {editando ? (
        <FormEvento
          ev={editando === 'novo' ? null : editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(novo, era) => {
            setDado((d) => {
              if (!d) return d;
              return era ? { ...d, content: d.content.map((x) => (x.id === novo.id ? novo : x)) } : { ...d, content: [novo, ...d.content] };
            });
            setEditando(null);
            setOk(era ? 'Evento atualizado.' : 'Evento criado. Ele já aparece no app.');
          }}
        />
      ) : null}
      {elemento}
    </>
  );
}

function FormEvento({ ev, aoFechar, aoSalvar }: { ev: ParkEventDto | null; aoFechar: () => void; aoSalvar: (e: ParkEventDto, editado: boolean) => void }) {
  const [titulo, setTitulo] = useState(ev?.title ?? '');
  const [descricao, setDescricao] = useState(ev?.description ?? '');
  const [local, setLocal] = useState(ev?.location ?? '');
  const [inicio, setInicio] = useState(paraCampo(ev?.startsAt ?? null));
  const [fim, setFim] = useState(paraCampo(ev?.endsAt ?? null));
  const [cancelado, setCancelado] = useState(ev?.cancelled ?? false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fim && fim < inicio) return setErro('O fim precisa ser depois do início.');
    const req: UpsertEventRequest = {
      title: titulo.trim(),
      description: descricao.trim() || null,
      location: local.trim() || null,
      startsAt: doCampo(inicio)!,
      endsAt: doCampo(fim),
      cancelled: cancelado,
    };
    setOcupado(true);
    setErro(null);
    try {
      aoSalvar(ev ? await api.editarEvento(ev.id, req) : await api.criarEvento(req), !!ev);
    } catch (er) {
      setErro(mensagemDe(er));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Dialogo titulo={ev ? 'Editar evento' : 'Novo evento'} aoFechar={aoFechar}>
      <form onSubmit={salvar}>
        <Aviso>{erro}</Aviso>
        <div className="campo">
          <label htmlFor="t">Título</label>
          <input id="t" maxLength={120} required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div className="grade grade--2" style={{ gap: 12 }}>
          <div className="campo">
            <label htmlFor="i">Começa</label>
            <input id="i" type="datetime-local" required value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="f">Termina (opcional)</label>
            <input id="f" type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>
        <div className="campo">
          <label htmlFor="l">Local no parque</label>
          <input id="l" maxLength={200} value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: perto das cocheiras" />
        </div>
        <div className="campo">
          <label htmlFor="d">Descrição</label>
          <textarea id="d" maxLength={2000} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        {ev ? (
          <label className="linha-botoes" style={{ marginBottom: 14 }}>
            <input type="checkbox" checked={cancelado} onChange={(e) => setCancelado(e.target.checked)} /> Evento cancelado (continua visível, com o aviso)
          </label>
        ) : null}
        <p className="miudo" style={{ marginBottom: 14 }}>Horários no relógio de São Paulo.</p>
        <div className="linha-botoes" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao botao--forte" disabled={ocupado}>{ev ? 'Salvar' : 'Criar evento'}</button>
        </div>
      </form>
    </Dialogo>
  );
}
