// Types for the SDR CRM application

export type WorkspaceRole = 'admin' | 'sdr';

export type LeadStage = 
  | 'base'
  | 'lead_mapeado'
  | 'tentando_contato'
  | 'conexao_iniciada'
  | 'desqualificado'
  | 'qualificado'
  | 'reuniao_agendada';

export type CustomFieldType = 'text' | 'number' | 'date' | 'select';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  profiles?: Profile;
}

export interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  offer_context: string | null;
  ai_prompt: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  sector: string | null;
  source: string | null;
  captured_at: string | null;
  campaign_id: string | null;
  stage: LeadStage;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  campaigns?: Campaign;
}

export interface CustomFieldDefinition {
  id: string;
  workspace_id: string;
  name: string;
  field_type: CustomFieldType;
  options: string[] | null;
  is_required: boolean;
  created_at: string;
}

export interface CustomFieldValue {
  id: string;
  lead_id: string;
  field_definition_id: string;
  value: string | null;
  created_at: string;
  updated_at: string;
  custom_field_definitions?: CustomFieldDefinition;
}

export interface AIMessage {
  id: string;
  lead_id: string;
  campaign_id: string | null;
  content: string;
  is_sent: boolean;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  campaigns?: Campaign;
}

// Lead stages configuration
export const LEAD_STAGES: { value: LeadStage; label: string; color: string }[] = [
  { value: 'base', label: 'Base', color: 'bg-blue-500' },
  { value: 'lead_mapeado', label: 'Lead Mapeado', color: 'bg-purple-500' },
  { value: 'tentando_contato', label: 'Tentando Contato', color: 'bg-yellow-500' },
  { value: 'conexao_iniciada', label: 'Conexão Iniciada', color: 'bg-cyan-500' },
  { value: 'desqualificado', label: 'Desqualificado', color: 'bg-red-500' },
  { value: 'qualificado', label: 'Qualificado', color: 'bg-green-500' },
  { value: 'reuniao_agendada', label: 'Reunião Agendada', color: 'bg-violet-500' },
];
