<template>
  <div v-if="usersStore.isLoading" class="flex flex-center q-pa-xl">
    <q-spinner size="48px" color="primary" />
  </div>

  <div v-else>
    <h6>Lista de Professores</h6>

    <div class="top-buttons">
      <q-input
        v-model="searchQuery"
        label="Pesquisar por nome ou email"
        outlined
        debounce="300"
        rounded
        class="q-mt-sm q-mb-md input-container"
      >
        <template v-slot:append>
          <q-icon name="close" @click="searchQuery = ''" class="cursor-pointer" />
        </template>
        <template v-slot:before>
          <q-icon name="search" />
        </template>
      </q-input>

      <div class="button-container">
        <q-btn @click="showCreateDialog = true">Criar Novo Professor</q-btn>
      </div>
    </div>

    <CreateTeacherDialog v-model="showCreateDialog" />
    <UpdateTeacherDialog v-model="showEditDialog" :teacher="selectedTeacher" />

    <q-list bordered separator>
      <q-item
        v-for="teacher in filteredTeachers"
        :key="teacher.id"
        clickable
        @click="$router.push({ name: 'TeacherDetails', params: { id: teacher.id } })"
      >
        <q-item-section>
          <q-item-label
            ><strong>{{ teacher.name }}</strong></q-item-label
          >
          <q-item-label caption>Email: {{ teacher.email }}</q-item-label>
        </q-item-section>

        <q-item-section side>
          <q-btn flat round icon="edit" color="primary" @click.stop="openEditDialog(teacher)" />
          <q-btn
            flat
            round
            icon="delete"
            color="negative"
            :loading="deletingUid === teacher.uid"
            @click.stop="confirmDelete(teacher)"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useUsersStore } from 'src/stores/usersStore.js'
import CreateTeacherDialog from 'src/components/admin-students/teachers/CreateTeacherDialog.vue'
import UpdateTeacherDialog from 'src/components/admin-students/teachers/UpdateTeacherDialog.vue'

const $q = useQuasar()
const searchQuery = ref('')
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const selectedTeacher = ref(null)
const deletingUid = ref(null)
const usersStore = useUsersStore()

onMounted(async () => {
  await usersStore.loadUsers({ force: true })
})

function notify(type, message) {
  $q.notify({
    type,
    message,
    position: 'bottom',
    timeout: 3000,
  })
}

function openEditDialog(teacher) {
  selectedTeacher.value = teacher
  showEditDialog.value = true
}

function confirmDelete(teacher) {
  $q.dialog({
    title: 'Confirmar exclusão',
    message: `Tem certeza que deseja excluir o professor <strong>${teacher.name}</strong>? Esta ação não pode ser desfeita.`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Excluir', color: 'negative' },
    persistent: true,
  }).onOk(async () => {
    deletingUid.value = teacher.uid
    try {
      await usersStore.deleteUserData(teacher.uid)
      notify('positive', `Professor ${teacher.name} excluído com sucesso.`)
    } catch {
      notify('negative', `Erro ao excluir ${teacher.name}. Tente novamente.`)
    } finally {
      deletingUid.value = null
    }
  })
}

const filteredTeachers = computed(() => {
  const query = searchQuery.value.toLowerCase()
  if (!query) return usersStore.teachers

  return usersStore.teachers.filter((teacher) => {
    return teacher.name.toLowerCase().includes(query) || teacher.email.toLowerCase().includes(query)
  })
})
</script>

<style scoped>
.top-buttons {
  display: flex;
  justify-content: space-around;
  align-items: center;
}
.input-container {
  display: flex;
  gap: 10px;
  width: 75%;
}
.button-container {
  display: flex;
  gap: 10px;
}
</style>
