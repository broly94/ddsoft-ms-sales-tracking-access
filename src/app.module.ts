import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AxumService } from './modules/axum/axum.service';
import { TrackingController } from './modules/tracking/tracking.controller';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [TrackingController],
  providers: [AxumService],
})
export class AppModule {}
