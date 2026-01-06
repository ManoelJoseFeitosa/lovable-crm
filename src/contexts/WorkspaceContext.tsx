import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/types/database';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentRole: WorkspaceRole | null;
  loading: boolean;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  createWorkspace: (name: string) => Promise<{ error: Error | null }>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [currentRole, setCurrentRole] = useState<WorkspaceRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setCurrentRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Get workspaces where user is a member
    const { data: members } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, workspaces(*)')
      .eq('user_id', user.id);

    if (members && members.length > 0) {
      const userWorkspaces = members
        .filter(m => m.workspaces)
        .map(m => m.workspaces as unknown as Workspace);
      
      setWorkspaces(userWorkspaces);
      
      // Auto-select first workspace if none selected
      if (!currentWorkspace && userWorkspaces.length > 0) {
        const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
        const savedWorkspace = userWorkspaces.find(w => w.id === savedWorkspaceId);
        
        if (savedWorkspace) {
          setCurrentWorkspace(savedWorkspace);
          const member = members.find(m => m.workspace_id === savedWorkspace.id);
          setCurrentRole(member?.role as WorkspaceRole || null);
        } else {
          setCurrentWorkspace(userWorkspaces[0]);
          const member = members.find(m => m.workspace_id === userWorkspaces[0].id);
          setCurrentRole(member?.role as WorkspaceRole || null);
        }
      } else if (currentWorkspace) {
        const member = members.find(m => m.workspace_id === currentWorkspace.id);
        setCurrentRole(member?.role as WorkspaceRole || null);
      }
    } else {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setCurrentRole(null);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [user]);

  useEffect(() => {
    if (currentWorkspace) {
      localStorage.setItem('currentWorkspaceId', currentWorkspace.id);
    }
  }, [currentWorkspace]);

  const createWorkspace = async (name: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Create workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({ name, created_by: user.id })
      .select()
      .single();

    if (workspaceError) return { error: workspaceError as Error };

    // Add creator as admin
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'admin',
      });

    if (memberError) return { error: memberError as Error };

    await fetchWorkspaces();
    setCurrentWorkspace(workspace as Workspace);
    setCurrentRole('admin');
    
    return { error: null };
  };

  const handleSetCurrentWorkspace = async (workspace: Workspace | null) => {
    setCurrentWorkspace(workspace);
    
    if (workspace && user) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      setCurrentRole(member?.role as WorkspaceRole || null);
    } else {
      setCurrentRole(null);
    }
  };

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      currentRole,
      loading,
      setCurrentWorkspace: handleSetCurrentWorkspace,
      createWorkspace,
      refreshWorkspaces: fetchWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
