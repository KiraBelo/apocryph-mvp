export type SeedUserKey = 'luna' | 'wolf' | 'ember' | 'starfall'

export interface SeedUser {
  email: string
  password: string
  role: 'admin' | 'user'
}

export const SEED_PASSWORD = 'apocryph123'

export const SEED_USERS: Record<SeedUserKey, SeedUser> = {
  luna:     { email: 'luna@apocryph.test',     password: SEED_PASSWORD, role: 'admin' },
  wolf:     { email: 'wolf@apocryph.test',     password: SEED_PASSWORD, role: 'user' },
  ember:    { email: 'ember@apocryph.test',    password: SEED_PASSWORD, role: 'user' },
  starfall: { email: 'starfall@apocryph.test', password: SEED_PASSWORD, role: 'user' },
}
