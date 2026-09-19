import { defineStorage } from '@aws-amplify/backend'

export const storage = defineStorage({
  name: 'medpalPrivateFiles',
  access: (allow) => ({
    'doctor-certificates/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write']),
    ],
  }),
})
