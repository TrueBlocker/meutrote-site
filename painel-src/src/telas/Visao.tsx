import { useState } from 'react';
import * as api from '../api';
import type { ExportFile } from '../types';
import { Aviso, STATUS_POST, TIPO_POST, data, hojeISO, mensagemDe, num, useCarregar } from '../util';

const PERIODOS = [
  { dias: 7, nome: '7 dias' },
  { dias: 30, nome: '30 dias' },
  { dias: 90, nome: '90 dias' },
];
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const ESPORTE: Record<string, string> = {
  WALK: 'Caminhada', RUN: 'Corrida', BIKE: 'Bike', JUMP_ROPE: 'Corda', CALISTHENICS: 'Calistenia', OUTDOOR_GYM: 'Academia',
};

function Barras({ valores, rotulos }: { valores: number[]; rotulos?: string[] }) {
  const max = Math.max(1, ...valores);
  return (
    <>
      <div className="barras" role="img" aria-label={valores.map((v, i) => `${rotulos?.[i] ?? i}: ${v}`).join(', ')}>
        {valores.map((v, i) => (
          <span key={i} style={{ height: `${(v / max) * 100}%` }} title={`${rotulos?.[i] ?? i}: ${v}`} />
        ))}
      </div>
      {rotulos ? (
        <div className="barras-legenda">
          <span>{rotulos[0]}</span>
          <span>{rotulos[Math.floor(rotulos.length / 2)]}</span>
          <span>{rotulos[rotulos.length - 1]}</span>
        </div>
      ) : null}
    </>
  );
}

export function Visao() {
  const [dias, setDias] = useState(30);
  const de = hojeISO(-(dias - 1));
  const ate = hojeISO();
  const { dado: s, erro, carregando } = useCarregar(() => api.numeros(de, ate), [dias]);
  const [erroExp, setErroExp] = useState<string | null>(null);

  const exportar = async (f: ExportFile) => {
    setErroExp(null);
    try {
      // link de 10 min, assinado pelo servidor; abre em outra aba sem levar o token
      window.open(await api.linkExportacao(f, de, ate), '_blank', 'noopener,noreferrer');
    } catch (e) {
      setErroExp(mensagemDe(e));
    }
  };

  return (
    <>
      <div className="cabeca">
        <div>
          <h1>Visão geral</h1>
          <p>Como o parque e o app estão sendo usados. Números somados, sem identificar ninguém.</p>
        </div>
        <div className="segmento" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p.dias} aria-pressed={dias === p.dias} onClick={() => setDias(p.dias)}>{p.nome}</button>
          ))}
        </div>
      </div>

      <Aviso>{erro}</Aviso>
      {carregando && !s ? <div className="carregando">Carregando os números… (o servidor gratuito pode levar uns segundos para acordar)</div> : null}

      {s ? (
        <>
          <div className="grade grade--4">
            <div className="cartao"><div className="numero">{num(s.people.total)}</div><div className="rotulo">pessoas com conta ({num(s.people.newInPeriod)} novas no período)</div></div>
            <div className="cartao"><div className="numero">{num(s.activity.workouts)}</div><div className="rotulo">treinos registrados por {num(s.activity.activePeople)} pessoas</div></div>
            <div className="cartao"><div className="numero">{num(s.activity.totalKm, 1)}</div><div className="rotulo">km percorridos em {num(s.activity.totalHours, 1)} h</div></div>
            <div className="cartao"><div className="numero">{num(s.activity.goalPeople)}</div><div className="rotulo">pessoas bateram a meta de 150 min da OMS</div></div>
          </div>

          <div className="grade grade--2" style={{ marginTop: 16 }}>
            <div className="cartao">
              <h2>Treinos por dia</h2>
              <Barras valores={s.daily.map((d) => d.workouts)} rotulos={s.daily.map((d) => data(d.date).slice(0, 5))} />
            </div>
            <div className="cartao">
              <h2>Horário dos treinos</h2>
              <Barras valores={s.activity.byHour} rotulos={s.activity.byHour.map((_, h) => `${h}h`)} />
            </div>
            <div className="cartao">
              <h2>Dia da semana</h2>
              <Barras valores={s.activity.byWeekday} rotulos={DIAS} />
            </div>
            <div className="cartao">
              <h2>Atividades</h2>
              <table className="tabela" style={{ marginTop: 8 }}>
                <tbody>
                  {Object.entries(s.activity.bySport).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                    <tr key={k}><td>{ESPORTE[k] ?? k}</td><td style={{ textAlign: 'right' }}>{num(v)}</td></tr>
                  ))}
                  {Object.keys(s.activity.bySport).length === 0 ? <tr><td className="miudo">Nenhum treino no período.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="cartao" style={{ marginTop: 16 }}>
            <div className="cabeca" style={{ marginBottom: 8 }}>
              <h2>Voz da comunidade</h2>
              <span className="miudo">
                {num(s.ombudsman.posts)} publicações · {num(s.ombudsman.answered)} respondidas · {num(s.ombudsman.resolved)} resolvidas
                {s.ombudsman.avgFirstResponseHours != null ? ` · 1ª resposta em ${num(s.ombudsman.avgFirstResponseHours, 1)} h, em média` : ''}
              </span>
            </div>
            <table className="tabela">
              <thead><tr><th>Mais apoiadas</th><th>Tipo</th><th>Situação</th><th style={{ textAlign: 'right' }}>“Eu também”</th></tr></thead>
              <tbody>
                {s.ombudsman.top.map((p) => (
                  <tr key={p.id}>
                    <td>{p.content.length > 140 ? p.content.slice(0, 140) + '…' : p.content}</td>
                    <td><span className="etiqueta">{TIPO_POST[p.type] ?? p.type}</span></td>
                    <td><span className="etiqueta">{STATUS_POST[p.status] ?? p.status}</span></td>
                    <td style={{ textAlign: 'right' }}>{num(p.supports)}</td>
                  </tr>
                ))}
                {s.ombudsman.top.length === 0 ? <tr><td colSpan={4} className="miudo">Nenhuma publicação no período.</td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="cartao">
            <h2>Exportar o período ({data(de)} a {data(ate)})</h2>
            <p className="miudo" style={{ margin: '4px 0 12px' }}>Relatórios para reuniões e prestação de contas. Nenhum traz dado pessoal.</p>
            <Aviso>{erroExp}</Aviso>
            <div className="linha-botoes">
              <button className="botao botao--forte" onClick={() => void exportar('report.pdf')}>Relatório em PDF</button>
              <button className="botao" onClick={() => void exportar('numeros.csv')}>Números por dia (CSV)</button>
              <button className="botao" onClick={() => void exportar('mural.csv')}>Mural (CSV)</button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
