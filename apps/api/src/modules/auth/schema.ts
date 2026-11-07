import { t } from 'elysia'

export const loginBody = t.Object({
  email: t.String({ format: 'email', error: 'Email tidak valid' }),
  password: t.String({ minLength: 6, error: 'Password minimal 6 karakter' }),
})

export const changePasswordBody = t.Object({
  currentPassword: t.String({ minLength: 6 }),
  newPassword: t.String({ minLength: 6 }),
})

export const updateProfileBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  avatarUrl: t.Optional(t.Nullable(t.String())),
})
