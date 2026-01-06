import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export default function Settings() {
  const { currentWorkspace, currentRole } = useWorkspace();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie seu workspace</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Nome:</strong> {currentWorkspace?.name}</p>
          <p><strong>Seu papel:</strong> {currentRole === 'admin' ? 'Administrador' : 'SDR'}</p>
          <p className="text-sm text-muted-foreground">
            {currentRole === 'admin' 
              ? 'Você pode gerenciar campanhas, campos customizados e membros do workspace.' 
              : 'Você pode gerenciar leads e enviar mensagens.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
