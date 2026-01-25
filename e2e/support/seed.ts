import { admin } from "e2e/utils/adminClient";

export async function seedTestData() {
  const { error } = await admin.rpc('seed_test_data');
  if (error) throw error;
}