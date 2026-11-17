import { useState } from 'react';
import * as api from '../api';
import { suportaChave, usarChave } from '../chave';
import type { SecondFactor } from '../types';
import { Aviso, mensagemDe } from '../util';
import cavalo from '../assets/trotador-creme.svg';

/**
 * Entrada no painel, sempre em duas etapas:
 * 1) usuário e senha;
 * 2) chave de acesso (rosto, digital ou PIN do computador) OU o código de 6 dígitos do app autenticador.
 */
export function Entrar({ aoEntrar }: { aoEntrar: () => void }) {
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [desafio, setDesafio] = useState('');
  const [metodos, setMetodos] = useState<SecondFactor[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const passo1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      const r = await api.entrarSenha(usuario.trim(), senha);
      setSenha('');
      setDesafio(r.challenge);
      setMetodos(r.methods);
      setEtapa(2);
      // com chave cadastrada, já chama o rosto/digital/PIN direto
      if (r.methods.includes('PASSKEY') && suportaChave()) void comChave(r.challenge);
    } catch (e2) {
      setErro(mensagemDe(e2));
    } finally {
      setOcupado(false);
    }
  };

  const comChave = async (ch = desafio) => {
    setErro(null);
    setOcupado(true);
    try {
      const o = await api.opcoesChave(ch);
      const credencial = await usarChave(o.options);
      await api.entrarChave(ch, o.requestId, credencial);
      aoEntrar();
    } catch (e2) {
      setErro(mensagemDe(e2));
    } finally {
      setOcupado(false);
    }
  };

  const comCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      await api.entrarCodigo(desafio, codigo);
      aoEntrar();
    } catch (e2) {
      setErro(mensagemDe(e2));
      setCodigo('');
    } finally {
      setOcupado(false);
    }
  };

  const voltar = () => {
    setEtapa(1);
    setDesafio('');
    setCodigo('');
    setErro(null);
  };

  return (
    <div className="entrada">
      <div className="entrada__lado">
        <div className="lateral__marca" style={{ padding: 0 }}>
          <img src={cavalo} alt="" width={36} height={36} />
          <span>MeuTrote <small>Painel de administração</small></span>
        </div>
        <div>
          <h1>Cuidar do parque, com calma e de perto.</h1>
          <p>Área restrita à administração do Parque do Trote. Toda entrada e toda alteração ficam registradas.</p>
        </div>
        <p className="miudo" style={{ color: 'rgba(255,247,234,.6)' }}>Use só em computador de confiança e saia ao terminar.</p>
        <img className="entrada__cavalo" src={cavalo} alt="" />
      </div>

      <div className="entrada__form">
        <div className="entrada__caixa">
          <div className="passos" aria-hidden="true">
            <span className="feito" />
            <span className={etapa === 2 ? 'feito' : ''} />
          </div>

          {etapa === 1 ? (
            <form onSubmit={passo1}>
              <h2>Entrar</h2>
              <p>Etapa 1 de 2: usuário e senha.</p>
              <Aviso>{erro}</Aviso>
              <div className="campo">
                <label htmlFor="u">Usuário</label>
                <input id="u" autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} required autoFocus />
              </div>
              <div className="campo">
                <label htmlFor="s">Senha</label>
                <input id="s" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
              </div>
              <button className="botao botao--forte botao--grande" disabled={ocupado || !usuario || !senha}>
                {ocupado ? 'Conferindo…' : 'Continuar'}
              </button>
            </form>
          ) : (
            <div>
              <h2>Confirme que é você</h2>
              <p>Etapa 2 de 2.</p>
              <Aviso>{erro}</Aviso>

              {metodos.includes('PASSKEY') ? (
                <>
                  <button className="botao botao--verde botao--grande" onClick={() => void comChave()} disabled={ocupado || !suportaChave()}>
                    {ocupado ? 'Aguardando o aparelho…' : 'Usar chave de acesso'}
                  </button>
                  <p className="miudo" style={{ marginTop: 8 }}>
                    O computador vai pedir o rosto, a digital ou o PIN. {suportaChave() ? '' : 'Este navegador não tem suporte a chaves de acesso.'}
                  </p>
                </>
              ) : null}

              {metodos.includes('PASSKEY') && metodos.includes('TOTP') ? <div className="ou">ou</div> : null}

              {metodos.includes('TOTP') ? (
                <form onSubmit={comCodigo}>
                  <div className="campo">
                    <label htmlFor="c">Código do app autenticador</label>
                    <input
                      id="c"
                      className="codigo"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value.replace(/[^0-9A-Za-z-]/g, '').slice(0, 9))}
                      placeholder="000000"
                      autoFocus={!metodos.includes('PASSKEY')}
                    />
                    <span className="ajuda">Ou um código de recuperação (XXXX-XXXX).</span>
                  </div>
                  <button className="botao botao--forte botao--grande" disabled={ocupado || codigo.length < 6}>
                    Entrar
                  </button>
                </form>
              ) : null}

              <p style={{ marginTop: 18 }}>
                <button className="botao botao--pequeno" onClick={voltar}>Voltar</button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
