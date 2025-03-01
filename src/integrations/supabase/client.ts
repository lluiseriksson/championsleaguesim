
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://qtbxqkembqvsfbbrkwsu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0Ynhxa2VtYnF2c2ZiYnJrd3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4MDg3ODcsImV4cCI6MjA1NjM4NDc4N30.PNQHaaLGWmYUf-HXmSIx5tdArMzVsuy5YiBnc99PuJs";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
