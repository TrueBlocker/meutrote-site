import { useState } from 'react';
import * as api from '../api';
import type { FeedbackDto, FeedbackStatus, ReportedItem } from '../types';
import { Aviso, Dialogo, MOTIVO, STATUS_POST, TIPO_POST, dataHora, mensagemDe, useCarregar, useConfirmar } from '../util';

type Aba = 'fila' | 'denuncias' | 'todas';

function Post({ p, children }: { p: FeedbackDto; children?: React.ReactNode }) {
  return (
    <article className={'post' + (p.hidden ? ' post--escondida' : '')}>
      <div className="post__topo">
        <b style={{ color: 'var(--tinta)' }}>{p.user.username}</b>
        <span>{dataHora(p.createdAt)}</span>
        <span className="etiqueta">{TIPO_POST[p.type] ?? p.type}</span>
        <span className={'etiqueta' + (p.status === 'RESOLVIDA' ? ' etiqueta--verde' : p.status === 'RECEBIDA' ? ' etiqueta--ambar' : '')}>
          {STATUS_POST[p.status] ?? p.status}
        </span>
        {p.topic === 'BIKES' ? <span className="etiqueta">Bikes</span> : null}
        {p.hidden ? <span className="etiqueta etiqueta--vermelho">Escondida</span> : null}
        <span style={{ marginLeft: 'auto' }}>“Eu também”: {p.supportCount}</span>
      </div>
      <p className="post__texto">{p.content}</p>
      {p.adminResponse ? <div className="post__resposta"><b>Resposta:</b> {p.adminResponse}</div> : null}
      {children}
    </article>
  );
}

export function Mural() {
  const [aba, setAba] = useState<Aba>('fila');
  const [pagina, setPagina] = useState(0);
  const [editando, setEditando] = useState<FeedbackDto | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { confirmar, elemento } = useConfirmar();

  const lista = useCarregar(
    () => (aba === 'fila' ? api.filaModeracao(pagina) : api.muralTodas(pagina)),
    [aba, pagina],
  );
  const den = useCarregar(() => api.denuncias(), [aba]);

  const atualizar = (novo: FeedbackDto) => {
    lista.setDado((d) => (d ? { ...d, content: d.content.map((x) => (x.id === novo.id ? novo : x)) } : d));
    den.setDado((d) => (d ? d.map((x) => (x.feedback.id === novo.id ? { ...x, feedback: novo } : x)) : d));
  };
  const remover = (id: number) => {
    lista.setDado((d) => (d ? { ...d, content: d.content.filter((x) => x.id !== id) } : d));
    den.setDado((d) => (d ? d.filter((x) => x.feedback.id !== id) : d));
  };

  const alternarEscondida = async (p: FeedbackDto) => {
    setErro(null);
    try {
      atualizar(await api.moderar(p.id, { hidden: !p.hidden }));
      setOk(p.hidden ? 'Publicação visível de novo.' : 'Publicação escondida do mural.');
    } catch (e) {
      setErro(mensagemDe(e));
    }
  };

  const apagar = (p: FeedbackDto) =>
    confirmar(`Apagar de vez a publicação de ${p.user.username}? Não dá para desfazer. Se for só para tirar do mural, prefira "Esconder".`, async () => {
      try {
        await api.apagarPublicacao(p.id);
        remover(p.id);
        setOk('Publicação apagada.');
      } catch (e) {
        setErro(mensagemDe(e));
      }
    });

  const manter = async (it: ReportedItem) => {
    try {
      await api.manterDenunciada(it.feedback.id);
      den.setDado((d) => (d ? d.filter((x) => x.feedback.id !== it.feedback.id) : d));
      setOk('Denúncias descartadas; a publicação continua no mural.');
    } catch (e) {
      setErro(mensagemDe(e));
    }
  };

  const acoes = (p: FeedbackDto) => (
    <div className="linha-botoes">
      <button className="botao botao--pequeno botao--forte" onClick={() => setEditando(p)}>Responder / situação</button>
      <button className="botao botao--pequeno" onClick={() => void alternarEscondida(p)}>{p.hidden ? 'Mostrar' : 'Esconder'}</button>
      <button className="botao botao--pequeno botao--perigo" onClick={() => apagar(p)}>Apagar</button>
    </div>
  );

  const nDen = den.dado?.length ?? 0;

  return (
    <>
      <div className="cabeca">
        <div>
          <h1>Mural</h1>
          <p>Responder a comunidade, acompanhar a situação de cada pedido e cuidar das denúncias.</p>
        </div>
        <div className="segmento" role="group" aria-label="Lista">
          <button aria-pressed={aba === 'fila'} onClick={() => { setAba('fila'); setPagina(0); }}>Fila</button>
          <button aria-pressed={aba === 'denuncias'} onClick={() => setAba('denuncias')}>Denúncias{nDen ? ` (${nDen})` : ''}</button>
          <button aria-pressed={aba === 'todas'} onClick={() => { setAba('todas'); setPagina(0); }}>Todas</button>
        </div>
      </div>

      <Aviso>{erro}</Aviso>
      <Aviso tipo="ok">{ok}</Aviso>

      {aba === 'denuncias' ? (
        <>
          <Aviso>{den.erro}</Aviso>
          {den.carregando && !den.dado ? <div className="carregando">Carregando…</div> : null}
          {den.dado?.length === 0 ? <div className="vazio">Nenhuma denúncia pendente.</div> : null}
          {den.dado?.map((it) => (
            <Post key={it.feedback.id} p={it.feedback}>
              <div className="aviso aviso--info" style={{ marginBottom: 10 }}>
                <b>{it.reports} {it.reports === 1 ? 'denúncia' : 'denúncias'}</b> · {it.reasons.map((r) => MOTIVO[r] ?? r).join(', ')} · última em {dataHora(it.lastReportAt)}
                {it.details.length ? <div className="miudo" style={{ marginTop: 4 }}>{it.details.map((d) => `“${d}”`).join('  ')}</div> : null}
              </div>
              <div className="linha-botoes">
                <button className="botao botao--pequeno botao--verde" onClick={() => void manter(it)}>Manter (não procede)</button>
                {acoes(it.feedback)}
              </div>
            </Post>
          ))}
        </>
      ) : (
        <>
          <Aviso>{lista.erro}</Aviso>
          {lista.carregando && !lista.dado ? <div className="carregando">Carregando…</div> : null}
          {lista.dado?.content.length === 0 ? <div className="vazio">{aba === 'fila' ? 'Fila zerada. Tudo respondido!' : 'Nenhuma publicação.'}</div> : null}
          {lista.dado?.content.map((p) => <Post key={p.id} p={p}>{acoes(p)}</Post>)}
          {lista.dado && lista.dado.totalPages > 1 ? (
            <div className="linha-botoes" style={{ marginTop: 14, justifyContent: 'center' }}>
              <button className="botao botao--pequeno" disabled={pagina === 0} onClick={() => setPagina((n) => n - 1)}>Anterior</button>
              <span className="miudo">Página {pagina + 1} de {lista.dado.totalPages}</span>
              <button className="botao botao--pequeno" disabled={pagina + 1 >= lista.dado.totalPages} onClick={() => setPagina((n) => n + 1)}>Próxima</button>
            </div>
          ) : null}
        </>
      )}

      {editando ? (
        <Responder
          p={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(novo) => {
            atualizar(novo);
            if (aba === 'fila' && novo.status !== 'RECEBIDA') remover(novo.id);
            setEditando(null);
            setOk('Resposta salva. A pessoa recebe um aviso no app.');
          }}
        />
      ) : null}
      {elemento}
    </>
  );
}

function Responder({ p, aoFechar, aoSalvar }: { p: FeedbackDto; aoFechar: () => void; aoSalvar: (f: FeedbackDto) => void }) {
  const [status, setStatus] = useState<FeedbackStatus>(p.status === 'RECEBIDA' ? 'EM_ANALISE' : p.status);
  const [resposta, setResposta] = useState(p.adminResponse ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const salvar = async () => {
    setOcupado(true);
    setErro(null);
    try {
      aoSalvar(await api.moderar(p.id, { status, adminResponse: resposta.trim() || undefined }));
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Dialogo titulo={`Responder ${p.user.username}`} aoFechar={aoFechar}>
      <p className="post__texto" style={{ background: 'var(--papel)', padding: 10, borderRadius: 8 }}>{p.content}</p>
      <Aviso>{erro}</Aviso>
      <div className="campo">
        <label htmlFor="st">Situação</label>
        <select id="st" value={status} onChange={(e) => setStatus(e.target.value as FeedbackStatus)}>
          {Object.entries(STATUS_POST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="rp">Resposta pública</label>
        <textarea id="rp" maxLength={1000} value={resposta} onChange={(e) => setResposta(e.target.value)} placeholder="Aparece embaixo da publicação, para todo mundo." />
        <span className="ajuda">{resposta.length}/1000</span>
      </div>
      <div className="linha-botoes" style={{ justifyContent: 'flex-end' }}>
        <button className="botao" onClick={aoFechar}>Cancelar</button>
        <button className="botao botao--forte" onClick={() => void salvar()} disabled={ocupado}>Salvar</button>
      </div>
    </Dialogo>
  );
}
