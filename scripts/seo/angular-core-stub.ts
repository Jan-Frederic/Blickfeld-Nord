// Ersatz für @angular/core, damit band.service.ts außerhalb von Angular (in Node) geladen werden kann
export function Injectable(_options?: unknown) {
  return <T>(target: T) => target;
}
