import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { exchangeName } from 'src/lib/exchange';
import { ProducerController } from './producer.controller';
import { ProducerService } from './producer.service';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        exchanges: [
          {
            name: exchangeName,
            type: 'topic',
            options: {
              durable: true,
            },
          },
        ],
        uri: configService.getOrThrow<string>('RABBITMQ_URI'),
        prefetchCount: configService.getOrThrow<number>(
          'RABBITMQ_PREFETCH_COUNT',
        ),
      }),
    }),
  ],
  providers: [ProducerService],
  controllers: [ProducerController],
  exports: [ProducerService],
})
export class ProducerModule {}
