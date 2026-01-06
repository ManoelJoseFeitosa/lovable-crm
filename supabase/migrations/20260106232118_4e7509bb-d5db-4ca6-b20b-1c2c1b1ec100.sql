-- Enum para roles do workspace
CREATE TYPE public.workspace_role AS ENUM ('admin', 'sdr');

-- Enum para etapas do lead
CREATE TYPE public.lead_stage AS ENUM (
  'base',
  'lead_mapeado',
  'tentando_contato',
  'conexao_iniciada',
  'desqualificado',
  'qualificado',
  'reuniao_agendada'
);

-- Enum para tipos de campos customizados
CREATE TYPE public.custom_field_type AS ENUM ('text', 'number', 'date', 'select');

-- Tabela de profiles (sincronizada com auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela de workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela de membros do workspace (roles separados!)
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role workspace_role DEFAULT 'sdr' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, user_id)
);

-- Tabela de campanhas
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  offer_context TEXT,
  ai_prompt TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela de leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  -- Campos básicos
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  -- Campos profissionais
  job_title TEXT,
  linkedin_url TEXT,
  sector TEXT,
  -- Campos de origem
  source TEXT,
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  -- Status
  stage lead_stage DEFAULT 'base' NOT NULL,
  -- Metadata
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela de definições de campos customizados
CREATE TABLE public.custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  field_type custom_field_type DEFAULT 'text' NOT NULL,
  options JSONB, -- Para campos do tipo 'select'
  is_required BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, name)
);

-- Tabela de valores de campos customizados
CREATE TABLE public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  field_definition_id UUID REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(lead_id, field_definition_id)
);

-- Tabela de mensagens geradas pela IA
CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_sent BOOLEAN DEFAULT false NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Função para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar profile quando usuário é criado
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_field_values_updated_at
  BEFORE UPDATE ON public.custom_field_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função security definer para verificar role no workspace
CREATE OR REPLACE FUNCTION public.get_user_workspace_role(p_workspace_id UUID, p_user_id UUID)
RETURNS workspace_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  LIMIT 1;
$$;

-- Função para verificar se usuário é membro do workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  );
$$;

-- Função para verificar se usuário é admin do workspace
CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id 
    AND user_id = p_user_id 
    AND role = 'admin'
  );
$$;

-- Enable RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies para profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies para workspaces
CREATE POLICY "Users can view workspaces they are members of"
  ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(id, auth.uid()));

CREATE POLICY "Users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update their workspaces"
  ON public.workspaces FOR UPDATE
  USING (public.is_workspace_admin(id, auth.uid()));

CREATE POLICY "Admins can delete their workspaces"
  ON public.workspaces FOR DELETE
  USING (public.is_workspace_admin(id, auth.uid()));

-- RLS Policies para workspace_members
CREATE POLICY "Members can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Users can insert themselves as members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Admins can update members"
  ON public.workspace_members FOR UPDATE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Admins can delete members"
  ON public.workspace_members FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

-- RLS Policies para campaigns
CREATE POLICY "Members can view campaigns"
  ON public.campaigns FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Admins can create campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Admins can update campaigns"
  ON public.campaigns FOR UPDATE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Admins can delete campaigns"
  ON public.campaigns FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

-- RLS Policies para leads
CREATE POLICY "Members can view leads"
  ON public.leads FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can create leads"
  ON public.leads FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can update leads"
  ON public.leads FOR UPDATE
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can delete leads"
  ON public.leads FOR DELETE
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- RLS Policies para custom_field_definitions
CREATE POLICY "Members can view custom fields"
  ON public.custom_field_definitions FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Admins can create custom fields"
  ON public.custom_field_definitions FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Admins can update custom fields"
  ON public.custom_field_definitions FOR UPDATE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Admins can delete custom fields"
  ON public.custom_field_definitions FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

-- RLS Policies para custom_field_values
CREATE POLICY "Members can view custom field values"
  ON public.custom_field_values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND public.is_workspace_member(l.workspace_id, auth.uid())
    )
  );

CREATE POLICY "Members can create custom field values"
  ON public.custom_field_values FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND public.is_workspace_member(l.workspace_id, auth.uid())
    )
  );

CREATE POLICY "Members can update custom field values"
  ON public.custom_field_values FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND public.is_workspace_member(l.workspace_id, auth.uid())
    )
  );

CREATE POLICY "Members can delete custom field values"
  ON public.custom_field_values FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND public.is_workspace_member(l.workspace_id, auth.uid())
    )
  );

-- RLS Policies para ai_messages
CREATE POLICY "Members can view ai messages"
  ON public.ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND public.is_workspace_member(l.workspace_id, auth.uid())
    )
  );

CREATE POLICY "Members can create ai messages"
  ON public.ai_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND public.is_workspace_member(l.workspace_id, auth.uid())
    )
  );

CREATE POLICY "Members can update ai messages"
  ON public.ai_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND public.is_workspace_member(l.workspace_id, auth.uid())
    )
  );

CREATE POLICY "Members can delete ai messages"
  ON public.ai_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND public.is_workspace_member(l.workspace_id, auth.uid())
    )
  );

-- Índices para performance
CREATE INDEX idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX idx_leads_workspace_id ON public.leads(workspace_id);
CREATE INDEX idx_leads_stage ON public.leads(stage);
CREATE INDEX idx_leads_campaign_id ON public.leads(campaign_id);
CREATE INDEX idx_campaigns_workspace_id ON public.campaigns(workspace_id);
CREATE INDEX idx_custom_field_definitions_workspace_id ON public.custom_field_definitions(workspace_id);
CREATE INDEX idx_custom_field_values_lead_id ON public.custom_field_values(lead_id);
CREATE INDEX idx_ai_messages_lead_id ON public.ai_messages(lead_id);