<template>
  <div class="admin-dashboard">
    <q-btn to="AdminDashboard/studentList">Alunos</q-btn>
    <q-btn to="AdminDashboard/teacherList">Professores</q-btn>
    <q-btn to="AdminDashboard/classList">Turmas</q-btn>
  </div>
</template>

<style scoped>
.admin-dashboard {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.q-btn {
  background-color: var(--header-bg);
  color: var(--header-text-color);
}
</style>
