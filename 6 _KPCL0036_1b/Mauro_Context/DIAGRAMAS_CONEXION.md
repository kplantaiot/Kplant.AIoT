# Diagramas de Conexión — Firmware IoT Kittypau
> Generado: 2026-02-20

---

## 1. ESP8266 — NodeMCU v3 CP2102 (KPCL0038)

### Diagrama de cableado físico

```
                         ╔═════════════════════════════╗
                         ║     NodeMCU v3 · ESP8266    ║
                         ║         KPCL0038            ║
  GND ───────────────────╢ GND                    3V3  ╟──┬──────────────┬───────────────┐
                         ║                             ║  │              │               │
                         ║                       [USB] ║  │              │               │
                         ║                             ║  │VCC           │VCC            │VCC
  LDR ──────────────────╢ A0                     RST  ║  │              │               │
  (divisor tensión)      ║                             ║ ┌┴──────┐  ┌───┴────┐  ┌───────┴──┐
                         ║                      GPIO5  ║ │ DHT11 │  │ HX711  │  │   LDR    │
  DHT11 DATA ───────────╢ D5 · GPIO14           GPIO4  ║ │       │  │        │  │          │
  (+ 10kΩ → 3V3)         ║                             ║ │ DATA  ╟──╢ D5     │  │  Pin 1 ──┼─ 3V3
                         ║                      GPIO0  ║ │       │  │        │  │  Pin 2 ──┼─ A0
  HX711 DT ─────────────╢ D6 · GPIO12                  ║ │ GND   ╟──╢ GND    │  │[10kΩ]──┼─ GND
                         ║                      GPIO2  ╟──── LED integrado    │  └──────────┘
  HX711 SCK ────────────╢ D7 · GPIO13           (D4)   ║     (lógica inversa) │
                         ║                             ║  │ VCC  ──────────────┘
                         ║                       GPIO1 ╟─ TX    │ GND ── GND
  GND ───────────────────╢ GND                    VIN  ╟─ 5V    │ DT  ── D6·GPIO12
                         ╚═════════════════════════════╝  │ SCK ── D7·GPIO13
                                                          └────────┘
     ┌──────────────────────────────────────────┐
     │          Celda de Carga (Load Cell)      │
     │                                          │
     │  Rojo   ── E+ ─┐                         │
     │  Negro  ── E- ─┤  HX711 (módulo)         │
     │  Verde  ── A+ ─┤  VCC ── 3V3             │
     │  Blanco ── A- ─┘  GND ── GND             │
     │                   DT  ── D6 (GPIO12)     │
     │                   SCK ── D7 (GPIO13)     │
     └──────────────────────────────────────────┘

     ┌──────────────────────────────────────────┐
     │          LDR — Divisor de Tensión        │
     │                                          │
     │   3V3 ────── [  LDR  ] ────┬──── A0     │
     │                            │             │
     │                         [ 10kΩ ]        │
     │                            │             │
     │                           GND            │
     └──────────────────────────────────────────┘
```

### Tabla de pines — ESP8266

| Pin placa | GPIO    | Periférico       | Señal         | Notas                    |
|-----------|---------|------------------|---------------|--------------------------|
| A0        | ADC     | LDR              | Analógica     | Divisor tensión 10kΩ/GND |
| D4        | GPIO2   | LED integrado    | Digital OUT   | Lógica invertida         |
| D5        | GPIO14  | DHT11 DATA       | Digital I/O   | Pull-up 10kΩ a 3V3       |
| D6        | GPIO12  | HX711 DT (DOUT)  | Digital IN    | —                        |
| D7        | GPIO13  | HX711 SCK        | Digital OUT   | —                        |
| 3V3       | —       | VCC sensores     | Alimentación  | DHT11, HX711, LDR+       |
| GND       | —       | GND sensores     | Tierra        | DHT11, HX711, LDR−       |
| VIN       | —       | Alimentación     | 5V entrada    | Via USB o fuente externa |

---

## 2. ESP32-CAM — AI-Thinker (KPCL0040)

### Diagrama de cableado físico

```
                    ╔═══════════════════════════════════════════╗
                    ║        AI-Thinker ESP32-CAM               ║
                    ║              KPCL0040                     ║
  5V ──────────────╢ 5V                               3V3      ╟─── 3V3
  GND ─────────────╢ GND                              IO16     ║  (PSRAM)
                    ║                                           ║
  HX711 DT ────────╢ IO13                             IO0      ║  (XCLK cámara)
                    ║                                           ║
  HX711 SCK ───────╢ IO14                             GND      ╟─── GND
                    ║                                           ║
  DHT11 DATA ──────╢ IO15                             U0R/RX   ╟─── FTDI TX
  (+ 10kΩ → 3V3)   ║                                           ║
                    ║                                 U0T/TX   ╟─── FTDI RX
                    ║                                           ║
                    ║                                 IO33      ╟─── LED rojo integrado
                    ║                                           ║    (active LOW)
                    ║                                 IO32      ║  (PWDN cámara)
                    ║                                           ║
                    ║    Flash LED                    IO4       ╟─── [LED FLASH] ── GND
                    ║    (HIGH = encendido)                     ║    ⚠️ alta corriente
                    ║                                           ║
                    ╠═══════════════════════════════════════════╣
                    ║         OV2640 · Cámara (interna)        ║
                    ║  Flex ribbon — conexión directa al módulo ║
                    ║                                           ║
                    ║  XCLK   ── IO0      VSYNC  ── IO25       ║
                    ║  SIOD   ── IO26     HREF   ── IO23       ║
                    ║  SIOC   ── IO27     PCLK   ── IO22       ║
                    ║  Y9-Y2  ── IO35,34,39,36,21,19,18,5      ║
                    ║  PWDN   ── IO32     RESET  ── N/C        ║
                    ╚═══════════════════════════════════════════╝

     ┌─────────────────────────────────────────────┐
     │         Celda de Carga (Load Cell)          │
     │                                             │
     │  Rojo   ── E+ ─┐                            │
     │  Negro  ── E- ─┤  HX711 (módulo)            │
     │  Verde  ── A+ ─┤  VCC ── 3V3                │
     │  Blanco ── A- ─┘  GND ── GND                │
     │                   DT  ── IO13               │
     │                   SCK ── IO14               │
     └─────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────┐
     │         DHT11 · Temp/Humedad                │
     │                                             │
     │  VCC  ──────────────────────────── 3V3      │
     │  DATA ──── IO15    10kΩ pullup              │
     │  NC   ──── (no conectar)                    │
     │  GND  ──────────────────────────── GND      │
     └─────────────────────────────────────────────┘
```

### Tabla de pines — ESP32-CAM

| Pin placa | GPIO    | Periférico          | Señal       | Notas                        |
|-----------|---------|---------------------|-------------|------------------------------|
| IO13      | GPIO13  | HX711 DT (DOUT)     | Digital IN  | —                            |
| IO14      | GPIO14  | HX711 SCK           | Digital OUT | —                            |
| IO15      | GPIO15  | DHT11 DATA          | Digital I/O | Pull-up 10kΩ a 3V3           |
| IO33      | GPIO33  | LED status (rojo)   | Digital OUT | Built-in, active LOW         |
| IO4       | GPIO4   | LED flash           | Digital OUT | Alta corriente, HIGH=ON      |
| IO0       | GPIO0   | OV2640 XCLK         | Reloj cam.  | Interno, no tocar            |
| IO25      | GPIO25  | OV2640 VSYNC        | Cam. sync   | Interno                      |
| IO23      | GPIO23  | OV2640 HREF         | Cam. sync   | Interno                      |
| IO22      | GPIO22  | OV2640 PCLK         | Cam. clock  | Interno                      |
| IO26      | GPIO26  | OV2640 SIOD (SDA)   | I2C cam.    | Interno                      |
| IO27      | GPIO27  | OV2640 SIOC (SCL)   | I2C cam.    | Interno                      |
| IO32      | GPIO32  | OV2640 PWDN         | Power down  | Interno                      |
| IO35,34,39,36,21,19,18,5 | — | OV2640 Y9–Y2 | Bus datos cam. | Internos, solo lectura |
| U0T/TX    | GPIO1   | FTDI RX             | UART TX     | Solo programación USB        |
| U0R/RX    | GPIO3   | FTDI TX             | UART RX     | Solo programación USB        |
| 5V        | —       | Alimentación        | 5V entrada  | Requerido (no 3V3 directo)   |
| GND       | —       | Tierra              | —           | —                            |

---

## 3. Comparativa rápida de pines

| Periférico      | ESP8266 (NodeMCU)   | ESP32-CAM (AI-Thinker) |
|-----------------|---------------------|------------------------|
| HX711 DT        | D6 · GPIO12         | IO13                   |
| HX711 SCK       | D7 · GPIO13         | IO14                   |
| DHT11 DATA      | D5 · GPIO14         | IO15                   |
| LED status      | GPIO2 · D4 (inv.)   | IO33 (active LOW)      |
| LED flash       | —                   | IO4 (HIGH = ON)        |
| LDR / ADC       | A0 (único ADC)      | — (no montado)         |
| Cámara OV2640   | —                   | IO0,5,18,19,21–27,32–36,39 |
| Alimentación    | 5V via VIN          | 5V via pin 5V          |
| Filesystem      | LittleFS (4MB)      | SPIFFS (4MB)           |

---

## 4. Diagrama lógico de módulos de firmware

### ESP8266

```
┌─────────────────────────────────────────────────────────────┐
│                        main.cpp                             │
│                    loop() — 10s/15s                         │
└──┬──────────┬──────────┬──────────┬────────────────────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
┌──────────┐ ┌─────────┐ ┌───────────────┐ ┌──────────────┐
│  config  │ │  wifi   │ │     mqtt      │ │   sensors    │
│   .h     │ │ manager │ │    manager    │ │   manager    │
│          │ │         │ │               │ │              │
│DEVICE_ID │ │WiFiMulti│ │PubSubClient   │ │ HX711 (D6/7) │
│BROKER    │ │/wifi.json│ │WiFiClientSec. │ │ DHT11 (D5)   │
│PINS      │ │/last_   │ │ISRG Root X1   │ │ LDR (A0)     │
│LIMITS    │ │wifi.txt │ │NTP sync       │ │/calibration  │
└──────────┘ │         │ │Backoff exp.   │ │.json         │
             └────┬────┘ └──────┬────────┘ └──────┬───────┘
                  │             │                  │
                  ▼             ▼                  ▼ publica
             ┌─────────┐  ┌──────────┐     ┌──────────────┐
             │LittleFS │  │ HiveMQ   │     │  JSON payload │
             │(flash)  │  │ :8883    │     │ KPCL0038/    │
             └─────────┘  └──────────┘     │ SENSORS      │
                               ▲           └──────────────┘
                               │ publica/subscribe
                     KPCL0038/STATUS (retained)
                     KPCL0038/SENSORS
                     KPCL0038/cmd (sub)

┌──────────────┐      ┌──────────────┐
│ led_indicator│      │  ArduinoOTA  │
│ GPIO2 (inv.) │      │ TCP :8266    │
│ Non-blocking │      │ PRIORIDAD #1 │
└──────────────┘      └──────────────┘
```

### ESP32-CAM

```
┌────────────────────────────────────────────────────────────────┐
│                          main.cpp                              │
│                      loop() — 10s/15s                          │
│              [pausa total si OTA en progreso]                  │
└──┬──────────┬──────────┬──────────┬─────────────────────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
┌──────────┐ ┌────────────┐ ┌──────────────┐ ┌─────────────┐
│ config.h │ │    wifi    │ │     mqtt     │ │   sensors   │
│          │ │  manager   │ │   manager    │ │   manager   │
│DEVICE_ID │ │State mach. │ │PubSubClient  │ │HX711(13/14) │
│BROKER    │ │IDLE/SCAN/  │ │setInsecure() │ │DHT11 (15)   │
│PINS      │ │WAITING/    │ │⚠️ sin cert   │ │/calibration │
│CAM CFG   │ │COOLDOWN    │ │NTP sync      │ │.json(SPIFFS)│
└──────────┘ └──────┬─────┘ └──────┬───────┘ └─────┬───────┘
                    │              │               │ publica
                    ▼              ▼               ▼
               ┌─────────┐  ┌──────────┐  ┌──────────────┐
               │ SPIFFS  │  │ HiveMQ   │  │  JSON payload │
               │  4MB    │  │ :8883    │  │ KPCL0040/    │
               └─────────┘  └──────────┘  │ SENSORS      │
                    ▲             ▲        └──────────────┘
                    │             │ publica
               ┌────┴──┐  KPCL0040/STATUS (retained)
               │cap_*  │  KPCL0040/SENSORS
               │.jpg   │  stream_url: :81/stream
               │(50max)│  sub: KPCL0040/cmd
               └───────┘

┌────────────────────────────────────────────────────┐
│               camera_manager                        │
│   OV2640 ──► esp_camera driver                    │
│               ├──► WebServer :80 (Core 0)          │
│               │     GET / → HTML UI                │
│               │     GET /capture, /save, /list     │
│               │     GET /download, /download-all   │
│               │     GET /flash, /vflip, /hmirror   │
│               │     GET /delete, /clear            │
│               └──► StreamServer :81 (Core 0)       │
│                     GET /stream → MJPEG            │
└────────────────────────────────────────────────────┘

┌──────────────────┐      ┌──────────────┐
│  led_indicator   │      │  ArduinoOTA  │
│  GPIO33 (status) │      │ TCP :3232    │
│  GPIO4  (flash)  │      │ PRIORIDAD #1 │
│  Dual-mode blink │      │ pausa loop   │
└──────────────────┘      └──────────────┘
```

---

## 5. Prompts para generador de imágenes IA

### Estilo Fritzing — ESP8266

```
Professional electronic wiring diagram in Fritzing breadboard style.
White background, clean layout, top-down isometric view.

Main board: NodeMCU v3 ESP8266 (30-pin, black PCB, dual-row header).

Connected components and wiring:
- HX711 load cell module (green PCB, 4-pin): DT pin to NodeMCU D6/GPIO12 (yellow wire), SCK pin to NodeMCU D7/GPIO13 (orange wire), VCC to NodeMCU 3V3 (red wire), GND to NodeMCU GND (black wire).
- Strain gauge load cell (aluminum bar, 4 wires): Red wire to HX711 E+, Black wire to HX711 E-, Green wire to HX711 A+, White wire to HX711 A-.
- DHT11 sensor (blue rectangular module, 3-pin): DATA pin to NodeMCU D5/GPIO14 (yellow wire) with 10kOhm resistor to 3V3, VCC to 3V3 (red), GND to GND (black).
- LDR photoresistor voltage divider: LDR from 3V3 to A0 node, 10kOhm resistor from A0 node to GND. NodeMCU A0 pin connected to the middle node.
- Built-in LED on GPIO2 labeled "no external connection".

Wire colors: red=VCC/3V3, black=GND, yellow=data signal, orange=clock signal.
All pins labeled with GPIO numbers. Component values shown next to parts.
Technical style, IEEE standard, high resolution, no shadows.
```

### Estilo Fritzing — ESP32-CAM

```
Professional electronic wiring diagram in Fritzing breadboard style.
White background, clean layout, top-down isometric view.

Main board: AI-Thinker ESP32-CAM module (black PCB, OV2640 camera attached on top via flex ribbon cable, SD card slot visible).

Connected components and wiring:
- HX711 load cell module (green PCB): DT to ESP32-CAM IO13 (yellow wire), SCK to IO14 (orange wire), VCC to 3V3 (red), GND to GND (black).
- Strain gauge load cell (aluminum bar, 4 wires): Red to E+, Black to E-, Green to A+, White to A- on HX711.
- DHT11 sensor (blue 3-pin module): DATA to IO15 (yellow wire) with 10kOhm pull-up resistor to 3V3, VCC to 3V3 (red), GND to GND (black).
- Small red LED on IO33 labeled "built-in status LED, active LOW, no external connection".
- High-power white LED on IO4 labeled "flash LED" with 10 Ohm current limiting resistor to GND.
- FTDI USB-Serial adapter: TX to U0R/RX of ESP32-CAM (blue wire), RX to U0T/TX (green wire), GND to GND (black). Labeled "programming only".
- OV2640 camera shown connected via internal flex ribbon cable, labeled "internal connection".

Wire colors: red=VCC, black=GND, yellow=data, orange=clock, blue/green=UART.
All GPIO numbers labeled. 5V input via dedicated 5V pin. High resolution, no shadows, technical precision.
```

### Estilo Esquemático IEC — ESP8266

```
Electronic schematic diagram following IEC 60617 and IEEE standard symbols.
White background, black lines, A3 landscape format.
Grid layout, component reference designators (U1, R1, R2, S1...).

Components:
- U1: ESP8266 NodeMCU v3, shown as rectangular IC block with labeled pins on both sides. Left pins: GND, A0, D5(GPIO14), D6(GPIO12), D7(GPIO13). Right pins: 3V3, D4(GPIO2/LED), VIN.
- U2: HX711, rectangular IC block. Pins: VCC, GND, DT, SCK connected to U1 GPIO12 and GPIO13 via labeled nets.
- LS1: Load cell strain gauge, shown as bridge Wheatstone circuit symbol (4 resistors in diamond shape) connected to U2 E+/E-/A+/A-.
- U3: DHT11, rectangular block with VCC, DATA, GND. DATA net connected to U1 GPIO14.
- R1: 10kOhm pull-up resistor between 3V3 net and DHT11 DATA net. Standard IEC resistor symbol (rectangle).
- R2: 10kOhm resistor in series to GND for LDR divider. Standard IEC resistor symbol.
- RV1: LDR photoresistor, IEC symbol (rectangle with arrow and light rays). Connected between +3V3 and A0 net with R2 to GND.
- LED1: Built-in LED symbol on GPIO2, anode to GPIO2, cathode to GND, labeled "BUILT-IN, inv. logic".

Power nets: +3V3 (red horizontal rail at top), GND (blue horizontal rail at bottom).
Net labels on all connections. Component values next to symbols.
Title block bottom-right: "KPCL0038 - ESP8266 Comedero - Schematic Rev 1.0".
Clean orthogonal wiring, no diagonal lines, professional EDA tool style.
```

### Estilo Esquemático IEC — ESP32-CAM

```
Electronic schematic diagram following IEC 60617 and IEEE standard symbols.
White background, black lines, A3 landscape format.
Two sections: left panel = ESP32-CAM + external sensors, right panel = OV2640 camera bus.

Components:
- U1: AI-Thinker ESP32-CAM, large rectangular IC. Left pins: GND, 5V, IO13, IO14, IO15, IO33, IO4. Right pins: 3V3, IO0, IO25, IO23, IO22, IO26, IO27, IO32, IO35, IO34, IO39, IO36, IO21, IO19, IO18, IO5.
- U2: HX711 module, rectangular IC. DT to U1 IO13, SCK to U1 IO14, VCC to +3V3, GND to GND.
- LS1: Load cell, Wheatstone bridge symbol, connected to U2 E+/E-/A+/A-.
- U3: DHT11, rectangular block. DATA to U1 IO15 with R1 10kOhm pull-up to +3V3.
- LED1: Status LED (red), anode to IO33 via R2 330Ohm, cathode to GND. Label: "active LOW".
- LED2: Flash LED (white, high power), anode to IO4 via R3 10Ohm, cathode to GND. Label: "FLASH, high current".
- U4: OV2640 camera module on right panel. All data bus lines (Y2-Y9, VSYNC, HREF, PCLK, XCLK, SIOD, SIOC, PWDN) connected to corresponding U1 pins via labeled bus lines. Shown as flex ribbon connection symbol.
- J1: UART header 4-pin (TX, RX, GND, 5V) connected to U1 U0T/U0R. Label: "FTDI programmer".

Power nets: +5V (orange rail), +3V3 (red rail), GND (blue rail).
Decoupling capacitor C1 100nF between +3V3 and GND near U1.
Title block: "KPCL0040 - ESP32-CAM Comedero Camara - Schematic Rev 1.0".
Professional EDA style, orthogonal routing, component reference designators.
```

### Recomendación por herramienta IA

| Herramienta         | Estilo recomendado  | Resultado esperado                               |
|---------------------|---------------------|--------------------------------------------------|
| DALL-E 3 (ChatGPT)  | Ambos estilos       | Bueno en layout, puede fallar en conexiones exactas |
| Midjourney v6       | Fritzing style      | Muy estético, menos preciso en detalles técnicos |
| Ideogram 2          | Fritzing style      | Mejor texto en imagen que otros                  |
| Stable Diffusion    | Esquemático IEC     | Más preciso con LoRA específico de EDA           |

> **Nota**: ningún generador de imágenes garantiza 100% de fidelidad en conexiones eléctricas.
> Verificar siempre contra los `config.h` originales antes de usar en producción.
