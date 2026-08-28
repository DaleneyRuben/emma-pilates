import { INestApplication, VersioningType } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export function configureApplication(app: INestApplication): OpenAPIObject {
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
  });

  const openApiConfig = new DocumentBuilder()
    .setTitle('Emma Pilates API')
    .setVersion('1.0.0')
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup('docs', app, openApiDocument, {
    jsonDocumentUrl: 'openapi.json',
  });

  return openApiDocument;
}
