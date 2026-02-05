// camera_manager.cpp
// Camera manager for ESP32-CAM with OV2640 and HTTP streaming
// Includes capture storage for AI training

#include "camera_manager.h"
#include "config.h"
#include <WiFi.h>
#include <SPIFFS.h>
#include <esp_camera.h>
#include <WebServer.h>

// Estado de la camara
static bool cameraReady = false;

// Servidor web para streaming
static WebServer server(CAMERA_HTTP_PORT);

// Contador de capturas
static int captureCount = 0;
#define CAPTURES_DIR "/captures"
#define MAX_CAPTURES 50

// Boundary para MJPEG streaming
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

// Inicializar contador de capturas
void initCaptureCounter() {
    captureCount = 0;
    File root = SPIFFS.open("/");
    File file = root.openNextFile();
    while (file) {
        String name = file.name();
        if (name.startsWith("/cap_") && name.endsWith(".jpg")) {
            int num = name.substring(5, name.length() - 4).toInt();
            if (num >= captureCount) {
                captureCount = num + 1;
            }
        }
        file = root.openNextFile();
    }
    Serial.print("Capturas existentes, proximo numero: ");
    Serial.println(captureCount);
}

// Handler para la pagina principal
void handleRoot() {
    String html = "<!DOCTYPE html><html><head>";
    html += "<meta charset='UTF-8'>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<title>KittyPaw KPCL0040 - Camera</title>";
    html += "<style>";
    html += "body{font-family:Arial;text-align:center;background:#1a1a2e;color:#eee;margin:0;padding:20px}";
    html += "h1{color:#00d4ff}h2{color:#00d4ff;font-size:1.2em}";
    html += "img{max-width:100%;border:3px solid #00d4ff;border-radius:10px}";
    html += ".info{background:#16213e;padding:15px;border-radius:10px;margin:20px auto;max-width:640px}";
    html += "a{color:#00d4ff}";
    html += ".btn{background:#00d4ff;color:#1a1a2e;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;margin:5px;text-decoration:none;display:inline-block;font-weight:bold}";
    html += ".btn:hover{background:#00a0cc}";
    html += ".btn-danger{background:#ff4757}.btn-danger:hover{background:#cc3a47}";
    html += ".captures{text-align:left;max-height:200px;overflow-y:auto;background:#0f0f23;padding:10px;border-radius:5px;margin-top:10px}";
    html += ".capture-item{padding:5px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center}";
    html += ".status{padding:5px 10px;border-radius:3px;font-size:0.9em}";
    html += ".status-ok{background:#2ed573}.status-err{background:#ff4757}";
    html += "</style></head><body>";
    html += "<h1>KittyPaw KPCL0040</h1>";

    // Stream
    html += "<div class='info'>";
    html += "<h2>Live Stream</h2>";
    html += "<img src='/stream' alt='Camera Stream' id='stream'>";
    html += "</div>";

    // Controles de captura
    html += "<div class='info'>";
    html += "<h2>Captura para Entrenamiento IA</h2>";
    html += "<button class='btn' onclick='saveCapture()'>Guardar Captura</button>";
    html += "<button class='btn' onclick='refreshList()'>Actualizar Lista</button>";
    html += "<button class='btn btn-danger' onclick='clearAll()'>Borrar Todo</button>";
    html += "<p id='status'></p>";
    html += "<div class='captures' id='captureList'>Cargando...</div>";
    html += "</div>";

    // Info del dispositivo
    html += "<div class='info'>";
    html += "<p><strong>Device:</strong> " DEVICE_ID "</p>";
    html += "<p><strong>IP:</strong> " + WiFi.localIP().toString() + "</p>";
    html += "<p><strong>Stream:</strong> <a href='/stream'>/stream</a></p>";
    html += "</div>";

    // JavaScript
    html += "<script>";
    html += "function saveCapture(){";
    html += "  fetch('/save').then(r=>r.json()).then(d=>{";
    html += "    document.getElementById('status').innerHTML='<span class=\"status status-ok\">'+d.message+'</span>';";
    html += "    refreshList();";
    html += "  }).catch(e=>{document.getElementById('status').innerHTML='<span class=\"status status-err\">Error</span>';});";
    html += "}";
    html += "function refreshList(){";
    html += "  fetch('/list').then(r=>r.json()).then(d=>{";
    html += "    let html='<p>Total: '+d.count+'/'+d.max+' capturas</p>';";
    html += "    d.files.forEach(f=>{";
    html += "      html+='<div class=\"capture-item\"><span>'+f+'</span>';";
    html += "      html+='<span><a href=\"/download?file='+f+'\" class=\"btn\" style=\"padding:3px 8px;font-size:0.8em\">Descargar</a>';";
    html += "      html+='<button onclick=\"deleteFile(\\''+f+'\\')\" class=\"btn btn-danger\" style=\"padding:3px 8px;font-size:0.8em\">X</button></span></div>';";
    html += "    });";
    html += "    if(d.count==0)html+='<p>No hay capturas guardadas</p>';";
    html += "    document.getElementById('captureList').innerHTML=html;";
    html += "  });";
    html += "}";
    html += "function deleteFile(f){";
    html += "  fetch('/delete?file='+f).then(r=>r.json()).then(d=>{";
    html += "    document.getElementById('status').innerHTML='<span class=\"status status-ok\">'+d.message+'</span>';";
    html += "    refreshList();";
    html += "  });";
    html += "}";
    html += "function clearAll(){";
    html += "  if(confirm('Borrar todas las capturas?')){";
    html += "    fetch('/clear').then(r=>r.json()).then(d=>{";
    html += "      document.getElementById('status').innerHTML='<span class=\"status status-ok\">'+d.message+'</span>';";
    html += "      refreshList();";
    html += "    });";
    html += "  }";
    html += "}";
    html += "refreshList();";
    html += "</script>";

    html += "</body></html>";
    server.send(200, "text/html", html);
}

// Handler para captura unica (mostrar en navegador)
void handleCapture() {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        server.send(500, "text/plain", "Error: No se pudo capturar imagen");
        return;
    }
    server.sendHeader("Content-Disposition", "inline; filename=capture.jpg");
    server.send_P(200, "image/jpeg", (const char*)fb->buf, fb->len);
    esp_camera_fb_return(fb);
}

// Handler para guardar captura en SPIFFS
void handleSave() {
    if (captureCount >= MAX_CAPTURES) {
        server.send(200, "application/json", "{\"success\":false,\"message\":\"Limite alcanzado. Borra algunas capturas.\"}");
        return;
    }

    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        server.send(200, "application/json", "{\"success\":false,\"message\":\"Error al capturar\"}");
        return;
    }

    char filename[32];
    snprintf(filename, sizeof(filename), "/cap_%03d.jpg", captureCount);

    File file = SPIFFS.open(filename, FILE_WRITE);
    if (!file) {
        esp_camera_fb_return(fb);
        server.send(200, "application/json", "{\"success\":false,\"message\":\"Error al crear archivo\"}");
        return;
    }

    file.write(fb->buf, fb->len);
    file.close();
    esp_camera_fb_return(fb);

    captureCount++;

    char response[128];
    snprintf(response, sizeof(response), "{\"success\":true,\"message\":\"Guardado: %s\",\"file\":\"%s\"}", filename, filename);
    server.send(200, "application/json", response);

    Serial.print("Captura guardada: ");
    Serial.println(filename);
}

// Handler para listar capturas
void handleList() {
    String json = "{\"count\":0,\"max\":" + String(MAX_CAPTURES) + ",\"files\":[";
    int count = 0;

    File root = SPIFFS.open("/");
    File file = root.openNextFile();
    bool first = true;

    while (file) {
        String name = file.name();
        if (name.startsWith("/cap_") && name.endsWith(".jpg")) {
            if (!first) json += ",";
            json += "\"" + name + "\"";
            first = false;
            count++;
        }
        file = root.openNextFile();
    }

    json += "],\"count\":" + String(count) + "}";
    server.send(200, "application/json", json);
}

// Handler para descargar captura
void handleDownload() {
    if (!server.hasArg("file")) {
        server.send(400, "text/plain", "Falta parametro file");
        return;
    }

    String filename = server.arg("file");
    if (!filename.startsWith("/")) filename = "/" + filename;

    if (!SPIFFS.exists(filename)) {
        server.send(404, "text/plain", "Archivo no encontrado");
        return;
    }

    File file = SPIFFS.open(filename, "r");
    if (!file) {
        server.send(500, "text/plain", "Error al abrir archivo");
        return;
    }

    server.sendHeader("Content-Disposition", "attachment; filename=" + filename.substring(1));
    server.streamFile(file, "image/jpeg");
    file.close();
}

// Handler para eliminar captura
void handleDelete() {
    if (!server.hasArg("file")) {
        server.send(400, "application/json", "{\"success\":false,\"message\":\"Falta parametro file\"}");
        return;
    }

    String filename = server.arg("file");
    if (!filename.startsWith("/")) filename = "/" + filename;

    if (SPIFFS.remove(filename)) {
        server.send(200, "application/json", "{\"success\":true,\"message\":\"Eliminado\"}");
        Serial.print("Eliminado: ");
        Serial.println(filename);
    } else {
        server.send(200, "application/json", "{\"success\":false,\"message\":\"Error al eliminar\"}");
    }
}

// Handler para borrar todas las capturas
void handleClear() {
    int deleted = 0;
    File root = SPIFFS.open("/");
    File file = root.openNextFile();

    while (file) {
        String name = file.name();
        file = root.openNextFile(); // Avanzar antes de borrar
        if (name.startsWith("/cap_") && name.endsWith(".jpg")) {
            if (SPIFFS.remove(name)) {
                deleted++;
            }
        }
    }

    captureCount = 0;

    char response[64];
    snprintf(response, sizeof(response), "{\"success\":true,\"message\":\"%d capturas eliminadas\"}", deleted);
    server.send(200, "application/json", response);

    Serial.print("Capturas eliminadas: ");
    Serial.println(deleted);
}

// Handler para streaming MJPEG
void handleStream() {
    WiFiClient client = server.client();

    String response = "HTTP/1.1 200 OK\r\n";
    response += "Content-Type: " + String(STREAM_CONTENT_TYPE) + "\r\n";
    response += "Access-Control-Allow-Origin: *\r\n";
    response += "\r\n";
    client.print(response);

    while (client.connected()) {
        camera_fb_t *fb = esp_camera_fb_get();
        if (!fb) {
            Serial.println("Error: Captura fallida en stream");
            break;
        }

        char buf[64];
        client.print(STREAM_BOUNDARY);
        snprintf(buf, sizeof(buf), STREAM_PART, fb->len);
        client.print(buf);
        client.write(fb->buf, fb->len);

        esp_camera_fb_return(fb);

        if (!client.connected()) break;
    }
}

// Handler para 404
void handleNotFound() {
    server.send(404, "text/plain", "404: Not Found");
}

bool cameraInit() {
    Serial.println("Inicializando camara OV2640...");

    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sccb_sda = SIOD_GPIO_NUM;
    config.pin_sccb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    config.grab_mode = CAMERA_GRAB_LATEST;

    // Configuracion segun PSRAM disponible
    if (psramFound()) {
        Serial.println("PSRAM detectada, usando configuracion alta");
        config.frame_size = FRAMESIZE_VGA;
        config.jpeg_quality = 10;
        config.fb_count = 2;
        config.fb_location = CAMERA_FB_IN_PSRAM;
    } else {
        Serial.println("Sin PSRAM, usando configuracion reducida");
        config.frame_size = FRAMESIZE_QVGA;
        config.jpeg_quality = 12;
        config.fb_count = 1;
        config.fb_location = CAMERA_FB_IN_DRAM;
    }

    // Inicializar camara
    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("Error al inicializar camara: 0x%x\n", err);
        cameraReady = false;
        return false;
    }

    // Configuracion adicional del sensor
    sensor_t *s = esp_camera_sensor_get();
    if (s) {
        s->set_brightness(s, 0);
        s->set_contrast(s, 0);
        s->set_saturation(s, 0);
        s->set_special_effect(s, 0);
        s->set_whitebal(s, 1);
        s->set_awb_gain(s, 1);
        s->set_wb_mode(s, 0);
        s->set_exposure_ctrl(s, 1);
        s->set_aec2(s, 0);
        s->set_gain_ctrl(s, 1);
        s->set_agc_gain(s, 0);
        s->set_gainceiling(s, (gainceiling_t)0);
        s->set_bpc(s, 0);
        s->set_wpc(s, 1);
        s->set_raw_gma(s, 1);
        s->set_lenc(s, 1);
        s->set_hmirror(s, 0);
        s->set_vflip(s, 0);
        s->set_dcw(s, 1);
        s->set_colorbar(s, 0);
    }

    Serial.println("Camara inicializada correctamente");
    cameraReady = true;
    return true;
}

void cameraStartServer() {
    if (!cameraReady) {
        Serial.println("Error: Camara no inicializada, servidor no iniciado");
        return;
    }

    // Inicializar contador de capturas
    initCaptureCounter();

    // Configurar rutas
    server.on("/", HTTP_GET, handleRoot);
    server.on("/capture", HTTP_GET, handleCapture);
    server.on("/stream", HTTP_GET, handleStream);
    server.on("/save", HTTP_GET, handleSave);
    server.on("/list", HTTP_GET, handleList);
    server.on("/download", HTTP_GET, handleDownload);
    server.on("/delete", HTTP_GET, handleDelete);
    server.on("/clear", HTTP_GET, handleClear);
    server.onNotFound(handleNotFound);

    // Iniciar servidor
    server.begin();
    Serial.println("Servidor de camara iniciado");
    Serial.print("Pagina principal: http://");
    Serial.println(WiFi.localIP());
}

void cameraLoop() {
    server.handleClient();
}

bool cameraCaptureToFile(const char* filename) {
    if (!cameraReady) return false;

    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("Error: No se pudo capturar imagen");
        return false;
    }

    File file = SPIFFS.open(filename, FILE_WRITE);
    if (!file) {
        Serial.println("Error: No se pudo crear archivo");
        esp_camera_fb_return(fb);
        return false;
    }

    file.write(fb->buf, fb->len);
    file.close();
    esp_camera_fb_return(fb);

    Serial.print("Imagen guardada: ");
    Serial.println(filename);
    return true;
}

bool isCameraReady() {
    return cameraReady;
}

String getCameraStreamUrl() {
    if (WiFi.status() == WL_CONNECTED) {
        return "http://" + WiFi.localIP().toString() + "/stream";
    }
    return "";
}
