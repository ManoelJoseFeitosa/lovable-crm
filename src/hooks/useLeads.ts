import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { Lead, LeadStage } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useLeads() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    if (!currentWorkspace) {
      setLeads([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*, campaigns(*)')
      .eq('workspace_id', currentWorkspace.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar leads',
        description: error.message,
      });
    } else {
      setLeads((data || []) as Lead[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, [currentWorkspace?.id]);

  const createLead = async (leadData: Partial<Lead>) => {
    if (!currentWorkspace) return { error: new Error('No workspace selected') };

    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: leadData.name || '',
        email: leadData.email,
        phone: leadData.phone,
        company: leadData.company,
        job_title: leadData.job_title,
        linkedin_url: leadData.linkedin_url,
        sector: leadData.sector,
        source: leadData.source,
        campaign_id: leadData.campaign_id,
        stage: leadData.stage || 'base',
        workspace_id: currentWorkspace.id,
      })
      .select('*, campaigns(*)')
      .single();

    if (error) {
      return { error };
    }

    setLeads(prev => [data as Lead, ...prev]);
    return { error: null, data: data as Lead };
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select('*, campaigns(*)')
      .single();

    if (error) {
      return { error };
    }

    setLeads(prev => prev.map(l => l.id === id ? data as Lead : l));
    return { error: null, data: data as Lead };
  };

  const updateLeadStage = async (id: string, stage: LeadStage) => {
    return updateLead(id, { stage });
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      return { error };
    }

    setLeads(prev => prev.filter(l => l.id !== id));
    return { error: null };
  };

  return {
    leads,
    loading,
    fetchLeads,
    createLead,
    updateLead,
    updateLeadStage,
    deleteLead,
  };
}
