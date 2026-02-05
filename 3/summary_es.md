El dispositivo establece una conexión MQTT segura con AWS IoT Core, publica datos de sensores y puede recibir comandos para actualizar sus credenciales Wi-Fi.

**Componentes clave y flujo:**
1.  **Librerías**: Utiliza `WiFiClientSecure` para TLS, `PubSubClient` para MQTT, `ArduinoJson` para serialización de datos y `time.h` para NTP.
2.  **Configuración**:
    *   Se conecta a un `AWS_IOT_ENDPOINT` codificado (`a3o1jhmmwxnm4z-ats.iot.us-east-2.amazonaws.com`) en el puerto `8883`.
    *   Utiliza certificados del lado del cliente (`AmazonRootCA1.pem`, `certificate.pem.crt`, `private.pem.key`) almacenados en LittleFS para la autenticación mutua con AWS IoT.
    *   Los temas MQTT se generan dinámicamente usando un `DEVICE_ID` (por ejemplo, `kittypau/KPCL0030/data/sensors`).
3.  **Configuración inicial (`setup()`):**
    *   Inicializa LittleFS para acceder a los archivos de certificado.
    *   Se conecta a Wi-Fi (credenciales de LittleFS o predeterminadas).
    *   Sincroniza la hora del dispositivo a través de NTP (`setClock()`) para la validación del certificado TLS.
    *   Carga y configura `WiFiClientSecure` con la CA, el certificado del dispositivo y la clave privada.
    *   Configura el `PubSubClient` con el punto final de AWS, el puerto y una función de devolución de llamada para los mensajes entrantes.
    *   Realiza una verificación inicial de los sensores.
    *   Establece la primera conexión MQTT y publica mensajes iniciales de salud y estado.
4.  **Bucle principal (`loop()`):**
    *   Monitorea y restablece continuamente las conexiones Wi-Fi y MQTT si se pierden.
    *   Procesa el tráfico MQTT (`mqttClient.loop()`).
    *   Lee los datos de los sensores (temperatura, humedad, peso, luz) cada 3 segundos.
    *   Formatea los datos de los sensores en una carga útil JSON y los publica en AWS IoT.
5.  **Callback de MQTT (`mqtt_callback()`):**
    *   Escucha los mensajes en el tema de comando `set_wifi`.
    *   Si se recibe un comando válido, analiza el nuevo SSID y contraseña de Wi-Fi de la carga útil JSON, los guarda en LittleFS y reinicia el dispositivo.
6.  **`connect_mqtt()`**: Maneja el intento de conexión real al broker MQTT de AWS, suscribiéndose a los temas de comando y publicando un estado "Online" al tener éxito.

En esencia, el dispositivo se conecta de forma segura a AWS IoT, informa datos de sensores y es configurable de forma remota para su red Wi-Fi, todo ello protegido por TLS con certificados de cliente y sincronización de hora NTP.