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
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'opaque' })
    // ADR-0084: the admin web's host-only HttpOnly session cookie.
    .addCookieAuth(
      '__Host-emma-admin-session',
      { type: 'apiKey', in: 'cookie' },
      'adminWebSession',
    )
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup('docs', app, openApiDocument, {
    jsonDocumentUrl: 'openapi.json',
  });

  return openApiDocument;
}
