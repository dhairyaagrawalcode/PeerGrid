-- Return compact mutual-follow context without exposing complete follow lists.
create or replace function public.get_mutual_follow_contexts(candidate_profile_ids uuid[])
returns table (profile_id uuid, mutual_count bigint, mutual_names text[])
language sql stable security definer set search_path = '' as $$
  with candidates as (
    select distinct requested.profile_id
    from unnest(coalesce(candidate_profile_ids[1:100], '{}'::uuid[])) as requested(profile_id)
    join public.profiles candidate_profile
      on candidate_profile.id = requested.profile_id
     and candidate_profile.is_verified
    where requested.profile_id is not null and requested.profile_id <> auth.uid()
    limit 100
  ), mutuals as (
    select candidate.profile_id, mutual.id as mutual_id, mutual.full_name
    from candidates candidate
    join public.follows target_follow on target_follow.following_id = candidate.profile_id
    join public.follows viewer_follow on viewer_follow.follower_id = auth.uid() and viewer_follow.following_id = target_follow.follower_id
    join public.profiles mutual on mutual.id = target_follow.follower_id and mutual.is_verified
  )
  select mutuals.profile_id, count(distinct mutuals.mutual_id), (array_agg(mutuals.full_name order by mutuals.full_name))[1:2]
  from mutuals where public.is_verified_student() group by mutuals.profile_id;
$$;
revoke all on function public.get_mutual_follow_contexts(uuid[]) from public, anon;
grant execute on function public.get_mutual_follow_contexts(uuid[]) to authenticated;
