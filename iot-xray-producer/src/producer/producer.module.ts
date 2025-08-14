import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { exchangeName } from 'src/lib/const';
import { ProducerService } from './producer.service';
import { ProducerController } from './producer.controller';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>(
          'RABBITMQ_URI',
          'amqp://guest:guest@localhost:5672',
        );
        const prefetchCount = Number(
          configService.get<number>('RABBITMQ_PREFETCH_COUNT', 10),
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
