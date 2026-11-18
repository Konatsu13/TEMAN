// Supabase Edge Function: create-member
// Memungkinkan Owner membuat akun Member baru tanpa memutus sesi aktif Owner.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metode tidak diizinkan.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Konfigurasi server Supabase belum lengkap.');
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Verifikasi bahwa pemanggil adalah user aktif dengan role Owner
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Akses ditolak: sesi tidak valid.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleData?.role !== 'owner') {
      return new Response(
        JSON.stringify({ error: 'Akses ditolak: Hanya Owner yang dapat membuat akun Member.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request body
    const { username, full_name, password } = await req.json();
    if (!username || !full_name || !password) {
      return new Response(
        JSON.stringify({ error: 'Username, nama lengkap, dan kata sandi wajib diisi.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedUsername = username.trim().toLowerCase().replace(/^@/, '');
    const internalEmail = `${normalizedUsername}@teman.local`;

    // 3. Buat user di auth.users menggunakan Service Role
    const { data: createdAuth, error: createAuthErr } = await admin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: { username: normalizedUsername, full_name: full_name.trim() },
    });

    if (createAuthErr || !createdAuth.user) {
      throw new Error(createAuthErr?.message || 'Gagal membuat user di Supabase Auth.');
    }

    const newUserId = createdAuth.user.id;

    // 4. Masukkan ke public.profiles
    const { error: profileErr } = await admin.from('profiles').insert({
      id: newUserId,
      username: normalizedUsername,
      full_name: full_name.trim(),
      is_active: true,
    });

    if (profileErr) {
      throw new Error(`Gagal menyimpan profil: ${profileErr.message}`);
    }

    // 5. Masukkan ke public.user_roles sebagai member
    const { error: roleErr } = await admin.from('user_roles').insert({
      user_id: newUserId,
      role: 'member',
    });

    if (roleErr) {
      throw new Error(`Gagal menetapkan peran member: ${roleErr.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: newUserId, username: normalizedUsername, full_name },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Terjadi kesalahan internal.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
