import { createClient } from '@supabase/supabase-js'

// URL из раздела API URL на твоем скрине
const supabaseUrl = 'https://ngydxdehtxipqxgkihdl.supabase.co'

// Длинный ключ, который ты найдешь на той же странице ниже (anon public)
const supabaseKey = 'sb_publishable__3gGuUIUMv5cZqD4GqhFCw_zstqv5x-' 

export const supabase = createClient(supabaseUrl, supabaseKey)