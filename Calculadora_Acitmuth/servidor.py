#!/usr/bin/env python3
"""
Servidor local para previsualizar la Calculadora de Acimut Solar.

Importante:
- Abrir `acimut_solar.html` directamente ya permite trabajar sin red usando
  coordenadas manuales.
- Este servidor sirve para probar la app desde otro dispositivo en la misma red.
- El GPS en móviles modernos normalmente requiere HTTPS. Por tanto, abrir la app
  por `http://192.168.x.x:8080` NO es una solución fiable para geolocalización.
- Para tener GPS + instalación + caché offline, publica la carpeta en GitHub
  Pages o en cualquier hosting HTTPS.

Para cerrar el servidor: Ctrl+C
"""

import http.server
import socket
import os
import sys

PORT = 8080

def get_local_ip():
    """Obtiene la IP local de la máquina en la red WiFi."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    # Cambiar al directorio del script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    ip = get_local_ip()

    print("=" * 50)
    print("  CALCULADORA DE ACIMUT SOLAR")
    print("  Previsualizacion local iniciada")
    print("=" * 50)
    print()
    print(f"  Abre en otro dispositivo de la misma WiFi:")
    print(f"  >>> http://{ip}:{PORT}/acimut_solar.html <<<")
    print()
    print(f"  O desde este equipo:")
    print(f"  >>> http://localhost:{PORT}/acimut_solar.html <<<")
    print()
    print("  Nota:")
    print("  - Esta vista sirve para probar la interfaz y los calculos.")
    print("  - Para GPS en movil, usa una version publicada por HTTPS.")
    print()
    print("  Ctrl+C para cerrar")
    print("=" * 50)

    handler = http.server.SimpleHTTPRequestHandler
    httpd = http.server.HTTPServer(("0.0.0.0", PORT), handler)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor cerrado.")
        httpd.server_close()
