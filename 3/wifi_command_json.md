Para enviar una nueva configuración de Wi-Fi al dispositivo, debes publicar un mensaje JSON en el siguiente tópico:

**Tópico:** `kittypau/KPCL0030/cmnd/set_wifi`

**Mensaje JSON (payload):**

```json
{
  "ssid": "NOMBRE_DE_TU_RED_WIFI",
  "pass": "CONTRASENA_DE_TU_RED_WIFI"
}
```

**Ejemplo:**

Si tu red Wi-Fi se llama "MiCasaWifi" y la contraseña es "micontrasenasegura", el mensaje JSON sería:

```json
{
  "ssid": "MiCasaWifi",
  "pass": "micontrasenasegura"
}
```
Asegúrate de reemplazar `NOMBRE_DE_TU_RED_WIFI` y `CONTRASENA_DE_TU_RED_WIFI` con los valores reales de tu red. El dispositivo intentará conectarse a esta nueva red y, si es exitoso, guardará las credenciales y se reiniciará.