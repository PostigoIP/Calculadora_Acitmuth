# Acimut Solar

Calculadora estática para móvil del acimut solar por método de alturas.

## Uso rápido

1. Abre [`acimut_solar.html`](./acimut_solar.html) directamente en el móvil o en el ordenador.
2. Si la abres como archivo local, funciona sin red y sin servidor, usando coordenadas manuales.
3. Si publicas esta misma carpeta en GitHub Pages o en cualquier hosting HTTPS, además se activa el GPS y la app se puede instalar en la pantalla de inicio.

## Qué cambia según el modo de apertura

- `file://`
  La calculadora funciona, guarda los últimos datos en el navegador y no depende de PC ni servidor.
- `https://`
  El navegador ya permite geolocalización, registro del service worker y uso offline tras la primera carga.

## Publicarla gratis en GitHub Pages

1. Sube esta carpeta a un repositorio.
2. En GitHub, entra en `Settings > Pages`.
3. Activa la publicación desde la rama principal.
4. Abre la URL pública en el móvil una vez con conexión.
5. Si el navegador lo ofrece, instala la app en la pantalla de inicio.

## Archivos principales

- `acimut_solar.html`
  Interfaz móvil principal.
- `app.js`
  Lógica de cálculo, GPS, persistencia local e instalación PWA.
- `manifest.webmanifest`
  Metadatos de instalación.
- `sw.js`
  Caché offline de la app.
- `acimut_core.py`
  Motor de referencia para pruebas numéricas.
- `tests/test_acimut_core.py`
  Verificación básica de fórmulas y caso de referencia.
