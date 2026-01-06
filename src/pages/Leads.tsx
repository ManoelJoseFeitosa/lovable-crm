import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useLeads } from '@/hooks/useLeads';
import { LEAD_STAGES, type Lead, type LeadStage } from '@/types/database';
import { KanbanColumn } from '@/components/leads/KanbanColumn';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadModal } from '@/components/leads/LeadModal';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Leads() {
  const { leads, loading, updateLeadStage, createLead } = useLeads();
  const { toast } = useToast();
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find(l => l.id === event.active.id);
    setActiveLead(lead || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as LeadStage;

    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    const { error } = await updateLeadStage(leadId, newStage);
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao mover lead',
        description: error.message,
      });
    }
  };

  const handleCreateLead = async () => {
    const { error, data } = await createLead({ name: 'Novo Lead' });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar lead',
        description: error.message,
      });
    } else if (data) {
      setSelectedLead(data);
      setModalOpen(true);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kanban de Leads</h1>
          <p className="text-muted-foreground">{leads.length} leads no total</p>
        </div>
        <Button onClick={handleCreateLead}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 h-full min-w-max pb-4">
            {LEAD_STAGES.map((stage) => (
              <KanbanColumn
                key={stage.value}
                stage={stage}
                leads={leads.filter(l => l.stage === stage.value)}
                onLeadClick={handleLeadClick}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeLead && <LeadCard lead={activeLead} isDragging />}
        </DragOverlay>
      </DndContext>

      <LeadModal
        lead={selectedLead}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
