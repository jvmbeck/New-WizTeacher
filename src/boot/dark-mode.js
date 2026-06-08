import { defineBoot } from '#q-app/wrappers'
import { LocalStorage } from 'quasar'

export default defineBoot(({ $q }) => {
  const savedMode = LocalStorage.getItem('darkMode')

  if (savedMode !== null) {
    $q.dark.set(savedMode)
  }
})
