-- SETUP TEMPLATE ONLY. Do not run on a production/shared Supabase project.
-- Replace all three placeholders in a private copy before applying manually.
-- No application tables, RLS, or production migrations are introduced.
begin;

create or replace function public.remote_mcp_spike_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  claims jsonb := event->'claims';
  configured_client constant text := 'REPLACE_PUBLIC_OAUTH_CLIENT_ID';
  configured_owner constant text := 'REPLACE_NUMERIC_GITHUB_OWNER_ID';
  resource constant text := 'https://REPLACE_DEPLOYMENT_HOST/api/mcp';
  github_id text;
begin
  if configured_client like 'REPLACE_%' or configured_owner like 'REPLACE_%'
      or resource like '%REPLACE_%' then
    raise exception 'Configure the isolated MCP spike hook first';
  end if;
  -- Remove any inherited custom claim; only the identity table may establish it.
  claims := claims - 'github_provider_id';
  if claims->>'client_id' = configured_client then
    select provider_id into github_id from auth.identities
      where user_id = (event->>'user_id')::uuid and provider = 'github'
        and provider_id = configured_owner;
    if github_id is null then
      raise exception 'Owner identity required';
    end if;
    claims := jsonb_set(claims, '{github_provider_id}', to_jsonb(github_id));
    claims := jsonb_set(claims, '{aud}', to_jsonb(resource));
    -- Bound the residual access-token lifetime after consent/session revocation.
    claims := jsonb_set(claims, '{exp}', to_jsonb(least(
      (claims->>'exp')::bigint, (claims->>'iat')::bigint + 300
    )));
  end if;
  return jsonb_build_object('claims', claims);
end;
$$;

revoke all on function public.remote_mcp_spike_token_hook(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant select (provider_id, user_id, provider) on auth.identities to supabase_auth_admin;
grant execute on function public.remote_mcp_spike_token_hook(jsonb) to supabase_auth_admin;
commit;
