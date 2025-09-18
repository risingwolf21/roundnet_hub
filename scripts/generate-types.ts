// scripts/generate-types.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type TableConfig = {
  name: string;
  typeName: string;
  rowName: string;
};

const tables: TableConfig[] = [
  { name: 'permissions', rowName: "name", typeName: 'Permission' },
  { name: 'features', rowName: "name", typeName: 'Feature' },
];

async function generateTypes() {
  const typeStrings: string[] = [];

  for (const { name, typeName, rowName } of tables) {
    const { data, error } = await supabase.schema("public").from(name).select("*");
    console.log(data, error)
    if (error) {
      console.error(`Fehler beim Abrufen der Tabelle "${name}":`, error.message);
      continue;
    }

    if (!data || data.length === 0) {
      console.warn(`Keine Daten in Tabelle "${name}" gefunden.`);
      continue;
    }

    const typeDef = `export type ${typeName} = ${data.map(x => `"${x[rowName]}"`).join('|\n')};`;
    typeStrings.push(typeDef);
  }

  const fileContent = `// Auto-generiert – nicht manuell bearbeiten\n\n${typeStrings.join('\n\n')}\n`;
  const filePath = path.join(__dirname, '../src/generated/supabase-types.ts');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, fileContent, 'utf-8');
  console.log(`Typdefinitionen erfolgreich geschrieben nach: ${filePath}`);
}

generateTypes();
