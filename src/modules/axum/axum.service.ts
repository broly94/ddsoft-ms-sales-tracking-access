import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TrackingCheckin } from '@/common/contracts/tracking.contract';

@Injectable()
export class AxumService {
  private readonly logger = new Logger(AxumService.name);
  private readonly baseUrl = 'https://gateway.axum.com.ar/didonato/api/v1';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getCheckinCheckout(
    fechaDesde: string,
    fechaHasta: string,
    codigoEmpleado?: string,
    codigoCliente?: string,
  ): Promise<TrackingCheckin[]> {
    const apiKey = this.configService.get<string>('AXUM_API_KEY');
    if (!apiKey) {
      this.logger.error('AXUM_API_KEY no encontrada en la configuración');
      throw new Error('Axum API Key missing');
    }

    // Lógica de fecha inclusiva (+1 día)
    let fechaHastaInclusive = fechaHasta;
    try {
        const dtHasta = new Date(fechaHasta);
        dtHasta.setDate(dtHasta.getDate() + 1);
        fechaHastaInclusive = dtHasta.toISOString().split('T')[0];
    } catch (e) {
        this.logger.error(`Error procesando fecha inclusiva: ${e.message}`);
    }

    const params: any = {
      fechaDesde,
      fechaHasta: fechaHastaInclusive,
    };

    if (codigoEmpleado) params.codigoEmpleado = codigoEmpleado;
    if (codigoCliente) params.codigoCliente = codigoCliente;

    try {
      this.logger.log(`Consultando Axum desde ${fechaDesde} hasta ${fechaHastaInclusive}`);
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/checkincheckout`, {
          headers: {
            'x-api-key': apiKey,
            Accept: 'application/json',
          },
          params,
          timeout: 30000,
        }),
      );

      const rawRecords = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      return this.normalizeRecords(rawRecords);
    } catch (error) {
      this.logger.error(`Error consultando API de Axum: ${error.message}`);
      throw error;
    }
  }

  private normalizeRecords(rawRecords: any[]): TrackingCheckin[] {
    return rawRecords.map((r) => {
      try {
        // Campos raw de motivo (se pasan tal cual para que el procesador Python los lea igual que antes)
        const motivoCheckin = r.motivoCheckinInvalido != null ? String(r.motivoCheckinInvalido) : '';
        const motivoCheckout = r.motivoCheckoutInvalido != null ? String(r.motivoCheckoutInvalido) : '';

        const motivo1 = motivoCheckin.trim();
        const motivo2 = motivoCheckout.trim();
        const esValido = !(motivo1 || motivo2);
        const motivo = !esValido ? `${motivo1} ${motivo2}`.trim() : null;

        const codCompuesto = String(r.codigoCliente || '');
        const partes = codCompuesto.split('.');
        const clienteCodigo = partes[0];
        const vendedorCodigo = r.codigoEmpleado || (partes[1] || 'DESCONOCIDO');

        // Axum envía coordenadasCheckin como "lat;lon" — separar correctamente
        const parseCoordenadas = (s: string): [number | null, number | null] => {
          if (!s) return [null, null];
          const parts = s.split(';');
          const lat = parseFloat(parts[0]);
          const lon = parseFloat(parts[1]);
          return [isNaN(lat) ? null : lat, isNaN(lon) ? null : lon];
        };
        const [latCi, lonCi] = parseCoordenadas(r.coordenadasCheckin || '');
        const [latCo, lonCo] = parseCoordenadas(r.coordenadasCheckout || '');

        return {
          vendedor_codigo: String(vendedorCodigo),
          cliente_codigo: String(clienteCodigo),
          fecha_checkin: r.fechaCheckin,
          fecha_checkout: r.fechaCheckout,
          latitud_checkin: latCi,
          longitud_checkin: lonCi,
          latitud_checkout: latCo,
          longitud_checkout: lonCo,
          es_valido: esValido,
          motivo_invalido: motivo,
          motivo_checkin_invalido: motivoCheckin,
          motivo_checkout_invalido: motivoCheckout,
          fuente: 'AXUM',
          metadata: {
            axum_id: r.id,
            nombre_cliente: r.nombreCliente,
          },
        };
      } catch (e) {
        this.logger.error(`Error normalizando registro de Axum: ${e.message}`);
        return null;
      }
    }).filter(x => x !== null);
  }
}
