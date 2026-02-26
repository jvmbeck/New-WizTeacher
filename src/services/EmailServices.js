import axios from 'axios';
import { db } from '../key/configKey.js'
import {  doc, getDoc, query, where, collection, getDocs, documentId } from 'firebase/firestore';
import ClassServices from './ClassServices.js';

async function queryStudents(classId) {
   // Step 1: Get the class data
  const classRef = doc(db, "classes", classId);
  const classSnap = await getDoc(classRef);

  if (!classSnap.exists()) {
    throw new Error("Class not found");
  }

  const { studentIds = [] } = classSnap.data();

  // Step 2: Get absences for that class and date
  const absencesRef = collection(db, "absences");
  const q = query(
    absencesRef,
    where("classId", "==", classId),
    where("date", "==", new Date().toISOString().split('T')[0])

  );

  const absSnapshot = await getDocs(q);
  const absentIds = absSnapshot.docs.map((doc) => doc.data().studentId);


const studentsQuery = query(
  collection(db, "students"),
  where(documentId(), "in", studentIds)
);

const snapshot = await getDocs(studentsQuery);

const students = snapshot.docs.map(doc => {
  const data = doc.data();
  const status = absentIds.includes(doc.id) ? "Faltante" : "Presente";
  return { name: data.name, status };
});

  return students;
}


const emailServices = {
  async sendAttendanceEmail(classId) {
    try {
      const students = await queryStudents(classId);
      const classInfo = await ClassServices.fetchClassById(classId);
      const className = classInfo.className;

      // Log the students and classId for debugging
      console.log("students: ",students);
      console.log("classId: ",classId);

      await axios.post('http://localhost:3000/send-email', {
        className: className,
        students: students,
        to: "assessor5wizardviamao@gmail.com"
      },
      {
      headers: {
        'x-api-key': 'AIzaSyA8bX4mYHk3v1n0KxW8h8F7F7F7F7F7F7'
      }
      });
    } catch (error) {
      console.error('Error sending attendance email:', error);
      throw error;
    }
  }
};

export default emailServices;
