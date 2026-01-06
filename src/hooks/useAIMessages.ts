import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AIMessage, Lead, Campaign } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useAIMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const fetchMessagesForLead = async (leadId: string) => {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*, campaigns(*)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar mensagens',
        description: error.message,
      });
      return [];
    }

    return (data || []) as AIMessage[];
  };

  const generateMessage = async (lead: Lead, campaign: Campaign) => {
    setLoading(true);

    // Mock AI message generation
    const mockMessages = [
      `Olá ${lead.name}! Vi que você trabalha na ${lead.company || 'sua empresa'} como ${lead.job_title || 'profissional'}. ${campaign.offer_context || 'Tenho uma proposta interessante para você.'}`,
      `Oi ${lead.name}, tudo bem? Sou especialista em ${campaign.name} e gostaria de apresentar uma solução que pode ajudar a ${lead.company || 'sua empresa'} a crescer.`,
      `${lead.name}, percebi que você atua no setor de ${lead.sector || 'tecnologia'}. ${campaign.offer_context || 'Tenho algo que pode interessar você.'} Podemos conversar?`,
    ];

    // Simulate AI delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const content = mockMessages[Math.floor(Math.random() * mockMessages.length)];

    const { data, error } = await supabase
      .from('ai_messages')
      .insert({
        lead_id: lead.id,
        campaign_id: campaign.id,
        content,
        created_by: user?.id,
      })
      .select('*, campaigns(*)')
      .single();

    setLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar mensagem',
        description: error.message,
      });
      return null;
    }

    return data as AIMessage;
  };

  const markAsSent = async (messageId: string) => {
    const { data, error } = await supabase
      .from('ai_messages')
      .update({
        is_sent: true,
        sent_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select('*, campaigns(*)')
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao marcar como enviada',
        description: error.message,
      });
      return null;
    }

    return data as AIMessage;
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from('ai_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir mensagem',
        description: error.message,
      });
      return false;
    }

    return true;
  };

  return {
    loading,
    fetchMessagesForLead,
    generateMessage,
    markAsSent,
    deleteMessage,
  };
}
