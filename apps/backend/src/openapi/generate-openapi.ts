import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ApiModule } from '../api.module';
import { configureApplication } from '../http/configure-application';

async function generateOpenApi(): Promise<void> {
  const app = await NestFactory.create(ApiModule, { logger: false });

  try {
    const document = configureApplication(app);
    const outputPath = resolve(process.cwd(), 'openapi/openapi.json');

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`);
  } finally {
    await app.close();
  }
}

void generateOpenApi();
