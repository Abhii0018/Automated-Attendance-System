import Student from "../models/student.model.js";
import Counter from "../models/counter.model.js";
/*
  Create Student (Admin Only)
*/
                                 //we are not using req is the HTTP request object, Tightly Coupled Service Depends on Express, Depends on req structure
                                                                        //We are using service, This is loose coupling.and plain object. Can be tested independently. Can be reused in microservices. It does not care where data came from.
export const createStudent = async (data, currentUser) => {
  if (currentUser.role !== "Admin") {
    throw new Error("Only Admin can create students");
  }

  try {
    // 1️⃣ Auto-generate admission year
    const admissionYear = new Date().getFullYear();

    // 2️⃣ Atomic increment counter per admission year
    const counter = await Counter.findOneAndUpdate(
      { admissionYear },
      { $inc: { sequence: 1 } },
      { returnDocument: "after", upsert: true }
    );

    // 3️⃣ Generate prefix (1 + last 2 digits of year)
    const yearSuffix = String(admissionYear).slice(-2); // 2026 → 26
    const prefix = `1${yearSuffix}`; // 126

    // 4️⃣ Pad sequence to 5 digits
    const paddedSequence = String(counter.sequence).padStart(5, "0");

    const registrationNumber = `${prefix}${paddedSequence}`;

    // 5️⃣ Create student
    const student = await Student.create({
      ...data,
      admissionYear,
      registrationNumber,
      createdBy: currentUser.id,
    });

    return student;

  } catch (error) {
    if (error.code === 11000) {
      throw new Error("Duplicate registration number");
    }
    throw error;
  }
};

//Get All Students

export const getAllStudents = async (currentUser) => {
  if (currentUser.role === "Admin") {
    return await Student.find().sort({ createdAt: -1 });
  }

  // If teacher, return only students assigned to them
  return await Student.find({
    _id: {
      $in: await getStudentIdsAssignedToTeacher(currentUser.id),
    },
  });
};


//Get Student By ID

export const getStudentById = async (id, currentUser) => {
  const student = await Student.findById(id);

  if (!student) {
    throw new Error("Student not found");
  }

  if (currentUser.role === "Admin") {
    return student;
  }

  const assignedStudents = await getStudentIdsAssignedToTeacher(
    currentUser.id
  );

  if (!assignedStudents.includes(student._id.toString())) {
    throw new Error("Access denied");
  }

  return student;
};


//Delete Student (Admin Only)

export const deleteStudent = async (id, currentUser) => {
  if (currentUser.role !== "Admin") {
    throw new Error("Only Admin can delete students");
  }

  const student = await Student.findByIdAndDelete(id);

  if (!student) {
    throw new Error("Student not found");
  }

  return student;
};