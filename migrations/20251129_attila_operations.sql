-- Enable Attila Operations
-- Table for storing Attila automation operations (Sniper, Sentinel, Influence)

CREATE TABLE IF NOT EXISTS public.attila_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES public.zones(id),
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    type TEXT NOT NULL CHECK (type IN ('sniper', 'sentinel', 'influence')),
    
    -- Configuration JSONB stores all flexible fields:
    -- context, guidelines, language_elements
    -- filters (engagement_threshold, post_types, profile_types)
    -- cluster_ids (for influence mode)
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add RLS policies
ALTER TABLE public.attila_operations ENABLE ROW LEVEL SECURITY;

-- Policies matching other tables (viewable by users with access to the zone, manageable by managers/admins)
CREATE POLICY "Users can view operations in their zones" 
    ON public.attila_operations FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.client_id = (SELECT client_id FROM public.zones WHERE id = attila_operations.zone_id)
                OR profiles.role IN ('super_admin', 'admin')
            )
        )
    );

CREATE POLICY "Managers and Admins can manage operations" 
    ON public.attila_operations FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (
                (profiles.client_id = (SELECT client_id FROM public.zones WHERE id = attila_operations.zone_id)
                 AND profiles.role IN ('manager', 'admin'))
                OR profiles.role = 'super_admin'
            )
        )
    );

-- Add indexes for performance
CREATE INDEX idx_attila_operations_zone_id ON public.attila_operations(zone_id);
CREATE INDEX idx_attila_operations_status ON public.attila_operations(status);
CREATE INDEX idx_attila_operations_type ON public.attila_operations(type);

-- Triggers for updated_at
CREATE TRIGGER update_attila_operations_updated_at
    BEFORE UPDATE ON public.attila_operations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

