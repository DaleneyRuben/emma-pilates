import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const controllerFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return controllerFiles(path);
    return name.endsWith('.controller.ts') ? [path] : [];
  });

// Nest answers 200 unless the handler sets NO_CONTENT. The OpenAPI
// decorator does not change the runtime status, so a documented 204 that
// omits the code is the bug the Client app hits on cancel.
const routesMissingNoContent = (source: string): string[] =>
  [...source.matchAll(/\n {2}async ([A-Za-z0-9]+)\(/g)].flatMap((match) => {
    const previousMethod = source.lastIndexOf('\n  async ', match.index - 1);
    const classStart = source.lastIndexOf('\nexport class ', match.index);
    const decorators = source.slice(
      Math.max(previousMethod, classStart),
      match.index,
    );
    if (!decorators.includes('@ApiNoContentResponse()')) return [];
    if (decorators.includes('@HttpCode(HttpStatus.NO_CONTENT)')) return [];
    return [match[1]];
  });

const routesMissingOk = (source: string): string[] =>
  [...source.matchAll(/\n {2}async ([A-Za-z0-9]+)\(/g)].flatMap((match) => {
    const previousMethod = source.lastIndexOf('\n  async ', match.index - 1);
    const classStart = source.lastIndexOf('\nexport class ', match.index);
    const decorators = source.slice(
      Math.max(previousMethod, classStart),
      match.index,
    );
    if (!decorators.includes('@Post(')) return [];
    if (!decorators.includes('@ApiOkResponse(')) return [];
    if (decorators.includes('@HttpCode(HttpStatus.OK)')) return [];
    return [match[1]];
  });

describe('a route that documents 204', () => {
  it('sets HttpCode NO_CONTENT on the same handler', () => {
    const root = join(__dirname, '..');
    const missing = controllerFiles(root).flatMap((file) =>
      routesMissingNoContent(readFileSync(file, 'utf8')).map(
        (handler) => `${file.slice(root.length + 1)} ${handler}`,
      ),
    );
    expect(missing).toEqual([]);
  });
});

describe('a POST that documents 200', () => {
  it('sets HttpCode OK on the same handler', () => {
    const root = join(__dirname, '..');
    const missing = controllerFiles(root).flatMap((file) =>
      routesMissingOk(readFileSync(file, 'utf8')).map(
        (handler) => `${file.slice(root.length + 1)} ${handler}`,
      ),
    );
    expect(missing).toEqual([]);
  });
});
