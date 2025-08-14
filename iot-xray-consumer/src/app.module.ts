import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConsumerModule } from './consumer';
import { exchangeName } from './lib/const';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),
    ConsumerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
