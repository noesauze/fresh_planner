import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey)

async function ensureSchema() {
  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql')
  const sql = fs.readFileSync(schemaPath, 'utf8')
  const { error } = await supabase.rpc('exec_sql', { sql })
  if (error) {
    console.warn('Direct SQL RPC not available; please run schema.sql manually in SQL editor.')
  }
}

async function ensureBucket() {
  // create bucket via storage API is not exposed in client; recommend manual or SQL
  // We'll attempt upload to detect bucket; otherwise, print instruction.
  const test = new Blob(['ok'], { type: 'text/plain' })
  const pathKey = `images/healthcheck-${crypto.randomUUID()}.txt`
  const { error } = await supabase.storage.from('images').upload(pathKey, test, { upsert: false, contentType: 'text/plain' })
  if (error) {
    console.warn('Bucket images may be missing. Create public bucket named "images".')
  } else {
    await supabase.storage.from('images').remove([pathKey])
  }
}

async function seedRecipes() {
  const { data: existing, error: listErr } = await supabase.from('recipes').select('id').limit(1)
  if (listErr) {
    console.error('Cannot read recipes table. Ensure schema and policies are applied.')
    process.exit(1)
  }
  if (existing && existing.length > 0) {
    console.log('Recipes already exist. Skipping seed.')
    return
  }
  const file = path.resolve(process.cwd(), 'supabase/sampleRecipes.json')
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'))
  const { error } = await supabase.from('recipes').insert(payload.recipes)
  if (error) {
    console.error('Insert failed:', error)
    process.exit(1)
  }
  console.log('Seeded recipes.')
}

await ensureSchema()
await ensureBucket()
await seedRecipes()
console.log('Done.')



