/* MeuTrote · site
   Situação do parque na faixa de cima: tenta o servidor do app (que sabe de feriados e avisos)
      e, se ele demorar, mostra a conta pelo horário oficial (todos os dias, 5h30 às 22h).
   Sem cookies, sem rastreadores, sem dados pessoais. */
(function () {
  "use strict";

  var API = "https://meutrote-app-da-comunidade.onrender.com/api/v1/public/park/status";
  var ABRE = 5 * 60 + 30;
  var FECHA = 22 * 60;

  // ── situação do parque ────────────────────────────────────────
  var caixa = document.querySelector("[data-status]");
  var texto = document.querySelector("[data-status-texto]");
  if (!caixa || !texto) return;

  function mostrar(aberto, frase) {
    caixa.setAttribute("data-aberto", aberto ? "true" : "false");
    texto.textContent = frase;
  }

  // hora de agora no relógio de São Paulo, seja qual for o fuso de quem abre o site
  function minutosEmSaoPaulo() {
    try {
      var partes = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
      }).formatToParts(new Date());
      var h = 0, m = 0;
      partes.forEach(function (p) {
        if (p.type === "hour") h = parseInt(p.value, 10);
        if (p.type === "minute") m = parseInt(p.value, 10);
      });
      return h * 60 + m;
    } catch (e) {
      return null;
    }
  }

  function pelaAgenda() {
    var agora = minutosEmSaoPaulo();
    if (agora == null) return;
    if (agora >= ABRE && agora < FECHA) mostrar(true, "Aberto agora · fecha às 22h");
    else mostrar(false, "Fechado agora · abre às 5h30");
  }

  pelaAgenda();

  // o servidor gratuito pode estar "dormindo": espera no máximo 12 s e não insiste
  if (!window.fetch) return;
  var controle = "AbortController" in window ? new AbortController() : null;
  var limite = setTimeout(function () { if (controle) controle.abort(); }, 12000);
  fetch(API, { signal: controle ? controle.signal : undefined, credentials: "omit", cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (s) {
      if (!s || typeof s.abertoAgora !== "boolean") return;
      var frase = typeof s.textoCombinado === "string" && s.textoCombinado.length < 90
        ? s.textoCombinado
        : (s.abertoAgora ? "Aberto agora" : "Fechado agora");
      mostrar(s.abertoAgora, frase);
    })
    .catch(function () { /* fica a conta pela agenda */ })
    .then(function () { clearTimeout(limite); });
})();
