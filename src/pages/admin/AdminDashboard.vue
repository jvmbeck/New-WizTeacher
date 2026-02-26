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

button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
}
</style>
