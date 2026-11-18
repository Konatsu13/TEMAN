export interface LoginValidationResult {
  valid: boolean;
  normalizedUsername: string;
  errors: {
    username?: string;
    password?: string;
  };
}

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/^@+/, '');
}

export function validateLoginInput(
  nameOrUsernameInput: string,
  passwordInput: string
): LoginValidationResult {
  const cleanName = nameOrUsernameInput.trim();
  const errors: LoginValidationResult['errors'] = {};

  if (!cleanName) {
    errors.username = 'Nama akun wajib diisi.';
  } else if (cleanName.length < 2) {
    errors.username = 'Nama akun minimal 2 karakter.';
  }

  if (!passwordInput) {
    errors.password = 'Kata sandi wajib diisi.';
  } else if (passwordInput.length < 6) {
    errors.password = 'Kata sandi minimal 6 karakter.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    normalizedUsername: cleanName,
    errors,
  };
}

export function buildInternalAuthEmail(nameOrUser: string, domain = 'teman.local'): string {
  // Generate clean email slug from name or username
  const cleanSlug = nameOrUser.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanDomain = domain.trim().replace(/^@+/, '') || 'teman.local';
  return `${cleanSlug}@${cleanDomain}`;
}
