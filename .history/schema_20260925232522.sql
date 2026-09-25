-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.invites (
  id bigint NOT NULL DEFAULT nextval('invites_id_seq'::regclass),
  code text NOT NULL UNIQUE,
  token text NOT NULL UNIQUE,
  guest_name text NOT NULL,
  category text NOT NULL DEFAULT 'General Admission'::text,
  table_label text,
  status text NOT NULL DEFAULT 'ready'::text,
  scanned_at timestamp with time zone,
  scanned_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT invites_pkey PRIMARY KEY (id)
);
CREATE TABLE public.scan_log (
  id bigint NOT NULL DEFAULT nextval('scan_log_id_seq'::regclass),
  token text NOT NULL,
  action text NOT NULL,
  device_info text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT scan_log_pkey PRIMARY KEY (id)
);