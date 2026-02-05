Los tópicos MQTT a los que te puedes suscribir/publicar, basándome en el archivo `src/main.cpp` y utilizando el `DEVICE_ID` "KPCL0030", son:

**Tópicos para Publicar:**

*   `kittypau/KPCL0030/status`
    *   **Propósito:** Publicar el estado general del dispositivo (por ejemplo, "Online").
*   `kittypau/KPCL0030/health`
    *   **Propósito:** Publicar el estado de los sensores ("OK" o mensajes de error específicos).
*   `kittypau/KPCL0030/data/sensors`
    *   **Propósito:** Publicar los datos de los sensores en formato JSON.

**Tópicos para Suscribir:**

*   `kittypau/KPCL0030/cmnd/set_wifi`
    *   **Propósito:** Recibir comandos para actualizar las credenciales de Wi-Fi del dispositivo. Los mensajes deben ser JSON con los campos `ssid` y `pass`.

**Ejemplo de mensaje para `kittypau/KPCL0030/cmnd/set_wifi`:**
```json
{
  "ssid": "MiNuevaRedWiFi",
  "pass": "MiNuevaContraseña"
}
```
