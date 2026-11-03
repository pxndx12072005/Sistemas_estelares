/*
 * Reemplazo local del SDK de Google Playground.
 *
 * Fuera de Playground no existen las cuentas, la tabla de clasificación global
 * ni el resto de servicios de la plataforma. El juego carga el SDK solo si
 * window.PlaygroundSDK no existe, así que al definirlo aquí el juego usa esta
 * versión: no hace llamadas a Google y guarda los récords en el dispositivo.
 */
(function () {
  var KEY_BEST = 'sistemas-estelares:mejor-puntaje';
  var KEY_LAST = 'sistemas-estelares:ultimo-puntaje';

  function leer(clave) {
    try {
      return Number(window.localStorage.getItem(clave)) || 0;
    } catch (e) {
      return 0;
    }
  }

  function guardar(clave, valor) {
    try {
      window.localStorage.setItem(clave, String(valor));
    } catch (e) {
      /* almacenamiento no disponible: se ignora */
    }
  }

  var puntajeActual = 0;

  function registrarFinDePartida() {
    guardar(KEY_LAST, puntajeActual);
    if (puntajeActual > leer(KEY_BEST)) {
      guardar(KEY_BEST, puntajeActual);
    }
  }

  function fila(etiqueta, valor) {
    var row = document.createElement('div');
    row.className = 'records-row';
    var label = document.createElement('span');
    label.textContent = etiqueta;
    var value = document.createElement('strong');
    value.textContent = String(valor);
    row.appendChild(label);
    row.appendChild(value);
    return row;
  }

  function mostrarRecords() {
    if (document.getElementById('records-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'records-overlay';
    overlay.className = 'records-overlay';

    var card = document.createElement('div');
    card.className = 'records-card';

    var title = document.createElement('h2');
    title.className = 'records-title';
    title.textContent = '🏆 RÉCORDS';

    var subtitle = document.createElement('p');
    subtitle.className = 'records-subtitle';
    subtitle.textContent = 'Guardados en este dispositivo';

    var close = document.createElement('button');
    close.className = 'records-close';
    close.type = 'button';
    close.textContent = 'CERRAR';
    close.addEventListener('click', function () {
      overlay.remove();
    });

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(fila('Mejor puntaje', Math.max(leer(KEY_BEST), puntajeActual)));
    card.appendChild(fila('Última partida', leer(KEY_LAST)));
    card.appendChild(close);
    overlay.appendChild(card);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  function PlaygroundSDKLocal() {}

  PlaygroundSDKLocal.prototype.init = function () {
    return Promise.resolve();
  };
  PlaygroundSDKLocal.prototype.startGame = function () {
    puntajeActual = 0;
  };
  PlaygroundSDKLocal.prototype.scoreUpdated = function (datos) {
    puntajeActual = Number(datos && datos.value) || 0;
  };
  PlaygroundSDKLocal.prototype.levelComplete = function () {
    registrarFinDePartida();
  };
  PlaygroundSDKLocal.prototype.gameOver = function () {
    registrarFinDePartida();
  };
  PlaygroundSDKLocal.prototype.pauseStateChanged = function () {};
  PlaygroundSDKLocal.prototype.sendGameEvent = function () {};
  PlaygroundSDKLocal.prototype.showLeaderboard = function () {
    mostrarRecords();
  };

  window.PlaygroundSDK = PlaygroundSDKLocal;
})();
