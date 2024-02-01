let totalClasses = 0;
function setTotalClasses(semesterClasses) {
  return (totalClasses = semesterClasses);
}

function getData(row) {
  const [id, name, missed, p1, p2, p3] = row;
  const student = {
    id,
    name,
    missed: parseInt(missed),
    p1: parseInt(p1),
    p2: parseInt(p2),
    p3: parseInt(p3),
  };
  return student;
}

function getAvgGrade(studentObject) {
  const { p1, p2, p3 } = studentObject;
  const avgGrade = (p1 + p2 + p3) / 3;

  return avgGrade;
}

function getStudentStatus(avgGrade) {
  if (avgGrade < 50) {
    return "Reprovado por Nota";
  } else if (avgGrade < 70) {
    return "Exame Final";
  } else {
    return "Aprovado";
  }
}

function getNeededGrade(avgGrade) {
  const gradeNeeded = 140 - avgGrade;
  if (gradeNeeded >= 71 && avgGrade >= 50) {
    return Math.ceil(gradeNeeded);
  } else {
    return null;
  }
}

function exceedsMissedThreshold(studentObject) {
  const { missed } = studentObject;
  return missed > totalClasses * 0.25;
}

function completeRow(row) {
  const student = getData(row);
  const tooLittleAttendence = exceedsMissedThreshold(student);

  if (tooLittleAttendence) {
    return { ...student, status: "Reprovado por Falta", naf: null };
  }

  const avgGrade = getAvgGrade(student);
  const status = getStudentStatus(avgGrade);
  const naf = getNeededGrade(avgGrade);
  return { ...student, status, naf };
}

module.exports = {
  completeRow,
  setTotalClasses,
};
