import { seedTestData } from "./support/seed";

beforeAll(async () => {
  // EINMAL für den kompletten Run
  await seedTestData();
});