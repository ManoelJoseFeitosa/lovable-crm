import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { LeadCard } from './LeadCard';
import type { Lead, LeadStage } from '@/types/database';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  stage: { value: LeadStage; label: string; color: string };
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

export function KanbanColumn({ stage, leads, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg",
        isOver && "ring-2 ring-primary"
      )}
    >
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded-full", stage.color)} />
          <h3 className="font-medium text-sm">{stage.label}</h3>
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin max-h-[calc(100vh-280px)]">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum lead
          </div>
        )}
      </div>
    </div>
  );
}
