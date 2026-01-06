import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import type { Lead } from '@/types/database';
import { cn } from '@/lib/utils';
import { Building2, Mail } from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  isDragging?: boolean;
}

export function LeadCard({ lead, onClick, isDragging }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "p-3 cursor-pointer hover:bg-accent/50 transition-colors",
        (isDragging || isSortableDragging) && "opacity-50 shadow-lg rotate-2"
      )}
    >
      <h4 className="font-medium text-sm truncate">{lead.name}</h4>
      
      {lead.company && (
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{lead.company}</span>
        </div>
      )}
      
      {lead.email && (
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Mail className="h-3 w-3" />
          <span className="truncate">{lead.email}</span>
        </div>
      )}
    </Card>
  );
}
