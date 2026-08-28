import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule configuration', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
      return;
    }

    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('rejects startup when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;

    await expect(
      Test.createTestingModule({ imports: [AppModule] }).compile(),
    ).rejects.toThrow('DATABASE_URL');
  });
});
