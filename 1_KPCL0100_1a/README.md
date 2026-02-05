
# KittyPau! - Monitor de Mascotas IoT

![KittyPau!](https://i.imgur.com/your-image-url.png) <!-- Reemplaza con una imagen del proyecto -->

## Introducción

**KittyPau!** es un proyecto de código abierto que utiliza un **ESP32-CAM** para crear un sistema de monitoreo integral para mascotas. Este dispositivo permite a los dueños cuidar y observar a sus mascotas de forma remota, recopilando datos de sensores y transmitiéndolos a través de MQTT.

El proyecto está diseñado para ser modular y extensible, permitiendo añadir nuevas funcionalidades y sensores con facilidad.

## Características

### Implementadas
*   **Conectividad WiFi:** Conexión y reconexión automática a redes WiFi.
*   **Comunicación MQTT:** Envío de datos de sensores y estado del dispositivo a un broker MQTT. Permite recibir comandos para controlar el dispositivo de forma remota.
*   **Sensor de Peso:** Mide el peso (por ejemplo, en un comedero o en la cama de la mascota) utilizando un sensor HX711.
*   **Sensor de Temperatura y Humedad:** Monitorea las condiciones ambientales con un sensor DHT11.
*   **Sensor de Luz (LDR):** Mide el nivel de luz ambiental.
*   **Indicador LED:** Proporciona feedback visual sobre el estado del dispositivo.
*   **Captura de Imágenes:** (Funcionalidad base del ESP32-CAM, lista para ser integrada).

### Planificadas (Hitos Pendientes)
*   Integración de un dispensador de alimento.
*   Implementación de un bebedero automático.
*   Control de un arenero autolimpiante.
*   Control de servos para juguetes interactivos.
*   Integración de un sensor de pH para análisis de orina.
*   Actualizaciones de Firmware Over-the-Air (OTA).

## Hardware

### Componentes
*   **Placa de Desarrollo:** AI-Thinker ESP32-CAM
*   **Sensor de Peso:** Celda de carga + Módulo HX711
*   **Sensor de Ambiente:** Sensor de Temperatura y Humedad DHT11
*   **Sensor de Luz:** Fotorresistencia (LDR)

### Pinout (ESP32-CAM)

| Pin | Función                 | Conectado a         | Descripción                               |
|-----|-------------------------|---------------------|-------------------------------------------|
| `33`| Indicador LED (Rojo)    | LED Rojo (integrado)| Muestra el estado del dispositivo.        |
| `14`| Sensor DHT11            | DHT11 Data Pin      | Lee la temperatura y humedad.             |
| `1` | HX711 DOUT (Data)       | HX711 DOUT          | Pin de datos para la celda de carga (TX0).|
| `3` | HX711 SCK (Clock)       | HX711 SCK           | Pin de reloj para la celda de carga (RX0). |
| `2` | Sensor de Luz (LDR)     | LDR                 | Lee la intensidad de la luz (ADC2_CH2).   |
| `5V`| Alimentación            | Varios              | Suministra energía a los componentes.     |
| `GND`| Tierra                  | Varios              | Conexión a tierra común.                  |

**Nota Importante:** El uso de los pines `TX0` y `RX0` para el HX711 deshabilita la salida de logs por el Monitor Serie de Arduino una vez que la báscula es inicializada. La lectura del LDR en un pin `ADC2` puede fallar si coincide con una transmisión WiFi activa.

## Software

### Entorno de Desarrollo
*   **Framework:** Arduino
*   **IDE:** PlatformIO

### Librerías Principales
*   `knolleary/PubSubClient @ ^2.8`
*   `bblanchon/ArduinoJson @ ^6.21.3`
*   `olkal/HX711_ADC @ ^1.2.9`
*   `adafruit/DHT sensor library @ ^1.4.4`
*   `adafruit/Adafruit Unified Sensor @ ^1.1.9`

### Tópicos MQTT
El `DEVICE_ID` por defecto es `KPCL0033`.

*   **Publicación de Sensores:** `KPCL0033/SENSORS`
    *   **Payload:** `{"timestamp":"MM-dd-aaaa HH:mm:ss","weight":0.44,"temp":26.60,"hum":39.40,"light":{"lux":70.0,"\%":7,"condition":"dim"}}`
*   **Publicación de Estado:** `KPCL0033/STATUS`
    *   **Payload:** `{"wifi_status":"Conectado","KPCL0033":"Online","sensor_health":"OK"}`
*   **Suscripción a Comandos:** `KPCL0033/cmd`
    *   **Comandos:** `ADDWIFI`, `CALIBRATE_WEIGHT` (ver `Topicos.md` para detalles).

## Instalación y Uso

1.  **Clonar el Repositorio:**
    ```bash
    git clone <URL-DEL-REPOSITORIO>
    cd 1_KPCL0100_1a
    ```

2.  **Configurar Credenciales:**
    *   Modifica el archivo `include/config.h` para ajustar tu `WIFI_SSID` y `WIFI_PASS`.
    *   Sube los certificados de AWS IoT (`AmazonRootCA1.pem`, `certificate.pem.crt`, `private.pem.key`) al sistema de archivos LittleFS (en el directorio `/data`).

3.  **Compilar y Subir:**
    *   Abre el proyecto con Visual Studio Code y la extensión PlatformIO.
    *   Utiliza los comandos de PlatformIO para compilar (`Build`) y subir (`Upload`) el firmware a tu ESP32-CAM.

4.  **Calibración del Sensor de Peso:**
    *   Sigue las instrucciones en `include/config.h` y `sensors.cpp` para calibrar la celda de carga y obtener mediciones precisas.
    *   Puedes enviar comandos MQTT al tópico `KPCL0033/cmd` para realizar la tara y ajustar el factor de calibración.
