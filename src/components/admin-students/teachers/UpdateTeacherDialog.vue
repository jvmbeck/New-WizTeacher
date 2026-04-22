<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    persistent
  >
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">Editar professor</div>
      </q-card-section>

      <q-form @submit="submitUpdate">
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.name" label="Nome" outlined dense required />

          <q-btn
            type="button"
            flat
            outline
            icon="lock_reset"
            label="Redefinir senha"
            color="secondary"
            :loading="usersStore.isGeneratingResetLink"
            class="full-width"
            @click="resetPasswordByLink"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" :disable="usersStore.isUpdating" v-close-popup />
          <q-btn type="submit" color="primary" label="Salvar" :loading="usersStore.isUpdating" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useUsersStore } from 'src/stores/usersStore.js'

const props = defineProps({
  modelValue: Boolean,
  teacher: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

const $q = useQuasar()
const usersStore = useUsersStore()

const form = ref({ name: '' })

watch(
  () => props.modelValue,
  (val) => {
    if (val && props.teacher) {
      form.value = { name: props.teacher.name }
      usersStore.clearError()
    }
  },
)

async function submitUpdate() {
  const uid = props.teacher?.uid || props.teacher?.id
  await usersStore.updateUserData(uid, { name: form.value.name })
  emit('update:modelValue', false)
}

async function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  document.execCommand('copy')
  document.body.removeChild(textArea)
}

async function resetPasswordByLink() {
  try {
    const uid = props.teacher?.uid || props.teacher?.id
    const result = await usersStore.generateUserPasswordResetLink(uid)

    $q.dialog({
      title: 'Link de redefinicao gerado',
      message: `<div><p>Email: <strong>${result.email}</strong></p><div class="bg-grey-2 q-pa-sm" style="word-break: break-all; border-radius: 4px;">${result.link}</div></div>`,
      html: true,
      cancel: { label: 'Fechar', flat: true },
      ok: { label: 'Copiar link', color: 'primary' },
      persistent: true,
    }).onOk(async () => {
      await copyToClipboard(result.link)
      $q.notify({
        type: 'positive',
        message: 'Link copiado para a área de transferência.',
        position: 'bottom',
      })
    })
  } catch (error) {
    const errorCode = error?.code || usersStore.error?.code || 'unknown-error'
    const errorMessage =
      error?.message || usersStore.error?.message || 'Não foi possível gerar o link de redefinição.'

    console.error('Password reset link generation failed:', error)
    $q.notify({
      type: 'negative',
      message: `Falha ao gerar link (${errorCode}): ${errorMessage}`,
      position: 'bottom',
      timeout: 6000,
    })
  }
}
</script>
