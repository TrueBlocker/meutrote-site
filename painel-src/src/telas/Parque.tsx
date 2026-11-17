import { useEffect, useState } from 'react';
import * as api from '../api';
import type { DayHoursRequest, OverrideType, ParkOperationsDto } from '../types';
import { Aviso, dataHora, mensagemDe, useCarregar, useConfirmar } from '../util';

const NOMES = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function Parque() {
  const { dado: s, setDado, erro, carregando } = useCarregar(() => api.painelParque(), []);
  const [dias, setDias] = useState<DayHoursRequest[]>([]);
  const [aviso, setAviso] = useState('');
  const [provisorio, setProvisorio] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const { confirmar, elemento } = useConfirmar();

  const preencher = (d: ParkOperationsDto) => {
    setDias([...d.horarios].sort((a, b) => a.diaSemana - b.diaSemana).map((h) => ({ diaSemana: h.diaSemana, fechado: h.fechado, abre: h.abre, fecha: h.fecha })));
    setAviso(d.aviso?.texto ?? '');
    setProvisorio(d.horariosProvisorios);
  };
  useEffect(() => {
    if (s) preencher(s);
  }, [s]);

  const mudarDia = (i: number, m: Partial<DayHoursRequest>) => setDias((ds) => ds.map((d, k) => (k === i ? { ...d, ...m } : d)));

  const salvar = async () => {
    for (const d of dias) {
      if (!d.fechado && (!d.abre || !d.fecha)) return setFalha(`Preencha abertura e fechamento de ${NOMES[d.diaSemana]} ou marque como fechado.`);
    }
    setOcupado(true);
    setFalha(null);
    setOk(null);
    try {
      const r = await api.salvarParque(
        dias.map((d) => (d.fechado ? { ...d, abre: null, fecha: null } : d)),
        aviso.trim(),
        provisorio,
      );
      setDado(r);
      setOk('Horários e aviso salvos. O app e o site já mostram a mudança.');
    } catch (e) {
      setFalha(mensagemDe(e));
    } finally {
      setOcupado(false);
    }
  };

  const forcar = (tipo: OverrideType) =>
    confirmar(
      tipo === 'FECHADO'
        ? 'Fechar o ALUGUEL de bikes agora? Vale até a próxima abertura prevista do aluguel. O parque continua como está.'
        : 'Abrir o ALUGUEL de bikes agora, fora do horário? Vale até o próximo fechamento previsto (nunca depois do parque fechar).',
      async () => {
        try {
          setDado(await api.excecao(tipo));
          setOk(tipo === 'FECHADO' ? 'Aluguel fechado até a próxima abertura.' : 'Aluguel aberto até o próximo fechamento.');
        } catch (e) {
          setFalha(mensagemDe(e));
        }
      },
      tipo === 'FECHADO',
    );

  const voltarNormal = async () => {
    try {
      setDado(await api.tirarExcecao());
      setOk('O aluguel voltou ao horário normal.');
    } catch (e) {
      setFalha(mensagemDe(e));
    }
  };

  return (
    <>
      <div className="cabeca">
        <div>
          <h1>Parque e bikes</h1>
          <p>O que o app e o site mostram sobre funcionamento, avisos e aluguel de bicicletas. Parque fechado vence tudo.</p>
        </div>
      </div>

      <Aviso>{erro ?? falha}</Aviso>
      <Aviso tipo="ok">{ok}</Aviso>
      {carregando && !s ? <div className="carregando">Carregando…</div> : null}

      {s ? (
        <>
          <div className="grade grade--3">
            <div className="cartao">
              <div className="miudo">Agora, no app</div>
              <div className="numero" style={{ color: s.abertoAgora ? 'var(--verde)' : 'var(--vermelho)' }}>{s.abertoAgora ? 'Aberto' : 'Fechado'}</div>
              <div className="rotulo">{s.textoCombinado}</div>
            </div>
            <div className="cartao">
              <div className="miudo">Aluguel de bikes: exceção ao horário</div>
              {s.painel?.excecao ? (
                <>
                  <p style={{ margin: '6px 0' }}>
                    <b>{s.painel.excecao.tipo === 'FECHADO' ? 'Fechado' : 'Aberto'}</b> até {dataHora(s.painel.excecao.ate)}
                    <span className="miudo"> · por {s.painel.excecao.definidaPor ?? '—'}</span>
                  </p>
                  <button className="botao botao--pequeno" onClick={() => void voltarNormal()}>Voltar ao horário normal</button>
                </>
              ) : (
                <>
                  <p style={{ margin: '6px 0' }}>Seguindo o horário do aluguel.</p>
                  <div className="linha-botoes">
                    <button className="botao botao--pequeno botao--perigo" onClick={() => forcar('FECHADO')}>Fechar aluguel agora</button>
                    <button className="botao botao--pequeno" onClick={() => forcar('ABERTO')}>Abrir aluguel agora</button>
                  </div>
                </>
              )}
            </div>
            <div className="cartao">
              <div className="miudo">Bikes disponíveis</div>
              <p style={{ margin: '6px 0' }}>
                <b>{s.aluguelAberto ? (s.painel?.disponibilidade.valor === 'SEM_BIKES' ? 'Sem bikes agora' : 'Com bikes') : 'Aluguel fechado'}</b>
              </p>
              <div className="rotulo">
                {s.painel?.disponibilidade.observacao ?? ''} {s.painel?.disponibilidade.definidaPor ? `· atualizado por ${s.painel.disponibilidade.definidaPor} em ${dataHora(s.painel.disponibilidade.definidaEm)}` : ''}
              </div>
              <div className="miudo" style={{ marginTop: 6 }}>Quem atualiza é o operador, pelo app.</div>
            </div>
          </div>

          <div className="cartao" style={{ marginTop: 16 }}>
            <h2>Horário de funcionamento do parque</h2>
            <p className="miudo" style={{ margin: '4px 0 12px' }}>Relógio de São Paulo. O oficial da Prefeitura é todos os dias, das 5h30 às 22h.</p>
            <table className="tabela" style={{ maxWidth: 640 }}>
              <thead><tr><th>Dia</th><th>Fechado</th><th>Abre</th><th>Fecha</th></tr></thead>
              <tbody>
                {dias.map((d, i) => (
                  <tr key={d.diaSemana}>
                    <td><b>{NOMES[d.diaSemana]}</b></td>
                    <td><input type="checkbox" checked={d.fechado} onChange={(e) => mudarDia(i, { fechado: e.target.checked })} aria-label={`${NOMES[d.diaSemana]} fechado`} /></td>
                    <td><input className="busca" type="time" disabled={d.fechado} value={d.abre ?? ''} onChange={(e) => mudarDia(i, { abre: e.target.value || null })} aria-label={`Abre ${NOMES[d.diaSemana]}`} /></td>
                    <td><input className="busca" type="time" disabled={d.fechado} value={d.fecha ?? ''} onChange={(e) => mudarDia(i, { fecha: e.target.value || null })} aria-label={`Fecha ${NOMES[d.diaSemana]}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <label className="linha-botoes" style={{ margin: '12px 0' }}>
              <input type="checkbox" checked={provisorio} onChange={(e) => setProvisorio(e.target.checked)} /> Horários ainda provisórios (o app avisa que podem mudar)
            </label>
            <div className="campo" style={{ maxWidth: 640 }}>
              <label htmlFor="av">Aviso geral (aparece no topo do app)</label>
              <input id="av" maxLength={200} value={aviso} onChange={(e) => setAviso(e.target.value)} placeholder="Ex.: Pista em manutenção até sexta. Deixe vazio para não mostrar." />
              <span className="ajuda">{aviso.length}/200</span>
            </div>
            <div className="linha-botoes">
              <button className="botao botao--forte" onClick={() => void salvar()} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar horários e aviso'}</button>
              <button className="botao" onClick={() => s && preencher(s)} disabled={ocupado}>Desfazer</button>
            </div>
          </div>
        </>
      ) : null}
      {elemento}
    </>
  );
}
