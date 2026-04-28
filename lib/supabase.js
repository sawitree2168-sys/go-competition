import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bqyokjwuxyziripijbs.supabase.co'
const supabaseKey = 'sb_publishable_FKKNP1sxFf0MnCTwEY3ZgA_DBEhdcqI'

export const supabase = createClient(supabaseUrl, supabaseKey)