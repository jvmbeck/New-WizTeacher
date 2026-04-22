<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    persistent
  >
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">Criar novo professor</div>
      </q-card-section>

      <q-form ref="createTeacherForm" @submit.prevent="submitTeacher">
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.name" label="Nome" outlined dense required />
          <q-input v-model="form.email" label="Email" type="email" outlined dense required />
          <q-input
            v-model="form.password"
            label="Senha"
            :type="showPassword ? 'text' : 'password'"
            outlined
            dense
            required
            :rules="[
              (val) => !!val || 'A senha e obrigatoria.',
              (val) => val.length >= 6 || 'A senha deve ter pelo menos 6 caracteres.',
            ]"
          >
            <template v-slot:append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>
          <div class="text-caption text-grey-7">A senha deve ter pelo menos 6 caracteres.</div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" :disable="usersStore.isCreating" v-close-popup />
          <q-btn type="submit" color="primary" label="Criar" :loading="usersStore.isCreating" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useUsersStore } from 'src/stores/usersStore.js'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue'])

const usersStore = useUsersStore()

const createTeacherForm = ref(null)
const showPassword = ref(false)

const defaultForm = () => ({
  name: '',
  email: '',
  password: '',
})

const form = ref(defaultForm())

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      form.value = defaultForm()
      showPassword.value = false
      usersStore.clearError()
    }
  },
)

async function submitTeacher() {
  const isValid = await createTeacherForm.value?.validate()
  if (!isValid) {
    return
  }

  await usersStore.createUser({
    name: form.value.name,
    email: form.value.email,
    password: form.value.password,
    role: 'teacher',
  })

  emit('update:modelValue', false)
}
</script>
