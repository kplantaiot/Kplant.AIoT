#include "esp_camera.h"
#include "Arduino.h"
#include "FS.h"
#include "SD_MMC.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include "driver/rtc_io.h"
#include <WiFi.h>
#include <WebServer.h> // Include the WebServer library
#include <fb_gfx.h> // Include fb_gfx.h for drawing text and rectangles

// Edge Impulse libraries
#include <Jdayne-project-1_inferencing.h>
#include "edge-impulse-sdk/dsp/image/image.hpp"

// Function to draw bounding boxes
// We will implement our own drawing functions
// #include "fb_gfx.h" // No longer needed

// WiFi credentials
#define WIFI_SSID "Suarez_Mujica_891"
#define WIFI_PASS "SuarezMujica891"

// Camera model
#define CAMERA_MODEL_AI_THINKER

#if defined(CAMERA_MODEL_AI_THINKER)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
#else
#error "Camera model not selected"
#endif

// Edge Impulse results
static bool debug_nn = false;
static uint8_t *resized_buf = nullptr;
static uint8_t *snapshot_buf = nullptr; // Make snapshot_buf a static global

// Web server
WebServer server(80); // Use WebServer instead of WiFiServer

// Forward declarations
static int ei_camera_get_data(size_t offset, size_t length, float *out_ptr);
void rgb888_to_rgb565(uint8_t *rgb888_buf, uint16_t *rgb565_buf, int width, int height);
static void draw_bounding_boxes(camera_fb_t *original_fb, uint8_t *rgb888_buf, ei_impulse_result_t *result);
void handleJpgStream();
void handleJpg();
void handleRoot();
void swap_rb_channels(uint8_t *rgb888_buf, int width, int height);




void setup() {
    WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); //disable brownout detector
    Serial.begin(115200);
    Serial.setDebugOutput(true);
    Serial.println();

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
    config.pixel_format = PIXFORMAT_RGB565; // Use RGB565 for drawing
    config.frame_size = FRAMESIZE_240X240;
    config.jpeg_quality = 12;
    config.fb_count = 1;

    // camera init
    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("Camera init failed with error 0x%x", err);
        return;
    }

    // Wi-Fi connection
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("");
    Serial.println("WiFi connected");

    server.on("/", HTTP_GET, handleRoot);
    server.on("/stream", HTTP_GET, handleJpgStream);
    server.on("/jpg", HTTP_GET, handleJpg);
    server.begin();

    Serial.print("Camera Ready! Use 'http://");
    Serial.print(WiFi.localIP());
    Serial.println("' to connect");
}

void loop() {
    server.handleClient();
}

void handleRoot() {
    server.send(200, "text/html", "<html><body><img src=\"/stream\" width=\"240\" height=\"240\"></body></html>");
}

void handleJpgStream() {
    WiFiClient client = server.client();
    String response = "HTTP/1.1 200 OK\r\n";
    response += "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n";
    client.print(response);
    Serial.println("Stream client connected");

    while (client.connected()) {
        yield(); // Allow background tasks to run
        camera_fb_t *fb = esp_camera_fb_get();
        if (!fb) {
            Serial.println("Camera capture failed");
            continue;
        }
        Serial.printf("Captured frame: %dx%d, len: %d, format: %d\n", fb->width, fb->height, fb->len, fb->format);

        // Run inference and draw boxes
        if (!resized_buf) {
            resized_buf = (uint8_t*)malloc(EI_CLASSIFIER_INPUT_WIDTH * EI_CLASSIFIER_INPUT_HEIGHT * 3);
        }
        if (!snapshot_buf) {
            snapshot_buf = (uint8_t*)malloc(fb->width * fb->height * 3);
        }
        if (!snapshot_buf) {
            Serial.println("Failed to allocate snapshot_buf");
            esp_camera_fb_return(fb);
            continue;
        }
        bool converted = fmt2rgb888(fb->buf, fb->len, fb->format, snapshot_buf);
        if(converted){
            swap_rb_channels(snapshot_buf, fb->width, fb->height); // Swap R and B channels
            // ei::image::processing::crop_and_interpolate_rgb888(snapshot_buf, fb->width, fb->height, resized_buf, EI_CLASSIFIER_INPUT_WIDTH, EI_CLASSIFIER_INPUT_HEIGHT);

            // ei::signal_t signal;
            // signal.total_length = EI_CLASSIFIER_INPUT_WIDTH * EI_CLASSIFIER_INPUT_HEIGHT;
            // signal.get_data = &ei_camera_get_data;

            // ei_impulse_result_t result = { 0 };
            // run_classifier(&signal, &result, debug_nn);

            // if (result.bounding_boxes_count > 0) {
            //     draw_bounding_boxes(fb, snapshot_buf, &result);
            // }
        } else {
            Serial.println("fmt2rgb888 failed");
        }

        // Convert snapshot_buf (RGB888 with drawings) back to fb->buf (RGB565)
        rgb888_to_rgb565(snapshot_buf, (uint16_t*)fb->buf, fb->width, fb->height);

        // Convert frame to JPEG for streaming
        uint8_t *jpg_buf = NULL;
        size_t jpg_buf_len = 0;
        bool ok = fmt2jpg(fb->buf, fb->len, fb->width, fb->height, fb->format, 90, &jpg_buf, &jpg_buf_len);
        
        esp_camera_fb_return(fb);

        if(ok){
            Serial.printf("JPEG conversion successful, size: %d\n", jpg_buf_len);
            client.print("--frame\r\n");
            client.print("Content-Type: image/jpeg\r\n");
            client.print("Content-Length: ");
            client.println(jpg_buf_len);
            client.println();
            client.write(jpg_buf, jpg_buf_len);
            client.println();
            Serial.println("Sent frame to client");
        } else {
            Serial.println("JPEG conversion failed");
        }
        free(jpg_buf);

        delay(100); // Limit frame rate
    }
    Serial.println("Stream client disconnected");
}

void handleJpg() {
    // Simplified single frame capture, without inference
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        server.send(500, "text/plain", "Failed to capture frame");
        return;
    }

    // Convert frame to JPEG for sending
    uint8_t *jpg_buf = NULL;
    size_t jpg_buf_len = 0;
    bool ok = fmt2jpg(fb->buf, fb->len, fb->width, fb->height, fb->format, 90, &jpg_buf, &jpg_buf_len);
    
    esp_camera_fb_return(fb);

    if(ok){
        server.sendHeader("Content-Type", "image/jpeg");
        server.sendHeader("Content-Length", String(jpg_buf_len));
        server.send(200, "image/jpeg", ""); // Send headers with empty content
        server.client().write(jpg_buf, jpg_buf_len); // Send the raw JPEG data
    } else {
        server.send(500, "text/plain", "Failed to convert frame to JPEG");
    }
    free(jpg_buf);
}

static int ei_camera_get_data(size_t offset, size_t length, float *out_ptr) {
    size_t pixel_ix = offset * 3;
    size_t pixels_left = length;
    size_t out_ptr_ix = 0;

    while (pixels_left != 0) {
        out_ptr[out_ptr_ix] = (resized_buf[pixel_ix + 0] << 16) | (resized_buf[pixel_ix + 1] << 8) | (resized_buf[pixel_ix + 2]);
        out_ptr_ix++;
        pixel_ix += 3;
        pixels_left--;
    }
    return 0;
}

// Helper function to convert RGB565 to ARGB8888
uint32_t rgb565_to_argb8888(uint16_t color565) {
    uint8_t r = (color565 >> 11) & 0x1F; // 5 bits red
    uint8_t g = (color565 >> 5) & 0x3F;  // 6 bits green
    uint8_t b = color565 & 0x1F;         // 5 bits blue

    // Expand to 8 bits
    r = (r * 255) / 31;
    g = (g * 255) / 63;
    b = (b * 255) / 31;

    return (0xFF << 24) | (r << 16) | (g << 8) | b; // Alpha 0xFF (opaque)
}

// Helper function to convert RGB888 to RGB565
void rgb888_to_rgb565(uint8_t *rgb888_buf, uint16_t *rgb565_buf, int width, int height) {
    for (int i = 0; i < width * height; i++) {
        uint8_t r = rgb888_buf[i * 3];
        uint8_t g = rgb888_buf[i * 3 + 1];
        uint8_t b = rgb888_buf[i * 3 + 2];

        rgb565_buf[i] = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
    }
}

void swap_rb_channels(uint8_t *rgb888_buf, int width, int height) {
    for (int i = 0; i < width * height * 3; i += 3) {
        uint8_t r = rgb888_buf[i];
        uint8_t b = rgb888_buf[i + 2];
        rgb888_buf[i] = b;
        rgb888_buf[i + 2] = r;
    }
}

static void draw_bounding_boxes(camera_fb_t *original_fb, uint8_t *rgb888_buf, ei_impulse_result_t *result) {
    float scale = (float)original_fb->width / EI_CLASSIFIER_INPUT_WIDTH;

    // Create a dummy camera_fb_t for the RGB888 buffer
    camera_fb_t rgb888_fb;
    rgb888_fb.buf = rgb888_buf;
    rgb888_fb.width = original_fb->width;
    rgb888_fb.height = original_fb->height;
    rgb888_fb.format = PIXFORMAT_RGB888; // This is important for fb_gfx to interpret correctly
    rgb888_fb.len = original_fb->width * original_fb->height * 3;

    // Create fb_data_t from rgb888_fb
    fb_data_t fb_data;
    fb_data.width = rgb888_fb.width;
    fb_data.height = rgb888_fb.height;
    fb_data.data = rgb888_fb.buf;
    fb_data.bytes_per_pixel = 3; // For RGB888
    fb_data.format = FB_RGB888; // Assuming FB_RGB888 is the correct enum for RGB888 in fb_gfx

    for (uint32_t i = 0; i < result->bounding_boxes_count; i++) {
        ei_impulse_result_bounding_box_t bb = result->bounding_boxes[i];
        if (bb.value > 0.6) {
            Serial.printf("Found %s (%f) [x: %d, y: %d, w: %d, h: %d]\n", bb.label, bb.value, bb.x, bb.y, bb.width, bb.height);
            uint16_t color565 = 0x07E0; // Green
            if (strcmp(bb.label, "Javier") == 0) color565 = 0x001F; // Blue
            else if (strcmp(bb.label, "mano") == 0) color565 = 0xF800; // Red

            uint32_t color_argb = rgb565_to_argb8888(color565);

            // Use fb_data for drawing functions
            fb_gfx_fillRect(&fb_data, bb.x * scale, bb.y * scale, bb.width * scale, bb.height * scale, color_argb); // Use ARGB color for fb_gfx_fillRect
            fb_gfx_print(&fb_data, (bb.x * scale), (bb.y * scale) - 10, color_argb, bb.label);
        }
    }
}
