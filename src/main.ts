import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SyncService } from './sync/sync.service';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  // Swagger Support
  const config = new DocumentBuilder()
    .setTitle('Dashboard API')
    .setDescription('Backend API providing data for pools delegators account.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  // Data Sync Worker
  const syncService = app.get(SyncService);
  syncService.start();
  // Http Server
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
