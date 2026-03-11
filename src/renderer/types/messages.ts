// Protobuf 消息类型定义（根据 messages.proto 生成）

// 下行消息类型（Server -> Client）
export interface GameStatus {
  current_round: number;
  total_rounds: number;
  red_score: number;
  blue_score: number;
  current_stage: number;
  stage_countdown_sec: number;
  stage_elapsed_sec: number;
  is_paused: boolean;
}

export interface GlobalUnitStatus {
  base_health: number;
  base_status: number;
  base_shield: number;
  outpost_health: number;
  outpost_status: number;
  robot_health: number[];
  robot_bullets: number[];
  total_damage_red: number;
  total_damage_blue: number;
}

export interface RobotDynamicStatus {
  current_health: number;
  current_heat: number;
  last_projectile_fire_rate: number;
  current_chassis_energy: number;
  current_buffer_energy: number;
  current_experience: number;
  experience_for_upgrade: number;
  total_projectiles_fired: number;
  remaining_ammo: number;
  is_out_of_combat: boolean;
  out_of_combat_countdown: number;
  can_remote_heal: boolean;
  can_remote_ammo: boolean;
}

export interface RobotStaticStatus {
  connection_state: number;
  field_state: number;
  alive_state: number;
  robot_id: number;
  robot_type: number;
  performance_system_shooter: number;
  performance_system_chassis: number;
  level: number;
  max_health: number;
  max_heat: number;
  heat_cooldown_rate: number;
  max_power: number;
  max_buffer_energy: number;
  max_chassis_energy: number;
}

export interface RobotPosition {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface MapClickInfoNotify {
  is_send_all: number;
  robot_id: Uint8Array;
  mode: number;
  enemy_id: number;
  ascii: number;
  type: number;
  screen_x: number;
  screen_y: number;
  map_x: number;
  map_y: number;
}

export interface Event {
  event_id: number;
  param: string;
}

export interface Buff {
  robot_id: number;
  buff_type: number;
  buff_level: number;
  buff_max_time: number;
  buff_left_time: number;
  msg_params: string;
}

export interface PenaltyInfo {
  penalty_type: number;
  penalty_effect_sec: number;
  total_penalty_num: number;
}

// MQTT 消息包装
export interface MqttMessage {
  topic: string;
  messageType: string;
  timestamp: number;
  payload: any;
}

// 连接配置
export interface ConnectionConfig {
  mqttServer: string;
  mqttPort: number;
  udpVideoPort: number;
}

// 连接状态
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
