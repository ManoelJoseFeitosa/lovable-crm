import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/externalClient';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Campaign } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useCampaigns() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    if (!currentWorkspace) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar campanhas',
        description: error.message,
      });
    } else {
      setCampaigns((data || []) as Campaign[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();
  }, [currentWorkspace?.id]);

  const createCampaign = async (campaignData: Partial<Campaign>) => {
    if (!currentWorkspace) {
      console.error('[useCampaigns] createCampaign: No workspace selected');
      return { error: new Error('No workspace selected') };
    }
    if (!user) {
      console.error('[useCampaigns] createCampaign: No authenticated user');
      return { error: new Error('No authenticated user') };
    }

    console.log('[useCampaigns] createCampaign: workspace_id=', currentWorkspace.id, 'user_id=', user.id);

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name: campaignData.name || '',
        offer_context: campaignData.offer_context,
        ai_prompt: campaignData.ai_prompt,
        trigger_stage: campaignData.trigger_stage,
        is_active: campaignData.is_active ?? true,
        workspace_id: currentWorkspace.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return { error };
    }

    setCampaigns(prev => [data as Campaign, ...prev]);
    return { error: null, data: data as Campaign };
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { error };
    }

    setCampaigns(prev => prev.map(c => c.id === id ? data as Campaign : c));
    return { error: null, data: data as Campaign };
  };

  const deleteCampaign = async (id: string) => {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      return { error };
    }

    setCampaigns(prev => prev.filter(c => c.id !== id));
    return { error: null };
  };

  return {
    campaigns,
    loading,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
}
