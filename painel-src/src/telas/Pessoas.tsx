import { useState } from 'react';
import * as api from '../api';
import type { Role, UserSummaryDto, WebMe } from '../types';
import { Aviso, Dialogo, PAPEL, dataHora, mensagemDe, useConfirmar } from '../util';

export function Pessoas({ eu }: { eu: WebMe }) {
  const [busca, setBusca] = useState('');
  const [lista, setLista] = useState<UserSummaryDto[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [bloqueando, setBloqueando] = useState<UserSummaryDto | null>(null);
  const [motivo, setMotivo] = useState('');
  const { confirmar, elemento } = useConfirmar();

  const buscar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErro(null);
    setOk(null);
    try {
      setLista(await api.pessoas(busca.trim()));
    } catch (e2) {
      setErro(mensagemDe(e2));
    }
  };

  const trocar = (novo: UserSummaryDto) => setLista((l) => (l ?? []).map((u) => (u.id === novo.id ? novo : u)));

  const papel = (u: UserSummaryDto, r: Role) =>
    confirmar(
      r === 'ADMIN'
        ? `Dar acesso de ADMINISTRAÇÃO a ${u.username}? A pessoa vai poder moderar, bloquear contas e mudar o parque. Ela precisa ter a verificação em duas etapas ligada.`
        : `Mudar ${u.username} para "${PAPEL[r]}"?`,
      async () => {
        try {
          trocar(await api.mudarPapel(u.id, r));
          setOk(`${u.username} agora é ${PAPEL[r]}.`);
        } catch (e) {
          setErro(mensagemDe(e));
        }
      },
      r === 'ADMIN',
    );

  const desbloquear = (u: UserSummaryDto) =>
    confirmar(`Desbloquear ${u.username}?`, async () => {
      try {
        trocar(await api.bloquear(u.id, false));
        setOk(`${u.username} foi desbloqueada.`);
      } catch (e) {
        setErro(mensagemDe(e));
      }
    }, false);

  const confirmarBloqueio = async () => {
    if (!bloqueando) return;
    try {
      trocar(await api.bloquear(bloqueando.id, true, motivo.trim() || undefined));
      setOk(`${bloqueando.username} foi bloqueada. A pessoa sai do app na hora.`);
      setBloqueando(null);
      setMotivo('');
    } catch (e) {
      setErro(mensagemDe(e));
    }
  };

  return (
    <>
      <div className="cabeca">
        <div>
          <h1>Pessoas</h1>
          <p>Buscar contas, mudar o papel e bloquear quem desrespeita as regras do mural.</p>
        </div>
      </div>

      <form className="linha-botoes" onSubmit={buscar} style={{ marginBottom: 16 }}>
        <input className="busca" style={{ minWidth: 280 }} placeholder="Nome de usuário ou parte dele" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar pessoa" />
        <button className="botao botao--forte">Buscar</button>
      </form>

      <Aviso>{erro}</Aviso>
      <Aviso tipo="ok">{ok}</Aviso>

      {lista ? (
        <div className="cartao" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="tabela">
            <thead><tr><th>Usuário</th><th>Papel</th><th>Situação</th><th>Criada em</th><th className="acoes">Ações</th></tr></thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.username}</b>{u.id === eu.id ? <span className="miudo"> (você)</span> : null}</td>
                  <td>
                    <select
                      className="busca"
                      value={u.role}
                      disabled={u.id === eu.id}
                      onChange={(e) => papel(u, e.target.value as Role)}
                      aria-label={`Papel de ${u.username}`}
                    >
                      {(['USER', 'BIKE_OPERATOR', 'ADMIN'] as Role[]).map((r) => <option key={r} value={r}>{PAPEL[r]}</option>)}
                    </select>
                  </td>
                  <td>
                    {u.blocked ? (
                      <span className="etiqueta etiqueta--vermelho" title={u.blockedReason ?? ''}>Bloqueada</span>
                    ) : (
                      <span className="etiqueta etiqueta--verde">Ativa</span>
                    )}
                    {u.blocked && u.blockedReason ? <div className="miudo">{u.blockedReason}</div> : null}
                  </td>
                  <td className="miudo">{dataHora(u.createdAt)}</td>
                  <td className="acoes">
                    {u.id === eu.id ? null : u.blocked ? (
                      <button className="botao botao--pequeno" onClick={() => desbloquear(u)}>Desbloquear</button>
                    ) : (
                      <button className="botao botao--pequeno botao--perigo" onClick={() => setBloqueando(u)}>Bloquear</button>
                    )}
                  </td>
                </tr>
              ))}
              {lista.length === 0 ? <tr><td colSpan={5} className="vazio">Ninguém encontrado.</td></tr> : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="vazio">Busque pelo nome de usuário. Por privacidade, o painel não mostra e-mail, idade nem dados de saúde.</div>
      )}

      {bloqueando ? (
        <Dialogo titulo={`Bloquear ${bloqueando.username}`} aoFechar={() => setBloqueando(null)}>
          <p className="miudo" style={{ marginBottom: 12 }}>A pessoa sai do app na hora e não consegue entrar até ser desbloqueada. O motivo aparece para ela.</p>
          <div className="campo">
            <label htmlFor="mot">Motivo</label>
            <textarea id="mot" maxLength={200} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: ofensas repetidas no mural" />
          </div>
          <div className="linha-botoes" style={{ justifyContent: 'flex-end' }}>
            <button className="botao" onClick={() => setBloqueando(null)}>Cancelar</button>
            <button className="botao botao--perigo" onClick={() => void confirmarBloqueio()}>Bloquear</button>
          </div>
        </Dialogo>
      ) : null}
      {elemento}
    </>
  );
}
