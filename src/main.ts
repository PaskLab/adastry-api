import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS
  const whitelist = process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',')
    : [];
  app.enableCors({
    origin: function (origin, callback) {
      if (!origin || whitelist.indexOf(new URL(origin).hostname) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  });
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
  if (process.env.NODE_ENV === 'development') {
    // Swagger Support
    const config = new DocumentBuilder()
      .setTitle('Adastry API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('', app, document);
  }
  // Http Server
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
