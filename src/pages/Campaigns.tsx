import { useState } from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Megaphone } from 'lucide-react';

export default function Campaigns() {
  const { campaigns, loading, createCampaign, updateCampaign, deleteCampaign } = useCampaigns();
  const { currentRole } = useWorkspace();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', offer_context: '', ai_prompt: '' });

  const isAdmin = currentRole === 'admin';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await createCampaign(formData);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } else {
      toast({ title: 'Campanha criada!' });
      setDialogOpen(false);
      setFormData({ name: '', offer_context: '', ai_prompt: '' });
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await updateCampaign(id, { is_active: !is_active });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campanhas de IA</h1>
          <p className="text-muted-foreground">{campaigns.length} campanhas</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nova Campanha</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Campanha</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Contexto da Oferta</Label>
                  <Textarea value={formData.offer_context} onChange={e => setFormData(p => ({ ...p, offer_context: e.target.value }))} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Prompt da IA (Persona/Estilo)</Label>
                  <Textarea value={formData.ai_prompt} onChange={e => setFormData(p => ({ ...p, ai_prompt: e.target.value }))} rows={3} />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map(campaign => (
          <Card key={campaign.id}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{campaign.name}</CardTitle>
              </div>
              {isAdmin && (
                <Switch checked={campaign.is_active} onCheckedChange={() => toggleActive(campaign.id, campaign.is_active)} />
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">{campaign.offer_context || 'Sem contexto definido'}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {campaign.is_active ? '🟢 Ativa' : '⚪ Inativa'}
              </p>
            </CardContent>
          </Card>
        ))}
        {campaigns.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma campanha criada</p>
          </div>
        )}
      </div>
    </div>
  );
}
