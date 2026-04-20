-- Create custom_metrics table for storing custom metrics
create table if not exists public.custom_metrics (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  name varchar(255) not null,
  description text,
  formula text not null,
  data_source varchar(255) not null,
  operation varchar(50) default 'custom'::character varying,
  field varchar(255),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  constraint valid_operation check (operation in ('sum', 'avg', 'max', 'min', 'count', 'custom'))
);

-- Create metric_values table for storing historical metric values
create table if not exists public.metric_values (
  id uuid default gen_random_uuid() primary key,
  metric_id uuid not null references public.custom_metrics(id) on delete cascade,
  date date not null,
  value numeric not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()),
  constraint unique_metric_date unique (metric_id, date)
);

-- Create indexes for better query performance
create index idx_custom_metrics_company_id on public.custom_metrics(company_id);
create index idx_custom_metrics_created_at on public.custom_metrics(created_at desc);
create index idx_metric_values_metric_id on public.metric_values(metric_id);
create index idx_metric_values_timestamp on public.metric_values(timestamp desc);
create index idx_metric_values_date on public.metric_values(date);

-- Enable RLS
alter table public.custom_metrics enable row level security;
alter table public.metric_values enable row level security;

-- RLS policies for custom_metrics
create policy "Users can view custom metrics of their company"
  on public.custom_metrics for select
  using (
    company_id in (
      select company_id from public.user_companies
      where user_id = auth.uid()
    )
  );

create policy "Users can create custom metrics for their company"
  on public.custom_metrics for insert
  with check (
    company_id in (
      select company_id from public.user_companies
      where user_id = auth.uid()
    )
  );

create policy "Users can update custom metrics of their company"
  on public.custom_metrics for update
  using (
    company_id in (
      select company_id from public.user_companies
      where user_id = auth.uid()
    )
  );

create policy "Users can delete custom metrics of their company"
  on public.custom_metrics for delete
  using (
    company_id in (
      select company_id from public.user_companies
      where user_id = auth.uid()
    )
  );

-- RLS policies for metric_values
create policy "Users can view metric values for their company's metrics"
  on public.metric_values for select
  using (
    metric_id in (
      select id from public.custom_metrics cm
      where cm.company_id in (
        select company_id from public.user_companies
        where user_id = auth.uid()
      )
    )
  );

create policy "Users can insert metric values for their company's metrics"
  on public.metric_values for insert
  with check (
    metric_id in (
      select id from public.custom_metrics cm
      where cm.company_id in (
        select company_id from public.user_companies
        where user_id = auth.uid()
      )
    )
  );
