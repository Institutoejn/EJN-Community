
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sjiiufdzandfdvhyunuw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mjMx7XxonOiCC7BbhD4r0w_tyqBg_7P';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
