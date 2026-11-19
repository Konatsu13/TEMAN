// Supabase Edge Function: manage-member
// Mengizinkan Owner mengubah profil/kata sandi atau menghapus akun Member
// tanpa memakai service-role key di sisi browser.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Metode tidak diizinkan.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error('Konfigurasi server Supabase belum lengkap.');
    }
    if (!authHeader) {
      return json({ error: 'Akses ditolak: sesi tidak valid.' }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Verifikasi pemanggil adalah Owner aktif.
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user) {
      return json({ error: 'Akses ditolak: sesi tidak valid.' }, 401);
    }

    const [{ data: callerRole }, { data: callerProfile }] = await Promise.all([
      admin.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      admin.from('profiles').select('is_active').eq('id', user.id).maybeSingle(),
    ]);

    if (callerRole?.role !== 'owner' || !callerProfile?.is_active) {
      return json(
        { error: 'Akses ditolak: hanya Owner aktif yang dapat mengelola anggota.' },
        403,
      );
    }

    // 2. Parse & validasi payload.
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return json({ error: 'Permintaan tidak valid.' }, 400);
    }

    const action = payload.action;
    const userId = typeof payload.user_id === 'string' ? payload.user_id.trim() : '';
    if (action !== 'update' && action !== 'delete') {
      return json({ error: 'Aksi harus "update" atau "delete".' }, 400);
    }
    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
      return json({ error: 'ID anggota tidak valid.' }, 400);
    }

    const { data: targetProfile, error: targetError } = await admin
      .from('profiles')
      .select('id, username, full_name, is_active')
      .eq('id', userId)
      .maybeSingle();
    if (targetError) {
      throw new Error(`Gagal memuat profil anggota: ${targetError.message}`);
    }
    if (!targetProfile) {
      return json({ error: 'Anggota tidak ditemukan.' }, 404);
    }

    const { data: targetRole } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    const role = targetRole?.role ?? 'member';

    if (action === 'delete') {
      if (userId === user.id) {
        return json({ error: 'Anda tidak dapat menghapus akun sendiri.' }, 400);
      }
      if (role === 'owner') {
        return json({ error: 'Akun Owner tidak dapat dihapus.' }, 403);
      }

      const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
      if (deleteAuthError) {
        return json(
          { error: `Gagal menghapus akun login: ${deleteAuthError.message}` },
          500,
        );
      }

      // Bersihkan sisa baris public jika tidak dikonfigurasi cascade.
      await admin.from('user_roles').delete().eq('user_id', userId);
      await admin.from('profiles').delete().eq('id', userId);

      return json({ success: true, deleted: { id: userId } });
    }

    // 3. Update profil dan kredensial.
    const fullName =
      typeof payload.full_name === 'string' ? payload.full_name.trim() : '';
    if (fullName.length < 2 || fullName.length > 80) {
      return json({ error: 'Nama lengkap harus 2–80 karakter.' }, 400);
    }

    const nextUsername =
      typeof payload.username === 'string' && payload.username.trim()
        ? normalizeUsername(payload.username)
        : targetProfile.username;
    if (!/^[a-z0-9._-]{3,32}$/.test(nextUsername)) {
      return json(
        {
          error:
            'Username harus 3–32 karakter dan hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau tanda hubung.',
        },
        400,
      );
    }

    const password = typeof payload.password === 'string' ? payload.password : '';
    if (password && password.length < 6) {
      return json({ error: 'Kata sandi baru minimal 6 karakter.' }, 400);
    }
    if (password.length > 128) {
      return json({ error: 'Kata sandi terlalu panjang.' }, 400);
    }

    if (nextUsername !== targetProfile.username) {
      const { data: taken } = await admin
        .from('profiles')
        .select('id')
        .eq('username', nextUsername)
        .neq('id', userId)
        .maybeSingle();
      if (taken) {
        return json({ error: 'Username sudah dipakai anggota lain.' }, 409);
      }
    }

    const { error: profileUpdateError } = await admin
      .from('profiles')
      .update({
        full_name: fullName,
        username: nextUsername,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (profileUpdateError) {
      return json(
        { error: `Gagal memperbarui profil: ${profileUpdateError.message}` },
        500,
      );
    }

    const authPatch: {
      user_metadata: Record<string, string>;
      email?: string;
      email_confirm?: boolean;
      password?: string;
    } = {
      user_metadata: { username: nextUsername, full_name: fullName },
    };
    if (nextUsername !== targetProfile.username) {
      authPatch.email = `${nextUsername}@teman.local`;
      authPatch.email_confirm = true;
    }
    if (password) {
      authPatch.password = password;
    }

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(
      userId,
      authPatch,
    );
    if (authUpdateError) {
      // Kembalikan profil agar tidak berbeda dengan kredensial login.
      await admin
        .from('profiles')
        .update({
          full_name: targetProfile.full_name,
          username: targetProfile.username,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      return json(
        { error: `Gagal memperbarui kredensial login: ${authUpdateError.message}` },
        500,
      );
    }

    return json({
      success: true,
      member: {
        id: userId,
        username: nextUsername,
        full_name: fullName,
        is_active: targetProfile.is_active,
        role,
      },
    });
  } catch (err) {
    return json(
      {
        error:
          err instanceof Error ? err.message : 'Terjadi kesalahan internal.',
      },
      500,
    );
  }
});
