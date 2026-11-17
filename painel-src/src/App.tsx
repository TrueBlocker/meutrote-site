import { useEffect, useState } from 'react';
import * as api from './api';
import type { WebMe } from './types';
import { Entrar } from './telas/Entrar';
import { Visao } from './telas/Visao';
import { Pessoas } from './telas/Pessoas';
import { Mural } from './telas/Mural';
import { Eventos } from './telas/Eventos';
import { Parque } from './telas/Parque';
import { Seguranca } from './telas/Seguranca';
import cavalo from './assets/trotador-creme.svg';

type Tela = 'visao' | 'pessoas' | 'mural' | 'eventos' | 'parque' | 'seguranca';

const TELAS: { id: Tela; nome: string; icone: string }[] = [
  { id: 'visao', nome: 'Visão geral', icone: '◧' },
  { id: 'mural', nome: 'Mural', icone: '✎' },
  { id: 'pessoas', nome: 'Pessoas', icone: '☺' },
  { id: 'eventos', nome: 'Eventos', icone: '◷' },
  { id: 'parque', nome: 'Parque e bikes', icone: '⌂' },
  { id: 'seguranca', nome: 'Segurança', icone: '⚿' },
];

function telaDoEndereco(): Tela {
  const h = location.hash.replace('#', '') as Tela;
  return TELAS.some((t) => t.id === h) ? h : 'visao';
}

export function App() {
  const [estado, setEstado] = useState<'abrindo' | 'fora' | 'dentro'>('abrindo');
  const [eu, setEu] = useState<WebMe | null>(null);
  const [tela, setTela] = useState<Tela>(telaDoEndereco);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregarEu = async () => {
    try {
      setEu(await api.eu());
      setEstado('dentro');
    } catch {
      setEstado('fora');
    }
  };

  useEffect(() => {
    api.quandoSessaoAcabar(() => {
      setAviso('Sua sessão acabou. Entre de novo.');
      setEu(null);
      setEstado('fora');
    });
    void (async () => ((await api.retomar()) ? carregarEu() : setEstado('fora')))();
    const h = () => setTela(telaDoEndereco());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  // renova o acesso de 15 min enquanto a pessoa estiver usando; parado 30 min, a sessão acaba sozinha no servidor
  useEffect(() => {
    if (estado !== 'dentro') return;
    let ativo = Date.now();
    const marca = () => (ativo = Date.now());
    const eventos = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    eventos.forEach((e) => window.addEventListener(e, marca, { passive: true }));
    const id = window.setInterval(() => {
      if (Date.now() - ativo < 12 * 60_000) void api.renovar();
    }, 12 * 60_000);
    return () => {
      window.clearInterval(id);
      eventos.forEach((e) => window.removeEventListener(e, marca));
    };
  }, [estado]);

  const ir = (t: Tela) => {
    location.hash = t;
    setTela(t);
  };

  const sair = async () => {
    await api.sair();
    setEu(null);
    setAviso(null);
    setEstado('fora');
  };

  if (estado === 'abrindo') return <div className="carregando">Abrindo o painel…</div>;
  if (estado === 'fora' || !eu) {
    return (
      <>
        {aviso ? <div className="aviso aviso--info" style={{ margin: 0, borderRadius: 0 }}>{aviso}</div> : null}
        <Entrar aoEntrar={() => void carregarEu()} />
      </>
    );
  }

  return (
    <div className="casca">
      <aside className="lateral">
        <div className="lateral__marca">
          <img src={cavalo} alt="" />
          <span>MeuTrote <small>Painel</small></span>
        </div>
        <nav aria-label="Seções do painel">
          {TELAS.map((t) => (
            <button key={t.id} onClick={() => ir(t.id)} aria-current={tela === t.id ? 'page' : undefined}>
              <span aria-hidden="true">{t.icone}</span> {t.nome}
              {t.id === 'seguranca' && eu.passkeys === 0 ? <span className="contador" title="Cadastre uma chave de acesso">!</span> : null}
            </button>
          ))}
        </nav>
        <div className="lateral__pe">
          <div>{eu.username}</div>
          <button onClick={() => void sair()}>Sair</button>
        </div>
      </aside>
      <main className="principal">
        {tela === 'visao' && <Visao />}
        {tela === 'mural' && <Mural />}
        {tela === 'pessoas' && <Pessoas eu={eu} />}
        {tela === 'eventos' && <Eventos />}
        {tela === 'parque' && <Parque />}
        {tela === 'seguranca' && <Seguranca eu={eu} aoMudar={() => void carregarEu()} aoEncerrarTudo={() => void sair()} />}
      </main>
    </div>
  );
}
