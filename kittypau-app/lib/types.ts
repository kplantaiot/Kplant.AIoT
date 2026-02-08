export interface Profile {
  id: string
  email: string
  auth_provider: 'google' | 'apple' | 'email'
  user_name: string
  is_owner: boolean
  owner_name: string | null
  care_rating: number
  phone_number: string | null
  notification_channel: 'app' | 'whatsapp' | 'email' | 'whatsapp_email'
  city: string | null
  country: string | null
  onboarding_step: 'profile' | 'pet' | 'device' | 'completed'
  created_at: string
  updated_at: string
}

export interface Pet {
  id: string
  user_id: string
  name: string
  type: 'cat' | 'dog'
  origin: 'comprado' | 'rescatado' | 'llego_solo' | 'regalado' | null
  is_neutered: boolean | null
  has_neuter_tattoo: boolean | null
  has_microchip: boolean | null
  living_environment: 'departamento' | 'casa' | 'patio' | 'exterior' | null
  size: 'pequeno' | 'mediano' | 'grande' | 'gigante' | null
  age_range: 'cachorro' | 'adulto' | 'senior' | null
  weight_kg: number | null
  activity_level: 'bajo' | 'normal' | 'activo' | 'muy_activo' | null
  alone_time: 'casi_nunca' | 'algunas_horas' | 'medio_dia' | 'todo_el_dia' | null
  has_health_condition: boolean
  health_notes: string | null
  photo_url: string | null
  pet_state: 'created' | 'completed_profile' | 'device_pending' | 'device_linked' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Device {
  device_id: string
  id: string
  owner_id: string | null
  pet_id: string | null
  device_type: string | null
  device_state: 'factory' | 'claimed' | 'linked' | 'offline' | 'lost'
  wifi_status: string | null
  wifi_ssid: string | null
  wifi_ip: string | null
  sensor_health: string | null
  firmware_version: string | null
  battery_level: number | null
  last_seen: string | null
  created_at: string
  updated_at: string
}

export interface SensorReading {
  id: number
  device_id: string
  weight_grams: number | null
  water_ml: number | null
  temperature: number | null
  humidity: number | null
  light_lux: number | null
  light_percent: number | null
  light_condition: 'dark' | 'dim' | 'normal' | 'bright' | null
  battery_level: number | null
  device_timestamp: string | null
  recorded_at: string
}

export interface Breed {
  id: string
  name: string
  species: 'cat' | 'dog'
  is_mixed: boolean
  is_unknown: boolean
}
