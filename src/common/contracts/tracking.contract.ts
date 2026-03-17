/**
 * Contrato agnóstico para datos de tracking (GPS/Checkins).
 */
export interface TrackingCheckin {
  vendedor_codigo: string;
  cliente_codigo: string;
  fecha_checkin: Date | string;
  fecha_checkout?: Date | string;
  latitud_checkin?: number;
  longitud_checkin?: number;
  latitud_checkout?: number;
  longitud_checkout?: number;
  es_valido: boolean;
  motivo_invalido?: string;
  
  // Compatibilidad con procesadores heredados (Python)
  motivo_checkin_invalido?: string;
  motivo_checkout_invalido?: string;
  
  fuente: string; // "AXUM", "GOOGLE", etc.
  metadata?: Record<string, any>;
}

export interface GetTrackingParams {
  fecha_desde: string;
  fecha_hasta: string;
  vendedor_id?: string;
  cliente_id?: string;
  fuente?: string;
}
