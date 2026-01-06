import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Building2, Zap, ChevronRight } from 'lucide-react';

export default function SelectWorkspace() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { workspaces, currentWorkspace, loading: workspaceLoading, setCurrentWorkspace, createWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (currentWorkspace) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    
    setIsCreating(true);
    const { error } = await createWorkspace(newWorkspaceName.trim());
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar workspace',
        description: error.message,
      });
    } else {
      toast({
        title: 'Workspace criado!',
        description: 'Você agora é administrador deste workspace.',
      });
      setDialogOpen(false);
      setNewWorkspaceName('');
    }
    
    setIsCreating(false);
  };

  const handleSelectWorkspace = (workspace: typeof workspaces[0]) => {
    setCurrentWorkspace(workspace);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">SDR CRM</h1>
          <p className="text-muted-foreground mt-2">Selecione ou crie um workspace</p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Seus Workspaces</CardTitle>
            <CardDescription>
              Escolha um workspace para acessar ou crie um novo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspaces.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Você ainda não tem nenhum workspace</p>
                <p className="text-sm">Crie um para começar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => handleSelectWorkspace(workspace)}
                    className="w-full flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{workspace.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Criado em {new Date(workspace.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar novo workspace
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Workspace</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateWorkspace} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="workspace-name">Nome do workspace</Label>
                    <Input
                      id="workspace-name"
                      placeholder="Ex: Minha Empresa"
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar workspace
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <div className="pt-4 border-t border-border">
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={signOut}>
                Sair da conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
