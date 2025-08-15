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
      useFactory: (configService: ConfigService) => {
        const uri = configService.getOrThrow<string>('RABBITMQ_URI');
        const prefetchCount = Number(
          configService.getOrThrow<number>('RABBITMQ_PREFETCH_COUNT'),
        );

        return {
          exchanges: [
            {
              name: exchangeName,
              type: 'topic',
              options: {
                durable: true,
              },
            },
          ],
          uri,
          prefetchCount,
        };
      },
    }),
  ],
  providers: [ProducerService],
  controllers: [ProducerController],
  exports: [ProducerService],
})
export class ProducerModule {}
