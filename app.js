const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const GON_TO_DEG = 360 / 400;
const DEG_TO_GON = 400 / 360;
const STORAGE_KEY = "acimut-solar-form";
const PERSISTED_FIELDS = [
  "latitud",
  "latHem",
  "longitud",
  "lonHem",
  "lecturaV",
  "lecturaHzSol",
  "lecturaHzRef",
  "tipoVertical",
  "presion",
  "temperatura"
];

let deferredInstallPrompt = null;

function $(id) {
  return document.getElementById(id);
}

function degToRad(value) { return value * DEG; }
function radToDeg(value) { return value * RAD; }
function gonToDeg(value) { return value * GON_TO_DEG; }
function degToGon(value) { return value * DEG_TO_GON; }

function normGon(value) {
  value = value % 400;
  if (value < 0) value += 400;
  return value;
}

function formatGon(value) {
  return normGon(value).toFixed(4);
}

function formatDeg(value) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  return `${sign}${deg}° ${String(min).padStart(2, "0")}' ${String(sec).padStart(4, "0")}"`;
}

function julianDay(year, month, day, hour) {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day + hour / 24 + b - 1524.5;
}

function solarPosition(year, month, day, hourUTC) {
  const jd = julianDay(year, month, day, hourUTC);
  const t = (jd - 2451545.0) / 36525;

  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const m = (357.52911 + t * (35999.05029 - t * 0.0001537)) % 360;
  const mRad = degToRad(m);

  const c = (1.914602 - t * (0.004817 + t * 0.000014)) * Math.sin(mRad) +
    (0.019993 - t * 0.000101) * Math.sin(2 * mRad) +
    0.000289 * Math.sin(3 * mRad);

  const sunLon = l0 + c;
  const epsilon = 23.439291 - t * (0.0130042 + t * (0.00000016 - t * 0.000000504));
  const sunLonRad = degToRad(sunLon);
  const epsRad = degToRad(epsilon);
  const declination = Math.asin(Math.sin(epsRad) * Math.sin(sunLonRad));

  const l0Rad = degToRad(l0);
  const y = Math.tan(epsRad / 2);
  const y2 = y * y;
  const eotRad = y2 * Math.sin(2 * l0Rad) -
    2 * 0.016709 * Math.sin(mRad) +
    4 * 0.016709 * y2 * Math.sin(mRad) * Math.cos(2 * l0Rad) -
    0.5 * y2 * y2 * Math.sin(4 * l0Rad) -
    1.25 * 0.016709 * 0.016709 * Math.sin(2 * mRad);

  return {
    declination: radToDeg(declination),
    eotMinutes: radToDeg(eotRad) * 4
  };
}

function refractionBennett(altDeg, pressHPa, tempC) {
  if (altDeg <= 0) return 0;
  const refractionMinutes = 1.0 / Math.tan(degToRad(altDeg + 7.31 / (altDeg + 4.4)));
  return (refractionMinutes * (pressHPa / 1010) * (283 / (273 + tempC))) / 60;
}

function paralajeSolar(altDeg) {
  return (8.794 / 3600) * Math.cos(degToRad(altDeg));
}

function acimutSolar(latDeg, declDeg, altVerdDeg) {
  const phi = degToRad(latDeg);
  const delta = degToRad(declDeg);
  const h = degToRad(altVerdDeg);
  const cosAz = (Math.sin(delta) - Math.sin(phi) * Math.sin(h)) /
    (Math.cos(phi) * Math.cos(h));
  const clamped = Math.max(-1, Math.min(1, cosAz));
  return radToDeg(Math.acos(clamped));
}

function anguloHorario(hourUTC, eotMin, lonDeg) {
  const solarTimeMin = hourUTC * 60 + eotMin + lonDeg * 4;
  return (solarTimeMin / 60 - 12) * 15;
}

function autoFillDateTime() {
  const now = new Date();
  $("fecha").value = now.toISOString().slice(0, 10);
  $("horaH").value = now.getUTCHours();
  $("horaM").value = now.getUTCMinutes();
  $("horaS").value = now.getUTCSeconds();
}

function savePersistentState() {
  try {
    const data = {};
    PERSISTED_FIELDS.forEach((field) => {
      data[field] = $(field).value;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("No se pudo guardar el estado local.", error);
  }
}

function restorePersistentState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    PERSISTED_FIELDS.forEach((field) => {
      if (typeof data[field] === "string") {
        $(field).value = data[field];
      }
    });
  } catch (error) {
    console.warn("No se pudo restaurar el estado local.", error);
  }
}

function registerPersistence() {
  PERSISTED_FIELDS.forEach((field) => {
    $(field).addEventListener("input", savePersistentState);
    $(field).addEventListener("change", savePersistentState);
  });
}

function showError(message) {
  const element = $("errorMsg");
  element.textContent = message;
  element.classList.add("visible");
}

function hideError() {
  $("errorMsg").classList.remove("visible");
}

function setGpsStatus(kind, message) {
  const status = $("gpsStatus");
  const text = $("gpsText");
  status.style.display = "flex";
  status.className = `gps-status ${kind}`;
  text.textContent = message;
}

function canUseGps() {
  return Boolean(navigator.geolocation) && window.location.protocol !== "file:" && window.isSecureContext;
}

function updateGpsUiForMode() {
  const button = $("gpsBtn");
  const buttonText = $("gpsBtnText");

  if (canUseGps()) {
    button.disabled = false;
    buttonText.textContent = "Obtener mi ubicación";
    $("gpsStatus").style.display = "none";
    return;
  }

  button.disabled = true;
  button.classList.remove("loading", "success");

  if (!navigator.geolocation) {
    buttonText.textContent = "GPS no disponible";
    setGpsStatus("error", "Este navegador no ofrece geolocalización. Introduce las coordenadas manualmente.");
    return;
  }

  if (window.location.protocol === "file:") {
    buttonText.textContent = "GPS requiere HTTPS";
    setGpsStatus("error", "Has abierto la app como archivo local. Así funciona sin red, pero el GPS queda bloqueado por el navegador.");
    return;
  }

  buttonText.textContent = "GPS requiere web segura";
  setGpsStatus("error", "El GPS solo funciona cuando esta misma app se sirve por HTTPS. Puedes publicarla en GitHub Pages.");
}

function updateModeCard() {
  const modeText = $("appModeText");
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  if (window.location.protocol === "file:") {
    modeText.innerHTML = "<strong>Modo archivo local.</strong> Esta versión ya sirve para trabajar en el móvil sin servidor ni PC, usando coordenadas manuales. Si la publicas en GitHub Pages, ganarás GPS, instalación y caché offline tras la primera visita.";
    return;
  }

  if (!window.isSecureContext) {
    modeText.innerHTML = "<strong>Modo web no segura.</strong> La calculadora sigue funcionando con coordenadas manuales, pero el GPS quedará desactivado hasta abrirla desde HTTPS.";
    return;
  }

  if (standalone) {
    modeText.innerHTML = "<strong>App instalada.</strong> Ya puedes usar esta calculadora como una app del móvil. El GPS está disponible y los archivos quedan cacheados para seguir trabajando sin conexión después de la primera carga.";
    return;
  }

  modeText.innerHTML = "<strong>Modo web segura.</strong> El GPS ya puede funcionar. Si tu navegador lo permite, también puedes instalar esta calculadora en la pantalla de inicio para usarla como app.";
}

function requestGPS() {
  if (!navigator.geolocation) {
    setGpsStatus("error", "Tu navegador no soporta GPS. Escribe las coordenadas manualmente.");
    return;
  }

  if (!canUseGps()) {
    updateGpsUiForMode();
    return;
  }

  const button = $("gpsBtn");
  const buttonText = $("gpsBtnText");
  button.classList.add("loading");
  button.classList.remove("success");
  buttonText.textContent = "Buscando señal GPS...";
  setGpsStatus("loading", "Esperando permiso del navegador...");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      $("latitud").value = Math.abs(lat).toFixed(6);
      $("latHem").value = lat >= 0 ? "N" : "S";
      $("longitud").value = Math.abs(lon).toFixed(6);
      $("lonHem").value = lon >= 0 ? "E" : "W";
      savePersistentState();

      let statusText = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`;
      if (position.coords.accuracy) {
        statusText += ` (±${Math.round(position.coords.accuracy)} m)`;
      }

      button.classList.remove("loading");
      button.classList.add("success");
      buttonText.textContent = "Ubicación obtenida";
      setGpsStatus("success", statusText);
    },
    (error) => {
      button.classList.remove("loading");
      buttonText.textContent = "Reintentar ubicación";

      if (error.code === 1) {
        setGpsStatus("error", "Permiso denegado. Activa la ubicación del navegador o introduce las coordenadas a mano.");
      } else if (error.code === 2) {
        setGpsStatus("error", "No se pudo obtener la ubicación. Comprueba que el GPS del dispositivo está activo.");
      } else {
        setGpsStatus("error", "Tiempo de espera agotado. Inténtalo de nuevo o introduce las coordenadas manualmente.");
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

function toggleAdvanced() {
  const toggle = document.querySelector(".advanced-toggle");
  const content = $("advancedContent");
  toggle.classList.toggle("open");
  content.classList.toggle("visible");
}

function getQuadrantLabel(azGon) {
  if (azGon >= 0 && azGon < 50) return "N - NE";
  if (azGon >= 50 && azGon < 100) return "NE - E";
  if (azGon >= 100 && azGon < 150) return "E - SE";
  if (azGon >= 150 && azGon < 200) return "SE - S";
  if (azGon >= 200 && azGon < 250) return "S - SW";
  if (azGon >= 250 && azGon < 300) return "SW - W";
  if (azGon >= 300 && azGon < 350) return "W - NW";
  return "NW - N";
}

function calcular() {
  hideError();

  const fechaStr = $("fecha").value;
  if (!fechaStr) {
    showError("Introduce la fecha.");
    return;
  }

  const [yearStr, monthStr, dayStr] = fechaStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const hh = parseFloat($("horaH").value);
  const mm = parseFloat($("horaM").value);
  const ss = parseFloat($("horaS").value) || 0;
  if (Number.isNaN(hh) || Number.isNaN(mm)) {
    showError("Introduce la hora UTC.");
    return;
  }

  let lat = parseFloat($("latitud").value);
  if (Number.isNaN(lat)) {
    showError("Introduce la latitud.");
    return;
  }
  if ($("latHem").value === "S") lat = -lat;

  let lon = parseFloat($("longitud").value);
  if (Number.isNaN(lon)) lon = 0;
  if ($("lonHem").value === "W") lon = -lon;

  const lecturaV = parseFloat($("lecturaV").value);
  const lecturaHzSol = parseFloat($("lecturaHzSol").value);
  const lecturaHzRef = parseFloat($("lecturaHzRef").value);
  if (Number.isNaN(lecturaV)) {
    showError("Introduce la lectura vertical al sol.");
    return;
  }
  if (Number.isNaN(lecturaHzSol)) {
    showError("Introduce la lectura Hz al sol.");
    return;
  }
  if (Number.isNaN(lecturaHzRef)) {
    showError("Introduce la lectura Hz a la referencia.");
    return;
  }

  const tipoVertical = $("tipoVertical").value;
  const presion = parseFloat($("presion").value) || 1013;
  const temperatura = parseFloat($("temperatura").value) || 20;
  const hourUTC = hh + mm / 60 + ss / 3600;

  let altObsDeg;
  if (tipoVertical === "cenital") {
    altObsDeg = gonToDeg(100 - lecturaV);
  } else {
    altObsDeg = gonToDeg(lecturaV);
  }

  if (altObsDeg <= 0 || altObsDeg > 89) {
    showError(`Altura observada fuera de rango válido (${altObsDeg.toFixed(2)}°). Verifica la lectura vertical y el tipo de ángulo.`);
    return;
  }

  const solar = solarPosition(year, month, day, hourUTC);
  const refr = refractionBennett(altObsDeg, presion, temperatura);
  const par = paralajeSolar(altObsDeg);
  const altVerdDeg = altObsDeg - refr + par;

  let azSolDeg = acimutSolar(lat, solar.declination, altVerdDeg);
  const horario = anguloHorario(hourUTC, solar.eotMinutes, lon);
  if (horario > 0) {
    azSolDeg = 360 - azSolDeg;
  }

  const azSolGon = degToGon(azSolDeg);
  const diffHz = lecturaHzSol - lecturaHzRef;
  const azRefGon = normGon(azSolGon - diffHz);

  $("azRef").textContent = formatGon(azRefGon);
  $("azSol").textContent = formatGon(azSolGon);
  $("decl").textContent = formatDeg(solar.declination);
  $("eot").textContent = `${solar.eotMinutes.toFixed(2)} min`;
  $("altObs").textContent = formatDeg(altObsDeg);
  $("corrRefr").textContent = `-${(refr * 60).toFixed(2)}'`;
  $("corrPar").textContent = `+${(par * 3600).toFixed(1)}"`;
  $("altVerd").textContent = formatDeg(altVerdDeg);
  $("angHor").textContent = `${formatDeg(horario)} ${horario < 0 ? "(E)" : "(W)"}`;
  $("diffHz").textContent = `${diffHz.toFixed(4)} gon`;
  $("quadrant").textContent = getQuadrantLabel(azRefGon);
  $("results").classList.add("visible");
  savePersistentState();
  $("results").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:") {
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.warn("No se pudo registrar el service worker.", error);
  }
}

function setupInstallPrompt() {
  const installButton = $("installBtn");

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      updateModeCard();
      return;
    }

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.hidden = true;
    updateModeCard();
  });

  window.addEventListener("appinstalled", () => {
    installButton.hidden = true;
    updateModeCard();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  autoFillDateTime();
  restorePersistentState();
  registerPersistence();
  updateModeCard();
  updateGpsUiForMode();
  setupInstallPrompt();
  registerServiceWorker();
});

window.autoFillDateTime = autoFillDateTime;
window.requestGPS = requestGPS;
window.toggleAdvanced = toggleAdvanced;
window.calcular = calcular;
