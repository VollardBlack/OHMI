import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ekjcmndykjqqymyayozo.supabase.co';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xpuhwl5HGrBL_r2fShC5ZA_3acPpjIP';

export const supabase = createClient(url, anon);
