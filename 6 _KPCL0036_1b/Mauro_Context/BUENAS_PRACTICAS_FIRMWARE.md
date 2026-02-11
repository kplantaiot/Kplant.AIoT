# Buenas Prácticas (Firmware / Bridge / Operación)

**Fecha:** 2026-02-10  
**Alcance:** ESP8266 + ESP32‑CAM + Bridge + Supabase

---

## Firmware / Configuración

- Separar firmwares por tipo de placa en carpetas dedicadas:
  - `c:\Kittypau\firmware-esp8266`
  - `c:\Kittypau\firmware-esp32cam`
- Mantener `DEVICE_ID` actualizado antes de cada flasheo.
- Unificar redes WiFi en `data/wifi.json` para todas las placas.
- Evitar hardcodear SSID en el código; usar `wifi.json` y `/cmd`.
- Crear `wifi.json` automáticamente si no existe (primer arranque).
- Mantener OTA habilitado en el firmware (ArduinoOTA).
- Publicar `device_type`, `wifi_ssid` y `wifi_ip` en STATUS.

---

## Flasheo / OTA

- USB para primer flash; OTA para actualizaciones posteriores.
- Usar el proyecto correcto (evitar `NotPlatformIOProjectError`).
- Checklist antes de flashear: ID correcto, puerto/IP correcto, dispositivo detectado.
- En OTA: misma red WiFi y firewall permitido.

---

## Bridge / Supabase

- No sobrescribir campos con `null` si el firmware no los envía.
- Registrar historial de IP con `ip_history` y `notes`.
- Mantener `device_type` y `wifi_ip` consistentes en `devices`.
- Reiniciar el servicio del bridge tras cada actualización.

---

## Documentación / Control

- Registrar versiones y dispositivos actualizados en:
  `REGISTRO_FIRMWARES.md`.
- Mantener manuales separados por tipo de placa:
  `MANUAL_CARGA_FIRMWARE.md`.
- Actualizar documentación cuando cambia el flujo real (USB/OTA, rutas nuevas, wifi.json).

