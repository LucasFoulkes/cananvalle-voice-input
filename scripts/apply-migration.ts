import { supabase } from '../src/lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyMigration() {
    try {
        const sql = readFileSync(
            join(__dirname, '../supabase/migrations/20250103_insertar_observacion.sql'),
            'utf-8'
        )

        const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

        if (error) {
            console.error('Migration failed:', error)
            process.exit(1)
        }

        console.log('Migration applied successfully!')
    } catch (err) {
        console.error('Error applying migration:', err)
        process.exit(1)
    }
}

applyMigration()
