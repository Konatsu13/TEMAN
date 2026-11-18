import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || '';
const secretKey = process.env.VITE_SUPABASE_SECRET_KEY || '';
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const client = createClient(url, anonKey);

async function run() {
  const username = 'fathan';
  const fullName = 'Fathan';
  const password = 'Konatsu13';
  const email = `${username}@teman.local`;

  console.log(`Creating user: ${fullName} (${username}) with email: ${email}...`);

  // 1. Check if user already exists
  const { data: userList } = await admin.auth.admin.listUsers();
  let existingUser = userList?.users?.find(u => u.email === email);

  let userId: string;

  if (existingUser) {
    console.log('User already exists in auth.users:', existingUser.id);
    userId = existingUser.id;
    // Update password to Konatsu13
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { username, full_name: fullName }
    });
    if (updErr) {
      console.error('Failed to update password:', updErr.message);
    } else {
      console.log('Password updated successfully for existing user.');
    }
  } else {
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, full_name: fullName }
    });

    if (createErr || !newUser.user) {
      throw new Error(`Failed to create auth user: ${createErr?.message}`);
    }
    userId = newUser.user.id;
    console.log('Created auth user with ID:', userId);
  }

  // 2. Insert into public.profiles
  const { data: profileData, error: profileErr } = await admin
    .from('profiles')
    .upsert({
      id: userId,
      username,
      full_name: fullName,
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
    .select();

  if (profileErr) {
    console.error('Failed to upsert profiles:', profileErr.message);
  } else {
    console.log('Upserted profile:', profileData);
  }

  // 3. Insert into public.user_roles
  const { data: roleData, error: roleErr } = await admin
    .from('user_roles')
    .upsert({
      user_id: userId,
      role: 'owner'
    }, { onConflict: 'user_id' })
    .select();

  if (roleErr) {
    // If onConflict isn't user_id, try select first
    console.warn('Upsert user_roles with onConflict user_id warning:', roleErr.message);
    const { data: existingRole } = await admin
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRole) {
      await admin.from('user_roles').update({ role: 'owner' }).eq('user_id', userId);
      console.log('Updated existing role to owner');
    } else {
      const { data: newRole, error: insertRoleErr } = await admin
        .from('user_roles')
        .insert({ user_id: userId, role: 'owner' })
        .select();
      if (insertRoleErr) {
        console.error('Failed to insert user_roles:', insertRoleErr.message);
      } else {
        console.log('Inserted new role:', newRole);
      }
    }
  } else {
    console.log('Upserted user_roles:', roleData);
  }

  // 4. Verify login using anon client
  console.log('\n--- Verifying login via public client ---');
  const { data: loginData, error: loginErr } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (loginErr || !loginData.session) {
    console.error('Verification login failed:', loginErr?.message);
  } else {
    console.log('Verification login SUCCESS!');
    console.log('Logged in as:', loginData.user?.email);
    console.log('Session Access Token obtained:', loginData.session.access_token.slice(0, 25) + '...');
  }
}

run().catch(err => {
  console.error('Error creating owner:', err);
  process.exit(1);
});
