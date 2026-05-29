import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lwxxlhsxvidodeijthxw.supabase.co'
const SUPABASE_KEY = 'sb_publishable_k1tJtXH0xG8yYmqvqFRzOg_inFxPcDc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
