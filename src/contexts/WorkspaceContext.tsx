import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/externalClient';
import { useAuth } from './AuthContext';
import type { Workspace, WorkspaceRole } from '@/types/database';

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

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setCurrentRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1) Get memberships (source of truth for filtering)
    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id);

    if (membersError) {
      console.error('fetchWorkspaces: workspace_members error', membersError);
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setCurrentRole(null);
      setLoading(false);
      return;
    }

    const workspaceIds = (members ?? []).map((m) => m.workspace_id).filter(Boolean) as string[];

    if (workspaceIds.length === 0) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setCurrentRole(null);
      localStorage.removeItem('currentWorkspaceId');
      setLoading(false);
      return;
    }

    // 2) Fetch workspaces by IDs (avoids embedded relations returning null)
    const { data: wsData, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .in('id', workspaceIds)
      .order('created_at', { ascending: false });

    if (wsError) {
      console.error('fetchWorkspaces: workspaces error', wsError);
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setCurrentRole(null);
      setLoading(false);
      return;
    }

    const byId = new Map((wsData ?? []).map((w) => [w.id, w as unknown as Workspace]));
    const userWorkspaces = workspaceIds.map((id) => byId.get(id)).filter(Boolean) as Workspace[];

    setWorkspaces(userWorkspaces);

    // Restore selection only if it was explicitly saved and still exists.
    const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
    const savedWorkspace = savedWorkspaceId ? byId.get(savedWorkspaceId) : null;

    // If current selection is no longer valid, clear it.
    if (currentWorkspace && !byId.has(currentWorkspace.id)) {
      setCurrentWorkspace(null);
      setCurrentRole(null);
      localStorage.removeItem('currentWorkspaceId');
    }

    // If nothing selected yet, use saved selection (if valid). Do NOT auto-select the first.
    if (!currentWorkspace && savedWorkspace) {
      setCurrentWorkspace(savedWorkspace);
      const member = (members ?? []).find((m) => m.workspace_id === savedWorkspace.id);
      setCurrentRole((member?.role as WorkspaceRole) ?? null);
    }

    // Clean stale saved selection
    if (savedWorkspaceId && !savedWorkspace) {
      localStorage.removeItem('currentWorkspaceId');
    }

    setLoading(false);
  }, [user, currentWorkspace]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (currentWorkspace) {
      localStorage.setItem('currentWorkspaceId', currentWorkspace.id);
    }
  }, [currentWorkspace?.id]);

  const createWorkspace = useCallback(
    async (name: string) => {
      if (!user) return { error: new Error('Not authenticated') };

      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({ name, created_by: user.id })
        .select()
        .single();

      if (workspaceError) return { error: workspaceError as Error };

      // Add creator as admin
      const { error: memberError } = await supabase.from('workspace_members').insert({
        workspace_id: (workspace as any).id,
        user_id: user.id,
        role: 'admin',
      });

      if (memberError) return { error: memberError as Error };

      setCurrentWorkspace(workspace as Workspace);
      setCurrentRole('admin');
      await fetchWorkspaces();

      return { error: null };
    },
    [user, fetchWorkspaces]
  );

  const handleSetCurrentWorkspace = useCallback(
    async (workspace: Workspace | null) => {
      setCurrentWorkspace(workspace);

      if (!workspace) {
        setCurrentRole(null);
        localStorage.removeItem('currentWorkspaceId');
        return;
      }

      if (user) {
        const { data: member, error } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspace.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('handleSetCurrentWorkspace: role lookup error', error);
        }

        setCurrentRole((member?.role as WorkspaceRole) ?? null);
      } else {
        setCurrentRole(null);
      }
    },
    [user]
  );

  const value = useMemo<WorkspaceContextType>(
    () => ({
      workspaces,
      currentWorkspace,
      currentRole,
      loading,
      setCurrentWorkspace: handleSetCurrentWorkspace,
      createWorkspace,
      refreshWorkspaces: fetchWorkspaces,
    }),
    [workspaces, currentWorkspace, currentRole, loading, handleSetCurrentWorkspace, createWorkspace, fetchWorkspaces]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
