import { useState } from 'react';
import * as api from '../api';
import { criarChave, suportaChave } from '../chave';
import type { WebMe } from '../types';
import { Aviso, dataHora, mensagemDe, useCarregar, useConfirmar } from '../util';

/** Nome amigável do aparelho a partir do navegador (só para a pessoa reconhecer a sessão). */
function aparelho(ua: string | null): string {
  if (!ua) return 'Aparelho desconhecido';
  const so = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Linux/.test(ua) ? 'Linux' : '';
  const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  return so ? `${nav} no ${so}` : nav;
}

function nomeSugerido(): string {
  const ua = navigator.userAgent;
  return /Windows/.test(ua) ? 'Windows Hello deste computador' : /Mac OS X/.test(ua) ? 'Touch ID deste Mac' : 'Chave deste aparelho';
}

export function Seguranca({ eu, aoMudar, aoEncerrarTudo }: { eu: WebMe; aoMudar: () => void; aoEncerrarTudo: () => void }) {
  const ch = useCarregar(() => api.chaves(), []);
  const ss = useCarregar(() => api.sessoes(), []);
  const [filtro, setFiltro] = useState('');
  const hist = useCarregar(() => api.historico(filtro.trim() || undefined), [filtro]);
  const [nome, setNome] = useState(nomeSugerido);
  const [ok, setOk] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const { confirmar, elemento } = useConfirmar();

  const cadastrar = async () => {
    setErro(null);
    setOk(null);
    setOcupado(true);
    try {
      const o = await api.opcoesNovaChave();
      const credencial = await criarChave(o.options);
      ch.setDado(await api.salvarNovaChave(o.requestId, credencial, nome.trim() || nomeSugerido()));
      setOk('Chave de acesso cadastrada. Na próxima entrada, é só usar o rosto, a digital ou o PIN.');
      aoMudar();
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setOcupado(false);
    }
  };

  const remover = (id: number, label: string) =>
    confirmar(`Remover a chave "${label}"? Esse aparelho deixa de servir para entrar no painel.`, async () => {
      try {
        ch.setDado(await api.apagarChave(id));
        setOk('Chave removida.');
        aoMudar();
      } catch (e) {
        setErro(mensagemDe(e));
      }
    });

  const encerrar = (sid: string) =>
    confirmar('Encerrar essa sessão? Quem estiver usando o painel nela sai na hora.', async () => {
      try {
        await api.encerrarSessao(sid);
        ss.setDado((d) => (d ? d.filter((x) => x.id !== sid) : d));
        setOk('Sessão encerrada.');
      } catch (e) {
        setErro(mensagemDe(e));
      }
    });

  const encerrarTodas = () =>
    confirmar('Encerrar TODAS as suas sessões do painel, inclusive esta? Use se esqueceu o painel aberto em outro computador.', async () => {
      try {
        await api.encerrarTodas();
      } finally {
        aoEncerrarTudo();
      }
    });

  return (
    <>
      <div className="cabeca">
        <div>
          <h1>Segurança</h1>
          <p>Suas chaves de acesso, onde o painel está aberto e o histórico de tudo o que a administração mudou.</p>
        </div>
      </div>

      <Aviso>{erro}</Aviso>
      <Aviso tipo="ok">{ok}</Aviso>

      <div className="grade grade--2">
        <div className="cartao">
          <h2>Chaves de acesso</h2>
          <p className="miudo" style={{ margin: '4px 0 12px' }}>
            Entre com o rosto, a digital ou o PIN do computador (Windows Hello, Touch ID) ou com uma chave de segurança USB. A chave fica
            só no seu aparelho; o servidor guarda apenas a parte pública.
          </p>
          {eu.passkeys === 0 ? <Aviso tipo="info">Você ainda entra só com o código do autenticador. Cadastre uma chave para entrar mais rápido e com mais segurança.</Aviso> : null}
          <table className="tabela">
            <tbody>
              {(ch.dado ?? []).map((k) => (
                <tr key={k.id}>
                  <td><b>{k.label}</b><div className="miudo">criada em {dataHora(k.createdAt)} · último uso {dataHora(k.lastUsedAt)}</div></td>
                  <td className="acoes"><button className="botao botao--pequeno botao--perigo" onClick={() => remover(k.id, k.label)}>Remover</button></td>
                </tr>
              ))}
              {ch.dado?.length === 0 ? <tr><td className="miudo">Nenhuma chave cadastrada.</td></tr> : null}
            </tbody>
          </table>
          <div className="campo" style={{ marginTop: 14 }}>
            <label htmlFor="nk">Nome da nova chave</label>
            <input id="nk" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <button className="botao botao--verde" onClick={() => void cadastrar()} disabled={ocupado || !suportaChave()}>
            {ocupado ? 'Aguardando o aparelho…' : 'Cadastrar chave neste aparelho'}
          </button>
          {!suportaChave() ? <p className="miudo" style={{ marginTop: 6 }}>Este navegador não tem suporte a chaves de acesso.</p> : null}
          <p className="miudo" style={{ marginTop: 10 }}>
            Verificação em duas etapas por código: {eu.totpEnabled ? <b>ligada</b> : <b>desligada</b>} (gerencie no app, em Perfil → Segurança).
          </p>
        </div>

        <div className="cartao">
          <div className="cabeca" style={{ marginBottom: 8 }}>
            <h2>Onde o painel está aberto</h2>
            <button className="botao botao--pequeno botao--perigo" onClick={encerrarTodas}>Encerrar todas</button>
          </div>
          <p className="miudo" style={{ marginBottom: 10 }}>Cada sessão dura no máximo 8 horas e acaba sozinha depois de 30 minutos parada.</p>
          <table className="tabela">
            <tbody>
              {(ss.dado ?? []).map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{aparelho(s.userAgent)}</b> {s.current ? <span className="etiqueta etiqueta--verde">esta</span> : null}
                    <div className="miudo">
                      entrou {dataHora(s.createdAt)} com {s.method === 'PASSKEY' ? 'chave de acesso' : 'código'} · IP {s.ip ?? '—'} · último uso {dataHora(s.lastSeenAt)}
                    </div>
                  </td>
                  <td className="acoes">{s.current ? null : <button className="botao botao--pequeno" onClick={() => encerrar(s.id)}>Encerrar</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cartao" style={{ marginTop: 16 }}>
        <div className="cabeca" style={{ marginBottom: 8 }}>
          <div>
            <h2>Histórico da administração</h2>
            <p className="miudo">Entradas no painel e toda alteração feita por admins e operadores, pelo app ou pelo computador. Guardado por 1 ano.</p>
          </div>
          <input className="busca" placeholder="Filtrar por usuário" defaultValue={filtro} onKeyDown={(e) => e.key === 'Enter' && setFiltro((e.target as HTMLInputElement).value)} onBlur={(e) => setFiltro(e.target.value)} aria-label="Filtrar histórico por usuário" />
        </div>
        <Aviso>{hist.erro}</Aviso>
        <div style={{ overflowX: 'auto' }}>
          <table className="tabela">
            <thead><tr><th>Quando</th><th>Quem</th><th>Onde</th><th>O quê</th><th>Resultado</th><th>IP</th></tr></thead>
            <tbody>
              {(hist.dado ?? []).map((h) => (
                <tr key={h.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{dataHora(h.at)}</td>
                  <td>{h.username ?? '—'}</td>
                  <td><span className="etiqueta">{h.origin === 'WEB' ? 'Painel' : 'App'}</span></td>
                  <td><code style={{ fontSize: 13 }}>{h.action} {h.path.replace('/api/v1', '')}</code></td>
                  <td>
                    <span className={'etiqueta ' + (h.status < 300 ? 'etiqueta--verde' : h.status < 500 ? 'etiqueta--ambar' : 'etiqueta--vermelho')}>{h.status}</span>
                  </td>
                  <td className="miudo">{h.ip ?? '—'}</td>
                </tr>
              ))}
              {hist.dado?.length === 0 ? <tr><td colSpan={6} className="vazio">Nada registrado ainda.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      {elemento}
    </>
  );
}
