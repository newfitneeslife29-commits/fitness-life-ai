import { defineConfig } from 'vitest/config';

// Las pruebas del servidor arrancan Postgres embebido (PGlite) y Socket.IO real: en máquinas lentas de CI
// (macOS de GitHub) pueden pasar de 5 s, así que se da más margen.
export default defineConfig({
  test: { testTimeout: 30000, hookTimeout: 30000 },
});
