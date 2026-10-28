import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDist = path.resolve(__dirname, "../dist");

const backendPublic = path.resolve(__dirname, "../../backend/public");

async function deploy() {
  console.log("\nBuilding UAT package...\n");

  if (!(await fs.pathExists(frontendDist))) {
    throw new Error("Frontend build not found.\nRun npm run build first.");
  }

  await fs.emptyDir(backendPublic);

  await fs.copy(frontendDist, backendPublic);

  console.log("\nUAT deployment completed successfully.\n");
}

deploy().catch((err) => {
  console.error(err);
  process.exit(1);
});
