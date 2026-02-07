# 🏗️ Arquitectura Completa Kittypau IoT

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura de Desarrollo (Local)](#arquitectura-de-desarrollo-local)
3. [Arquitectura de Producción (Cloud)](#arquitectura-de-producción-cloud)
4. [Flujo de Datos Completo](#flujo-de-datos-completo)
5. [Implementación Paso a Paso](#implementación-paso-a-paso)
6. [Migración de Desarrollo a Producción](#migración-de-desarrollo-a-producción)

---

## 🎯 Visión General

### Dos Ambientes Complementarios

```
┌─────────────────────────────────────────────────────────────┐
│                     DESARROLLO LOCAL                         │
│                      (Docker 🐳)                             │
├─────────────────────────────────────────────────────────────┤
│  ✅ GRATIS                                                   │
│  ✅ Rápido de configurar                                     │
│  ✅ Funciona sin internet                                    │
│  ✅ Base de datos local (PostgreSQL)                         │
│  ✅ MQTT local (Mosquitto)                                   │
│  ✅ Hot reload automático                                    │
│  ✅ Ideal para: Programar y probar                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   PRODUCCIÓN CLOUD                           │
│           (Supabase + HiveMQ + Vercel ☁️)                   │
├─────────────────────────────────────────────────────────────┤
│  ✅ GRATIS hasta 100 dispositivos                            │
│  ✅ Escalable a millones de usuarios                         │
│  ✅ Alta disponibilidad (99.9% uptime)                       │
│  ✅ Base de datos gestionada (Supabase)                      │
│  ✅ MQTT en la nube (HiveMQ)                                 │
│  ✅ Deploy automático (Vercel)                               │
│  ✅ Ideal para: Usuarios reales y demos                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏠 Arquitectura de Desarrollo (Local)

### Diagrama - Desarrollo con Docker

```mermaid
graph TB
    subgraph "Tu Computador 💻"
        subgraph "Docker Compose"
            ESP32_LOCAL[ESP32 en tu mesa<br/>WiFi Local] -->|MQTT 1883| MQTT_LOCAL[Mosquitto<br/>Docker Container]
            
            MQTT_LOCAL -->|Mensajes| API_LOCAL[Backend API<br/>Node.js + Express<br/>Docker Container]
            
            API_LOCAL -->|SQL| DB_LOCAL[(PostgreSQL<br/>Docker Container)]
            
            FRONTEND_LOCAL[Frontend React<br/>Vite Dev Server<br/>Docker Container] -->|HTTP| API_LOCAL
            
            NGINX_LOCAL[Nginx<br/>Reverse Proxy<br/>Docker Container] -->|Proxy| API_LOCAL
            NGINX_LOCAL -->|Proxy| FRONTEND_LOCAL
            
            ADMINER[Adminer<br/>DB Manager<br/>Docker Container] -->|Manage| DB_LOCAL
        end
        
        BROWSER[Navegador<br/>localhost:5173] -->|HTTP| NGINX_LOCAL
        DEV[Tú programando<br/>VS Code] -.->|Hot Reload| FRONTEND_LOCAL
        DEV -.->|Hot Reload| API_LOCAL
    end
    
    style MQTT_LOCAL fill:#6366f1
    style API_LOCAL fill:#2aa198
    style DB_LOCAL fill:#3ECF8E
    style FRONTEND_LOCAL fill:#61DAFB
    style NGINX_LOCAL fill:#269bd2
```

### Características Clave

| Componente | Puerto | Propósito | Datos Persistentes |
|------------|--------|-----------|-------------------|
| **PostgreSQL** | 5432 | Base de datos local | ✅ Volumen Docker |
| **Mosquitto** | 1883 | Broker MQTT local | ✅ Volumen Docker |
| **API Backend** | 3000 | REST API + MQTT Client | ❌ (código en host) |
| **Frontend** | 5173 | Dashboard React | ❌ (código en host) |
| **Nginx** | 80 | Reverse Proxy | ❌ |
| **Adminer** | 8080 | Gestión de BD | ❌ |

### Comandos Esenciales

```bash
# Iniciar todo el ambiente de desarrollo
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Ver qué está corriendo
docker compose ps

# Ver logs en tiempo real
docker compose logs -f

# Detener todo
docker compose down

# Limpiar y empezar de cero (⚠️ borra datos)
docker compose down -v
docker compose up --build -d
```

---

## ☁️ Arquitectura de Producción (Cloud)

### Diagrama - Producción en la Nube

```mermaid
graph TB
    subgraph "Dispositivos IoT 📡"
        ESP32_PROD1[ESP32 - Casa 1<br/>KPCL0001]
        ESP32_PROD2[ESP32 - Casa 2<br/>KPCL0002]
        ESP32_PROD3[ESP32 - Casa N<br/>KPCL000N]
    end
    
    subgraph "HiveMQ Cloud ☁️"
        MQTT_CLOUD[HiveMQ Broker<br/>MQTT over TLS<br/>Port 8883]
    end

    subgraph "Raspberry Pi Zero 2 W 🍓"
        RPI_BRIDGE[Bridge Node.js<br/>bridge.js 24/7<br/>systemd service<br/>Wildcard: +/SENSORS +/STATUS]
    end

    subgraph "Vercel ⚡"
        API_CLOUD[Backend API<br/>Serverless Functions<br/>/api/*]
        FRONTEND_CLOUD[Frontend React<br/>Static Hosting<br/>CDN Global]
    end
    
    subgraph "Supabase 🗄️"
        DB_CLOUD[(PostgreSQL<br/>Managed Database)]
        AUTH_CLOUD[Supabase Auth<br/>JWT Tokens]
        STORAGE_CLOUD[Supabase Storage<br/>Files & Photos]
        REALTIME_CLOUD[Realtime<br/>WebSocket]
    end
    
    subgraph "Usuarios 👥"
        WEB_USER[Usuario Web<br/>Navegador]
        MOBILE_USER[Usuario Móvil<br/>App React Native]
    end
    
    ESP32_PROD1 -->|MQTT/TLS| MQTT_CLOUD
    ESP32_PROD2 -->|MQTT/TLS| MQTT_CLOUD
    ESP32_PROD3 -->|MQTT/TLS| MQTT_CLOUD
    
    MQTT_CLOUD -->|MQTT/TLS| RPI_BRIDGE
    RPI_BRIDGE -->|Insert/Upsert| DB_CLOUD

    API_CLOUD -->|SQL Queries| DB_CLOUD
    API_CLOUD -->|Verify Token| AUTH_CLOUD
    API_CLOUD -->|Upload Files| STORAGE_CLOUD
    
    FRONTEND_CLOUD -->|REST API| API_CLOUD
    FRONTEND_CLOUD -->|Auth| AUTH_CLOUD
    FRONTEND_CLOUD -->|Real-time| REALTIME_CLOUD
    
    WEB_USER -->|HTTPS| FRONTEND_CLOUD
    MOBILE_USER -->|HTTPS| FRONTEND_CLOUD
    
    style MQTT_CLOUD fill:#6366f1
    style RPI_BRIDGE fill:#c7254e
    style API_CLOUD fill:#000
    style FRONTEND_CLOUD fill:#000
    style DB_CLOUD fill:#3ECF8E
    style AUTH_CLOUD fill:#3ECF8E
```

### Servicios Cloud Utilizados

| Servicio | Proveedor | Free Tier | Propósito |
|----------|-----------|-----------|-----------|
| **Base de Datos** | Supabase | 500MB + 2GB transfer | PostgreSQL gestionado |
| **Autenticación** | Supabase | Ilimitado | Login, JWT, OAuth |
| **Storage** | Supabase | 1GB | Fotos de mascotas |
| **Realtime** | Supabase | Incluido | WebSocket live updates |
| **MQTT Broker** | HiveMQ Cloud | 100 conexiones | Broker MQTT SSL |
| **Bridge MQTT** | Raspberry Pi Zero 2 W | Hardware ~$15 | MQTT -> Supabase 24/7 |
| **Backend API** | Vercel | 100GB-hours/mes | Serverless Functions |
| **Frontend** | Vercel | Ilimitado | Hosting estático + CDN |

---

## 🔄 Flujo de Datos Completo

### 1. Flujo de Telemetria (ESP8266 -> RPi Bridge -> Supabase -> Usuario)

```
┌──────────────────┐
│  ESP8266         │
│  KPCL0036/0037/  │
│  0038...         │
└──────┬───────────┘
       │ 1. Publica cada 10s (SENSORS) y 15s (STATUS)
       │ Topic: KPCL0038/SENSORS, KPCL0038/STATUS
       │ Payload: { weight: 150, temp: 26.6, hum: 39, ldr: 7 }
       ▼
┌──────────────────────┐
│  HiveMQ Cloud Broker │
│  Port 8883 (TLS)     │
└──────┬───────────────┘
       │ 2. Raspberry Pi suscrita con wildcard
       │ (+/SENSORS, +/STATUS)
       ▼
┌───────────────────────────┐
│  Raspberry Pi Zero 2 W   │
│  bridge.js (Node.js)     │
│  - Filtra prefijo KPCL   │
│  - Auto-registra devices │
│  - Parsea JSON            │
│  - Inserta en Supabase   │
└──────┬────────────────────┘
       │ 3. INSERT INTO sensor_readings / UPSERT devices
       ▼
┌───────────────────────┐
│  Supabase PostgreSQL  │
│  Tablas:              │
│  sensor_readings      │
│  devices              │
└──────┬────────────────┘
       │ 4. Trigger Realtime
       ▼
┌────────────────────────┐
│  Frontend (Next.js)    │
│  - Escucha Realtime    │
│  - Actualiza graficos  │
│  - Muestra estado      │
└────────────────────────┘
```

### 2. Flujo de Autenticación

```
Usuario ingresa email/password
       ↓
Frontend → Supabase Auth
       ↓
Supabase retorna JWT token
       ↓
Frontend guarda token en localStorage
       ↓
Cada request a API incluye header:
Authorization: Bearer <token>
       ↓
API valida token con Supabase
       ↓
Row Level Security (RLS) permite
solo ver datos del usuario actual
```

### 3. Flujo de Comandos (Usuario → ESP32)

```
Usuario presiona "Calibrar Sensor"
       ↓
Frontend POST /api/devices/KPCL0001/command
       ↓
API guarda comando en tabla commands
       ↓
ESP32 polling cada 10s:
GET /api/devices/KPCL0001/commands
       ↓
ESP32 ejecuta comando
       ↓
ESP32 publica resultado:
Topic: kittypau/KPCL0001/command-result
```

---

## 🛠️ Implementación Paso a Paso

### FASE 1: Desarrollo Local con Docker (Semana 1-2)

#### Día 1: Setup Docker

```bash
# 1. Clonar proyecto
git clone https://github.com/tu-usuario/kittypau-iot.git
cd kittypau-iot

# 2. Copiar variables de entorno
cp env.example .env

# 3. Editar .env con configuración local
nano .env
```

**.env (Desarrollo)**
```env
# PostgreSQL Local
POSTGRES_DB=kittypau_dev
POSTGRES_USER=kittypau
POSTGRES_PASSWORD=dev_password_123
DATABASE_URL=postgresql://kittypau:dev_password_123@postgres:5432/kittypau_dev

# MQTT Local
MQTT_BROKER_URL=mosquitto
MQTT_PORT=1883
MQTT_USERNAME=kittypau_device
MQTT_PASSWORD=dev_mqtt_pass

# API
NODE_ENV=development
PORT=3000

# Frontend
VITE_API_URL=http://localhost:3000
```

```bash
# 4. Levantar servicios
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 5. Verificar
docker compose ps
curl http://localhost:3000/health
```

#### Día 2-3: Desarrollar Backend

Crear estructura del backend:

```
api/
├── src/
│   ├── index.js              # Entry point
│   ├── routes/
│   │   ├── devices.js        # CRUD dispositivos
│   │   ├── sensors.js        # Lecturas de sensores
│   │   ├── pets.js           # CRUD mascotas
│   │   └── mqtt.js           # Webhook MQTT
│   ├── controllers/
│   │   ├── deviceController.js
│   │   ├── sensorController.js
│   │   └── mqttController.js
│   ├── models/
│   │   └── db.js             # Conexión PostgreSQL
│   ├── middleware/
│   │   ├── auth.js           # Validación JWT
│   │   └── errorHandler.js
│   └── utils/
│       └── logger.js
├── package.json
└── .env
```

**api/src/index.js**
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const deviceRoutes = require('./routes/devices');
const sensorRoutes = require('./routes/sensors');
const mqttRoutes = require('./routes/mqtt');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Routes
app.use('/api/devices', deviceRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/mqtt', mqttRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API running on http://localhost:${PORT}`);
});
```

**api/src/routes/mqtt.js**
```javascript
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Webhook de HiveMQ (usaremos después en producción)
router.post('/webhook', async (req, res) => {
  try {
    const { deviceId, temperature, humidity, weight, batteryLevel } = req.body;
    
    // Guardar en base de datos
    await pool.query(`
      INSERT INTO sensor_readings 
        (device_id, temperature, humidity, weight_grams, battery_level, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [deviceId, temperature, humidity, weight, batteryLevel]);
    
    // Actualizar last_seen del dispositivo
    await pool.query(`
      UPDATE devices 
      SET last_seen = NOW(), battery_level = $2, status = 'active'
      WHERE device_id = $1
    `, [deviceId, batteryLevel]);
    
    console.log(`✅ Telemetría guardada: ${deviceId}`);
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error guardando telemetría:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

#### Día 4-5: Desarrollar Frontend

```
client/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Devices.jsx
│   │   ├── Pets.jsx
│   │   └── Login.jsx
│   ├── components/
│   │   ├── DeviceCard.jsx
│   │   ├── SensorChart.jsx
│   │   └── Navbar.jsx
│   ├── hooks/
│   │   └── useAuth.js
│   └── lib/
│       └── api.js
├── package.json
└── vite.config.js
```

**client/src/lib/api.js**
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  async getDevices() {
    const res = await fetch(`${API_URL}/api/devices`);
    return res.json();
  },
  
  async getSensorReadings(deviceId, limit = 100) {
    const res = await fetch(`${API_URL}/api/sensors/${deviceId}?limit=${limit}`);
    return res.json();
  }
};
```

#### Día 6-7: Programar ESP32

**esp32/sensor_node/sensor_node.ino**

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi
const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";

// MQTT LOCAL (Docker)
const char* mqtt_server = "192.168.1.100"; // Tu IP local
const int mqtt_port = 1883;
const char* mqtt_user = "kittypau_device";
const char* mqtt_password = "dev_mqtt_pass";

const char* device_id = "KPCL0001";

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  
  // Conectar WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi conectado");
  
  // Configurar MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  
  connectMQTT();
}

void loop() {
  if (!client.connected()) {
    connectMQTT();
  }
  client.loop();
  
  // Publicar telemetría cada 60 segundos
  static unsigned long lastPublish = 0;
  if (millis() - lastPublish > 60000) {
    publishTelemetry();
    lastPublish = millis();
  }
}

void connectMQTT() {
  while (!client.connected()) {
    Serial.print("Conectando a MQTT...");
    
    if (client.connect(device_id, mqtt_user, mqtt_password)) {
      Serial.println(" ✅ Conectado");
      
      // Suscribirse a comandos
      String cmdTopic = "kittypau/" + String(device_id) + "/command";
      client.subscribe(cmdTopic.c_str());
      
    } else {
      Serial.print(" ❌ Falló, rc=");
      Serial.println(client.state());
      delay(5000);
    }
  }
}

void publishTelemetry() {
  StaticJsonDocument<256> doc;
  
  doc["deviceId"] = device_id;
  doc["temperature"] = random(20, 30);
  doc["humidity"] = random(50, 70);
  doc["weight"] = random(0, 5000);
  doc["batteryLevel"] = random(20, 100);
  doc["timestamp"] = millis();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  String topic = "kittypau/" + String(device_id) + "/telemetry";
  client.publish(topic.c_str(), buffer);
  
  Serial.println("📤 Telemetría enviada");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.println("📥 Mensaje recibido: " + String(topic));
  // Procesar comandos
}
```

**Probar ESP32:**

```bash
# En terminal, suscribirse a mensajes MQTT
docker compose exec mosquitto mosquitto_sub -h localhost -t "#" -v

# Deberías ver los mensajes del ESP32 cada 60s
```

---

### FASE 2: Configurar Servicios Cloud (Semana 3)

#### Paso 1: Crear Cuenta en Supabase

```bash
# 1. Ir a https://supabase.com
# 2. Sign up con GitHub
# 3. New Project:
#    - Name: kittypau-iot
#    - Database Password: [guardar en lugar seguro]
#    - Region: South America (São Paulo)
#    - Pricing: Free
```

**Guardar credenciales:**
```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Crear esquema en Supabase SQL Editor:**

```sql
-- Copiar y ejecutar el contenido de docker/postgres/init.sql
-- en el SQL Editor de Supabase
```

#### Paso 2: Crear Broker en HiveMQ Cloud

```bash
# 1. Ir a https://console.hivemq.cloud
# 2. Sign up gratis
# 3. Create Cluster:
#    - Name: kittypau-broker
#    - Plan: Serverless (Free)
#    - Region: Europe (EU)
```

**Credenciales:**
```
Cluster URL: xxxxx.s1.eu.hivemq.cloud
Port: 8883 (SSL)
Username: kittypau_device
Password: [crear una segura]
```

**Configurar Webhook:**
```
1. Extensions → Webhook Extension
2. URL: https://tu-app.vercel.app/api/mqtt/webhook
3. Topic Filter: kittypau/+/telemetry
4. Method: POST
5. Headers:
   x-webhook-token: tu_secret_token
```

#### Paso 3: Configurar Vercel

```bash
# Instalar CLI
npm i -g vercel

# Login
vercel login

# Vincular proyecto
cd kittypau-iot
vercel
```

**Configurar variables de entorno en Vercel:**

```bash
# Ir a: https://vercel.com/tu-usuario/kittypau-iot/settings/environment-variables

# Agregar:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
MQTT_WEBHOOK_SECRET=tu_secret_token
```

---

### FASE 3: Adaptar Código para Producción (Semana 4)

#### Paso 1: Crear estructura Vercel

**Crear `vercel.json`:**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    },
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "client/dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/client/$1"
    }
  ]
}
```

#### Paso 2: Adaptar API para Serverless

**api/mqtt/webhook.js** (Vercel Function):

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // Verificar webhook token
  const token = req.headers['x-webhook-token'];
  if (token !== process.env.MQTT_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { deviceId, temperature, humidity, weight, batteryLevel } = req.body;
    
    // Guardar en Supabase
    const { error } = await supabase
      .from('sensor_readings')
      .insert({
        device_id: deviceId,
        temperature,
        humidity,
        weight_grams: weight,
        battery_level: batteryLevel
      });
    
    if (error) throw error;
    
    // Actualizar dispositivo
    await supabase
      .from('devices')
      .update({ 
        last_seen: new Date().toISOString(),
        battery_level: batteryLevel,
        status: 'active'
      })
      .eq('device_id', deviceId);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
```

#### Paso 3: Adaptar Frontend para Supabase

**client/src/lib/supabase.js:**

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**client/src/hooks/useAuth.js:**

```javascript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { user, loading, signIn, signOut };
}
```

#### Paso 4: Programar ESP32 para Producción

**esp32/sensor_node_prod/sensor_node_prod.ino:**

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi
const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";

// MQTT PRODUCCIÓN (HiveMQ Cloud)
const char* mqtt_server = "xxxxx.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "kittypau_device";
const char* mqtt_password = "tu_password_segura";

const char* device_id = "KPCL0001";

WiFiClientSecure espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  
  // Conectar WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi conectado");
  
  // Configurar SSL (insecure para HiveMQ free tier)
  espClient.setInsecure();
  
  // Configurar MQTT
  client.setServer(mqtt_server, mqtt_port);
  
  connectMQTT();
}

void loop() {
  if (!client.connected()) {
    connectMQTT();
  }
  client.loop();
  
  static unsigned long lastPublish = 0;
  if (millis() - lastPublish > 60000) {
    publishTelemetry();
    lastPublish = millis();
  }
}

void connectMQTT() {
  while (!client.connected()) {
    Serial.print("Conectando a HiveMQ Cloud...");
    
    if (client.connect(device_id, mqtt_user, mqtt_password)) {
      Serial.println(" ✅ Conectado");
    } else {
      Serial.print(" ❌ Falló, rc=");
      Serial.println(client.state());
      delay(5000);
    }
  }
}

void publishTelemetry() {
  StaticJsonDocument<256> doc;
  
  doc["deviceId"] = device_id;
  doc["temperature"] = readTemperature();
  doc["humidity"] = readHumidity();
  doc["weight"] = readWeight();
  doc["batteryLevel"] = readBattery();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  String topic = "kittypau/" + String(device_id) + "/telemetry";
  
  if (client.publish(topic.c_str(), buffer)) {
    Serial.println("✅ Enviado a HiveMQ Cloud");
  } else {
    Serial.println("❌ Error enviando");
  }
}

float readTemperature() {
  // Implementar lectura real de sensor
  return 23.5;
}

float readHumidity() {
  return 65.0;
}

int readWeight() {
  return 0;
}

int readBattery() {
  return 85;
}
```

#### Paso 5: Deploy

```bash
# 1. Commit cambios
git add .
git commit -m "Listo para producción"
git push origin main

# 2. Deploy a Vercel
vercel --prod

# 3. Vercel te dará una URL:
# https://kittypau-iot.vercel.app
```

**Actualizar webhook de HiveMQ:**
```
URL: https://kittypau-iot.vercel.app/api/mqtt/webhook
```

---

## 🔄 Migración de Desarrollo a Producción

### Variables de Entorno

**Desarrollo (.env local):**
```env
DATABASE_URL=postgresql://kittypau:dev_password_123@postgres:5432/kittypau_dev
MQTT_BROKER_URL=mosquitto
MQTT_PORT=1883
VITE_API_URL=http://localhost:3000
```

**Producción (Vercel Environment Variables):**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
MQTT_WEBHOOK_SECRET=secret123
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### Checklist de Migración

```bash
✅ Base de datos migrada (exportar de Docker → importar a Supabase)
✅ API adaptada para Serverless (Vercel Functions)
✅ Frontend usando Supabase Auth
✅ ESP32 programado para HiveMQ Cloud
✅ Webhook configurado en HiveMQ
✅ Variables de entorno en Vercel
✅ Deploy exitoso
✅ Testing end-to-end
```

---

## 📊 Comparación de Arquitecturas

| Aspecto | Desarrollo (Docker) | Producción (Cloud) |
|---------|-------------------|-------------------|
| **Costo** | $0 | $0 hasta 100 dispositivos |
| **Setup** | 5 minutos | 30 minutos |
| **Internet** | No requerido | Requerido |
| **Escalabilidad** | Limitada a tu PC | Millones de usuarios |
| **Persistencia** | Mientras no hagas `down -v` | Permanente |
| **Velocidad** | Muy rápida (local) | Depende de internet |
| **Ideal para** | Desarrollo y testing | Usuarios reales |

---

## 🎯 Resumen

### Desarrollo Local (Docker)
```bash
# Comando único para todo
docker compose up -d

# Servicios:
✅ PostgreSQL local
✅ Mosquitto MQTT local
✅ API con hot reload
✅ Frontend con hot reload
✅ Adminer para ver BD
```

### Producción Cloud
```bash
# Servicios gestionados:
✅ Supabase (BD + Auth + Storage)
✅ HiveMQ Cloud (MQTT)
✅ Vercel (API + Frontend)

# Deploy:
vercel --prod
```

### Flujo de Trabajo
```
1. Desarrollar localmente con Docker
2. Hacer git commit
3. git push origin main
4. Vercel auto-deploy
5. ¡Listo en producción!
```

---

**¡Arquitectura completa lista para escalar de 1 a 1,000,000 de usuarios! 🚀**
