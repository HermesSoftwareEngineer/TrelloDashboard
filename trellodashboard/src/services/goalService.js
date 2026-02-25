import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getGoals = async () => {
  const { data, error } = await supabase
    .from('goals')
    .select('*');
  if (error) throw error;
  return data;
};

export const addGoal = async (goal) => {
  const { data, error } = await supabase
    .from('goals')
    .insert([goal])
    .select();
  if (error) throw error;
  return data;
};

export const updateGoal = async (id, goal) => {
  const { data, error } = await supabase
    .from('goals')
    .update(goal)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data;
};

export const deleteGoal = async (id) => {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
};