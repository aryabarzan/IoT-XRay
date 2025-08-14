import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('APP_PORT') || 3001;

  configureSwagger(app);
  configureValidation(app);

  await app.listen(port);
}

function configureValidation(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
}

function configureSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Api documentation')
    .setDescription('The API used to show x-ray test producer')
    .setVersion('1.0')
    .build();

  const documentFactory = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory);
}

bootstrap();
