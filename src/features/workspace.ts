import { customAlphabet } from 'nanoid'
import { supabase } from '../lib/supabase'
import type { MemberRole } from '../types'

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)

export interface MemberWithProfile {
  id: string
  user_id: string
  role: MemberRole
  joined_at: string
  email: string
  full_name: string | null
}

export async function fetchMembers(workspaceId: string): Promise<MemberWithProfile[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('id, user_id, role, joined_at, profile:profiles(email, full_name)')
    .eq('workspace_id', workspaceId)
  if (error || !data) return []
  return data.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role as MemberRole,
    joined_at: m.joined_at,
    email: (m.profile as unknown as { email: string; full_name: string | null })?.email ?? '',
    full_name: (m.profile as unknown as { email: string; full_name: string | null })?.full_name ?? null,
  }))
}

export interface InviteRow {
  id: string
  code: string
  status: string
  created_at: string
}

export async function fetchPendingInvites(workspaceId: string): Promise<InviteRow[]> {
  const { data, error } = await supabase
    .from('invites')
    .select('id, code, status, created_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data
}

export async function createInvite(workspaceId: string, createdBy: string): Promise<string> {
  const code = generateCode()
  const { error } = await supabase.from('invites').insert({ workspace_id: workspaceId, code, created_by: createdBy })
  if (error) throw error
  return code
}

export async function redeemInvite(code: string, userId: string): Promise<void> {
  const { data: invite, error: findError } = await supabase
    .from('invites')
    .select('id, workspace_id, status')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle()

  if (findError || !invite || invite.status !== 'pending') {
    throw new Error('Código de convite inválido ou já utilizado.')
  }

  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: invite.workspace_id, user_id: userId, role: 'member' })
  if (memberError) throw memberError

  await supabase
    .from('invites')
    .update({ status: 'used', used_by: userId, used_at: new Date().toISOString() })
    .eq('id', invite.id)
}

export async function promoteToAdmin(workspaceId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('workspace_members')
    .update({ role: 'admin' })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function createWorkspace(name: string, ownerId: string): Promise<void> {
  const { error } = await supabase.from('workspaces').insert({ name, owner_id: ownerId })
  if (error) throw error
}
