// src/camera_manager.h
#pragma once

#include "esp_camera.h"

/**
 * @brief Inicializa la cámara con la configuración específica para la placa AI-THINKER.
 * 
 * Configura los pines, el formato de píxeles (JPEG), el tamaño del frame (VGA)
 * y la frecuencia de reloj. Imprime el estado en el Serial Monitor.
 */
void cameraInit();

/**
 * @brief Captura un frame de la cámara.
 * 
 * @return Un puntero al buffer del frame (camera_fb_t*).
 *         El llamador es responsable de liberar este buffer usando esp_camera_fb_return().
 *         Retorna NULL si la captura falla.
 */
camera_fb_t* cameraCapture();
