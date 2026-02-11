# Manual de Carga de Firmware (ESP8266 / ESP32-CAM)

**Ruta de documentos:** `c:\Kittypau\6 _KPCL0036_1b\Mauro_Context`  
**Version manual:** 2026-02-10

---

## 1) Estructura de proyectos (firmware activos)

- **ESP8266 (NodeMCU v2):** `c:\Kittypau\firmware-esp8266`
- **ESP32-CAM (AI-Thinker):** `c:\Kittypau\firmware-esp32cam`

Cada carpeta es un proyecto PlatformIO completo con su propio `platformio.ini`, `include/config.h` y `src/`.

---

## 2) Configuracion previa (ambas placas)

1. **Definir DEVICE_ID**  
   Editar `include/config.h` en el firmware correspondiente.

2. **WiFi conocidas**  
   Archivo unificado `data/wifi.json` (si no existe, se crea al boot en ESP8266).

3. **Puerto / IP**  
   - USB: usar `COMx`
   - OTA: usar IP del dispositivo en la misma red WiFi

---

## 3) ESP8266 (NodeMCU v2)

### 3.1 Carga por USB (primera vez o cuando no hay OTA)

```powershell
cd c:\Kittypau\firmware-esp8266
pio run -e nodemcuv2 -t upload --upload-port COM7
```

### 3.2 Carga por OTA

1. Asegurar misma WiFi que el dispositivo.  
2. Conocer IP del ESP8266.  

```powershell
cd c:\Kittypau\firmware-esp8266
pio run -e ota -t upload
```

> El IP OTA se configura en `platformio.ini` (env:ota) si se desea fijo.

### 3.3 Subir filesystem (wifi.json / calibration)

```powershell
cd c:\Kittypau\firmware-esp8266
pio run -e nodemcuv2 -t uploadfs --upload-port COM7
```

---

## 4) ESP32-CAM (AI-Thinker)

### 4.1 Carga por USB (obligatoria la primera vez)

```powershell
cd c:\Kittypau\firmware-esp32cam
pio run -e esp32cam -t upload --upload-port COM8
```

### 4.2 Carga por OTA (despues del primer USB)

1. Asegurar misma WiFi que el dispositivo.  
2. Conocer IP del ESP32-CAM.  

```powershell
cd c:\Kittypau\firmware-esp32cam
pio run -e ota -t upload
```

---

## 5) Checklist rapido (antes de cargar)

- [ ] `DEVICE_ID` correcto en `include/config.h`
- [ ] Puerto COM correcto o IP correcta
- [ ] Placa encendida y detectada por el sistema
- [ ] (OTA) PC y dispositivo en la misma red

---

## 6) Registro de firmware

Actualizar siempre:  
`c:\Kittypau\6 _KPCL0036_1b\Mauro_Context\REGISTRO_FIRMWARES.md`

---

## 7) Errores comunes

- **NotPlatformIOProjectError**  
  Estabas en la carpeta incorrecta. Usa `c:\Kittypau\firmware-esp8266` o `c:\Kittypau\firmware-esp32cam`.

- **COM incorrecto**  
  Cambiar `--upload-port COMx`.

- **OTA falla**  
  Verificar firewall y que el firmware tenga ArduinoOTA habilitado.

