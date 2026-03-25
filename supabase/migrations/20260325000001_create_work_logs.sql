-- Create function for updating updated_at column if it doesn't exist
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create work_logs table for employee daily task tracking
CREATE TABLE IF NOT EXISTS public.work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  task_description TEXT,
  task_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_hours DECIMAL(5,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  category TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(company_id, employee_id, task_date, task_title)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_work_logs_company ON public.work_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_employee ON public.work_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_date ON public.work_logs(task_date);
CREATE INDEX IF NOT EXISTS idx_work_logs_status ON public.work_logs(status);
CREATE INDEX IF NOT EXISTS idx_work_logs_company_date ON public.work_logs(company_id, task_date);

-- Enable RLS
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view work logs from their company"
  ON public.work_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users
      WHERE company_users.company_id = work_logs.company_id
      AND company_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert work logs for their company"
  ON public.work_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_users
      WHERE company_users.company_id = work_logs.company_id
      AND company_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update work logs from their company"
  ON public.work_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users
      WHERE company_users.company_id = work_logs.company_id
      AND company_users.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_work_logs_updated_at BEFORE UPDATE ON public.work_logs
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();
