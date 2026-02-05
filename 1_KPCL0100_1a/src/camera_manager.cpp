// src/camera_manager.cpp
#include "camera_manager.h"
#include "esp_camera.h"
#include "Arduino.h"

// --- Configuración de Pines para la Placa AI-THINKER ESP32-CAM ---
#define CAM_PIN_PWDN 32
#define CAM_PIN_RESET -1 // No se usa
#define CAM_PIN_XCLK 0
#define CAM_PIN_SIOD 26 // SCCB SDA
#define CAM_PIN_SIOC 27 // SCCB SCL
#define CAM_PIN_D7 35
#define CAM_PIN_D6 34
#define CAM_PIN_D5 39
#define CAM_PIN_D4 36
#define CAM_PIN_D3 21
#define CAM_PIN_D2 19
#define CAM_PIN_D1 18
#define CAM_PIN_D0 5
#define CAM_PIN_VSYNC 25
#define CAM_PIN_HREF 23
#define CAM_PIN_PCLK 22

void cameraInit() {
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = CAM_PIN_D0;
    config.pin_d1 = CAM_PIN_D1;
    config.pin_d2 = CAM_PIN_D2;
    config.pin_d3 = CAM_PIN_D3;
    config.pin_d4 = CAM_PIN_D4;
    config.pin_d5 = CAM_PIN_D5;
    config.pin_d6 = CAM_PIN_D6;
    config.pin_d7 = CAM_PIN_D7;
    config.pin_xclk = CAM_PIN_XCLK;
    config.pin_pclk = CAM_PIN_PCLK;
    config.pin_vsync = CAM_PIN_VSYNC;
    config.pin_href = CAM_PIN_HREF;
    config.pin_sccb_sda = CAM_PIN_SIOD;
    config.pin_sccb_scl = CAM_PIN_SIOC;
    config.pin_pwdn = CAM_PIN_PWDN;
    config.pin_reset = CAM_PIN_RESET;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    config.frame_size = FRAMESIZE_VGA; // 640x480
    config.jpeg_quality = 12; // 0-63 (menor es mejor calidad)
    config.fb_count = 1;
    config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;

    // Inicializar la cámara
    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("La inicialización de la cámara falló con el error 0x%x\n", err);
        // Intentar reiniciar
        delay(1000);
        ESP.restart();
    } else {
        Serial.println("Cámara inicializada correctamente.");
    }
}

camera_fb_t* cameraCapture() {
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("Fallo en la captura de la cámara");
        return NULL;
    }
    return fb;
}
