-- Create a table for public user profiles
create table profiles (
  id uuid references auth.users not null primary key,
  username text,
  avatar_url text,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(username) >= 3)
);

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create a table for chat messages (Memory)
create table messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  content text not null,
  role text not null check (role in ('user', 'assistant')),
  metadata jsonb, -- For ElizaOS specific data (attachments, action results, etc.)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for messages
alter table messages enable row level security;

-- Policies for Messages
create policy "Users can view their own messages."
  on messages for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own messages."
  on messages for insert
  with check ( auth.uid() = user_id );

-- (Optional) Realtime subscription will need replication enabled on 'messages'
-- You can enable this in the Supabase Dashboard: Database -> Replication -> Source
