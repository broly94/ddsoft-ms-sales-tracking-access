import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AxumService } from '../axum/axum.service';
import { GetTrackingParams, TrackingCheckin } from '@/common/contracts/tracking.contract';

@Controller()
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(private readonly axumService: AxumService) {}

  @MessagePattern({ cmd: 'tracking.get_checkins' })
  async handleGetCheckins(@Payload() data: GetTrackingParams): Promise<TrackingCheckin[]> {
    this.logger.log(`Petición recibida: ${data.fecha_desde} - ${data.fecha_hasta} (Fuente: ${data.fuente || 'AXUM'})`);

    try {
      // Por ahora solo AXUM, pero aquí se puede bifurcar la lógica a futuro
      if (!data.fuente || data.fuente === 'AXUM') {
        return await this.axumService.getCheckinCheckout(
          data.fecha_desde,
          data.fecha_hasta,
          data.vendedor_id,
          data.cliente_id,
        );
      }

      this.logger.warn(`Fuente de tracking desconocida: ${data.fuente}`);
      return [];
    } catch (error) {
      this.logger.error(`Error en handleGetCheckins: ${error.message}`);
      return [];
    }
  }
}
