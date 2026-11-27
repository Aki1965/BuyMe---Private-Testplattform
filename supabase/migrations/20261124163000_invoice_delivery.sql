-- Delivery copies only. The accounting system remains the source of record.
create table public.buyme_invoice_documents (
  id uuid primary key,
  recipient_id uuid not null,
  issuer_key text not null check (length(btrim(issuer_key)) between 1 and 100),
  issuer_name text not null check (length(btrim(issuer_name)) between 1 and 200),
  number text not null check (length(btrim(number)) between 1 and 100),
  reference text not null check (length(btrim(reference)) between 1 and 150),
  issued_on date not null,
  kind text not null check (kind in ('fee', 'purchase')),
  format text not null check (format in ('pdf', 'zugferd', 'xrechnung')),
  corrects_id uuid check (corrects_id <> id),
  unique (issuer_key, number),
  unique (id, recipient_id, issuer_key, kind),
  foreign key (corrects_id, recipient_id, issuer_key, kind)
    references public.buyme_invoice_documents (id, recipient_id, issuer_key, kind)
);

comment on column public.buyme_invoice_documents.recipient_id is
  'Verified auth user UUID resolved by the trusted back office. Kept independent of account deletion for retention.';
create index buyme_invoice_recipient_idx
  on public.buyme_invoice_documents (recipient_id, issued_on desc, id desc);

alter table public.buyme_invoice_documents enable row level security;
revoke all on public.buyme_invoice_documents from public, anon, authenticated, service_role;
grant select on public.buyme_invoice_documents to authenticated;
grant select, insert on public.buyme_invoice_documents to service_role;
create policy buyme_invoice_read_own on public.buyme_invoice_documents
  for select to authenticated using (recipient_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('buyme-invoices', 'buyme-invoices', false, 15728640, array['application/pdf', 'application/xml', 'text/xml']);

create policy buyme_invoice_file_read_own on storage.objects
  for select to authenticated using (
    bucket_id = 'buyme-invoices'
    and exists (
      select 1 from public.buyme_invoice_documents invoice
      where invoice.recipient_id = (select auth.uid())
      and (
        name = invoice.id::text || '/print.pdf'
        or (invoice.format = 'xrechnung' and name = invoice.id::text || '/original.xml')
      )
    )
  );

-- Also constrain broad policies from other features sharing the same Storage schema.
create policy buyme_invoice_file_block_insert on storage.objects
  as restrictive for insert to anon, authenticated with check (bucket_id <> 'buyme-invoices');
create policy buyme_invoice_file_block_update on storage.objects
  as restrictive for update to anon, authenticated
  using (bucket_id <> 'buyme-invoices') with check (bucket_id <> 'buyme-invoices');
create policy buyme_invoice_file_block_anon on storage.objects
  as restrictive for select to anon using (bucket_id <> 'buyme-invoices');
create policy buyme_invoice_file_owner_boundary on storage.objects
  as restrictive for select to authenticated using (
    bucket_id <> 'buyme-invoices'
    or exists (
      select 1 from public.buyme_invoice_documents invoice
      where invoice.recipient_id = (select auth.uid())
      and (
        name = invoice.id::text || '/print.pdf'
        or (invoice.format = 'xrechnung' and name = invoice.id::text || '/original.xml')
      )
    )
  );
create policy buyme_invoice_file_block_delete on storage.objects
  as restrictive for delete to anon, authenticated using (bucket_id <> 'buyme-invoices');
