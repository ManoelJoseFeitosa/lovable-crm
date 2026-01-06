import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLeads } from '@/hooks/useLeads';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAIMessages } from '@/hooks/useAIMessages';
import { LEAD_STAGES, type Lead, type AIMessage } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Sparkles, Copy, Trash2 } from 'lucide-react';

interface LeadModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadModal({ lead, open, onOpenChange }: LeadModalProps) {
  const { updateLead, updateLeadStage } = useLeads();
  const { campaigns } = useCampaigns();
  const { loading: aiLoading, fetchMessagesForLead, generateMessage, markAsSent } = useAIMessages();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData(lead);
      fetchMessagesForLead(lead.id).then(setMessages);
    }
  }, [lead?.id]);

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    const { error } = await updateLead(lead.id, formData);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } else {
      toast({ title: 'Lead atualizado!' });
      onOpenChange(false);
    }
    setSaving(false);
  };

  const handleGenerate = async () => {
    if (!lead || !selectedCampaignId) return;
    const campaign = campaigns.find(c => c.id === selectedCampaignId);
    if (!campaign) return;

    const msg = await generateMessage(lead, campaign);
    if (msg) {
      setMessages(prev => [msg, ...prev]);
      toast({ title: 'Mensagem gerada!' });
    }
  };

  const handleSend = async (msg: AIMessage) => {
    if (!lead) return;
    const updated = await markAsSent(msg.id);
    if (updated) {
      setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
      await updateLeadStage(lead.id, 'tentando_contato');
      toast({ title: 'Mensagem enviada!', description: 'Lead movido para "Tentando Contato"' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="ai">IA</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={formData.name || ''} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={formData.email || ''} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={formData.phone || ''} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input value={formData.company || ''} onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={formData.job_title || ''} onChange={e => setFormData(prev => ({ ...prev, job_title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Input value={formData.sector || ''} onChange={e => setFormData(prev => ({ ...prev, sector: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input value={formData.linkedin_url || ''} onChange={e => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fonte</Label>
                <Input value={formData.source || ''} onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Etapa</Label>
                <Select value={formData.stage} onValueChange={v => setFormData(prev => ({ ...prev, stage: v as Lead['stage'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione uma campanha" /></SelectTrigger>
                <SelectContent>
                  {campaigns.filter(c => c.is_active).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleGenerate} disabled={!selectedCampaignId || aiLoading}>
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Gerar
              </Button>
            </div>

            <div className="space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {msg.is_sent ? (
                      <span className="text-xs text-green-500">✓ Enviada</span>
                    ) : (
                      <Button size="sm" onClick={() => handleSend(msg)}>
                        <Send className="h-3 w-3 mr-1" /> Enviar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(msg.content)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhuma mensagem gerada</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
