<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">Edit Student</div>
      </q-card-section>

      <q-card-section>
        <q-input v-model="editedData.name" label="Name" outlined class="q-mb-sm" />
        <q-input v-model="editedData.book" label="Book" outlined class="q-mb-sm" />
        <q-input
          v-model="editedData.currentLesson"
          label="Current Lesson"
          type="number"
          outlined
          class="q-mb-sm"
        />
        <!-- ✅ Multi-select for classIds -->
        <q-select
          v-model="editedData.classIds"
          :options="classOptions"
          label="Classes"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          multiple
          outlined
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn color="primary" label="Save" @click="submitEdit" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useClassStore } from 'src/stores/classStore'

const props = defineProps({
  modelValue: Boolean,
  student: Object,
})

const emit = defineEmits(['update:modelValue', 'update'])

const isOpen = ref(false)
const editedData = ref({})
const classOptions = ref([])

const classStore = useClassStore()

onMounted(async () => {
  await classStore.fetchClasses()
  classOptions.value = classStore.classes.map((cls) => ({
    label: cls.name || 'Unnamed Class',
    value: cls.id,
  }))
})

watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val
    if (val && props.student) {
      // ✅ Deep clone and ensure classIds is always an array
      editedData.value = {
        ...props.student,
        classIds: Array.isArray(props.student.classIds) ? [...props.student.classIds] : [],
      }
    }
  },
)

watch(isOpen, (val) => {
  emit('update:modelValue', val)
})

const submitEdit = () => {
  emit('update', editedData.value)
  isOpen.value = false
}
</script>
