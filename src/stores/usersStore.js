import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createUserWithRole,
  fetchUsers,
  updateUser,
  deleteUserAccount,
  generatePasswordResetLink,
} from 'src/services/users/index.js'

export const useUsersStore = defineStore('usersStore', () => {
  const users = ref([])
  const isLoading = ref(false)
  const isCreating = ref(false)
  const isUpdating = ref(false)
  const isDeleting = ref(false)
  const isGeneratingResetLink = ref(false)
  const error = ref(null)
  const hasLoaded = ref(false)

  const teachers = computed(() => users.value.filter((user) => user.role === 'teacher'))

  function upsertUser(user) {
    const existingIndex = users.value.findIndex((u) => u.uid === user.uid)
    if (existingIndex === -1) {
      users.value.unshift(user)
      return
    }

    users.value.splice(existingIndex, 1, {
      ...users.value[existingIndex],
      ...user,
    })
  }

  function clearError() {
    error.value = null
  }

  function removeUserByUid(uid) {
    users.value = users.value.filter((user) => user.uid !== uid)
  }

  async function loadUsers({ role = null, force = false } = {}) {
    if (hasLoaded.value && !force && !role) {
      return users.value
    }

    isLoading.value = true
    error.value = null

    try {
      const loadedUsers = await fetchUsers(role)

      if (role) {
        return loadedUsers
      }

      users.value = loadedUsers
      hasLoaded.value = true
      return users.value
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function loadUsersByRole(role, options = {}) {
    return loadUsers({ role, ...options })
  }

  async function createUser(payload) {
    if (!payload?.role) {
      throw new Error('Role is required to create a user')
    }

    isCreating.value = true
    error.value = null

    try {
      const newUser = await createUserWithRole(payload)
      upsertUser(newUser)
      return newUser
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isCreating.value = false
    }
  }

  async function updateUserData(uid, data) {
    isUpdating.value = true
    error.value = null

    try {
      const updatedUser = await updateUser(uid, data)
      upsertUser(updatedUser)
      return updatedUser
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isUpdating.value = false
    }
  }

  async function deleteUserData(uid) {
    isDeleting.value = true
    error.value = null

    try {
      const removed = await deleteUserAccount(uid)
      removeUserByUid(removed.uid)
      return removed
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isDeleting.value = false
    }
  }

  async function generateUserPasswordResetLink(uid) {
    isGeneratingResetLink.value = true
    error.value = null

    try {
      return await generatePasswordResetLink(uid)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isGeneratingResetLink.value = false
    }
  }

  return {
    users,
    teachers,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isGeneratingResetLink,
    error,
    hasLoaded,
    loadUsers,
    loadUsersByRole,
    createUser,
    updateUserData,
    deleteUserData,
    generateUserPasswordResetLink,
    clearError,
  }
})
