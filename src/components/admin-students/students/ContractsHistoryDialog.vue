<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card style="min-width: 680px; max-width: 900px">
      <q-card-section class="row items-center">
        <div class="text-h6">Histórico de Contratos</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="contracts"
          :columns="columns"
          row-key="id"
          flat
          bordered
          dense
          separator="cell"
          :pagination="{ rowsPerPage: 0 }"
          no-data-label="Nenhum contrato encontrado"
        >
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="statusColor(props.row.status)" :label="props.row.status" />
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-right">
              <q-btn
                v-if="props.row.status !== 'active'"
                dense
                flat
                size="sm"
                icon="check_circle"
                color="positive"
                label="Ativar"
                @click="$emit('set-active', props.row)"
              />
              <q-badge v-else color="positive" label="Ativo" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Fechar" @click="$emit('update:modelValue', false)" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import dayjs from 'dayjs'

defineProps({
  modelValue: Boolean,
  contracts: { type: Array, default: () => [] },
})

defineEmits(['update:modelValue', 'set-active'])

const columns = computed(() => [
  { name: 'contractNumber', label: 'Nº Contrato', field: 'contractNumber', align: 'left' },
  { name: 'book', label: 'Livro', field: 'book', align: 'left' },
  { name: 'startingLesson', label: 'Lição Inicial', field: 'startingLesson', align: 'left' },
  { name: 'currentLesson', label: 'Lição Atual', field: 'currentLesson', align: 'left' },
  {
    name: 'startDate',
    label: 'Início',
    field: (row) => (row.startDate ? dayjs(row.startDate).format('DD/MM/YYYY') : '—'),
    align: 'left',
  },
  {
    name: 'endDate',
    label: 'Término Prev.',
    field: (row) => (row.endDate ? dayjs(row.endDate).format('DD/MM/YYYY') : '—'),
    align: 'left',
  },
  { name: 'totalAbsences', label: 'Faltas', field: 'totalAbsences', align: 'center' },
  {
    name: 'pendingReplenishments',
    label: 'Repos.',
    field: 'pendingReplenishments',
    align: 'center',
  },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'actions', label: '', field: 'id', align: 'right' },
])

function statusColor(status) {
  if (status === 'active') return 'positive'
  if (status === 'completed') return 'blue-grey'
  if (status === 'cancelled') return 'negative'
  return 'grey'
}
</script>
