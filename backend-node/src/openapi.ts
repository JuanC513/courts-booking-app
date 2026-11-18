import { readFileSync } from "node:fs";
import { parse } from "yaml";

// El contrato vive en la raíz del repositorio (docs/openapi.yaml) porque lo comparten los dos backends.
// La ruta se calcula desde este archivo: src/openapi.ts (o dist/openapi.js) → ../../docs/openapi.yaml
const specUrl = new URL("../../docs/openapi.yaml", import.meta.url);

// Se lee una sola vez, al arrancar. Si el archivo no existe o el YAML está mal, la API no arranca.
export const openApiSpec = parse(readFileSync(specUrl, "utf8"));
