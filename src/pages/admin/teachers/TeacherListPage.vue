<template>
  <div>
    <h6>Lista de Professores</h6>

    <q-input
      v-model="searchQuery"
      label="Pesquisar por nome ou email"
      outlined
      debounce="300"
      rounded
      class="q-mt-sm q-mb-md"
    >
      <template v-slot:append>
        <q-icon name="close" @click="searchQuery = ''" class="cursor-pointer" />
      </template>
      <template v-slot:before>
        <q-icon name="search" />
      </template>
    </q-input>

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
      </q-item>
    </q-list>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import TeacherServices from 'src/services/TeacherServices.js'

const searchQuery = ref('')
const teachers = ref([])

onMounted(async () => {
  teachers.value = await TeacherServices.fetchAllTeachers()
})

const filteredTeachers = computed(() => {
  const query = searchQuery.value.toLowerCase()
  if (!query) return teachers.value

  return teachers.value.filter((teacher) => {
    return teacher.name.toLowerCase().includes(query) || teacher.email.toLowerCase().includes(query)
  })
})
</script>
