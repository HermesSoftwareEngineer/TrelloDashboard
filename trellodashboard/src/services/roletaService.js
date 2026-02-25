import { supabase } from './goalService';

export const getRewards = async () => {
  const { data, error } = await supabase
    .from('rewards')
    .select('id, name');

  if (error) {
    console.error('Error fetching rewards:', error);
    throw error;
  }
  return data;
};

export const addReward = async (name) => {
  const { data, error } = await supabase
    .from('rewards')
    .insert([{ name }])
    .select()
    .single();

  if (error) {
    console.error('Error adding reward:', error);
    throw error;
  }
  return data;
};

export const updateReward = async (id, name) => {
  const { data, error } = await supabase
    .from('rewards')
    .update({ name })
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating reward:', error);
    throw error;
  }
  return data;
};

export const deleteReward = async (id) => {
  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting reward:', error);
    throw error;
  }
  return true;
};
