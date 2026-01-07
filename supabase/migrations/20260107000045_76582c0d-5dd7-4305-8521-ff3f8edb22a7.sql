-- Add trigger_stage column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN trigger_stage lead_stage NULL;