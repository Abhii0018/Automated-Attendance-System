import mongoose from "mongoose";

const academicRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,   //objectId:-Reduced duplication, ObjectId is indexed
      ref: "Student",    //can populate later
      required: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    section: {
      type: String,
      required: true,
    },
    rollNumber: {
      type: Number,
      required: true,
    },
    assignedTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);
/*
  Unique roll number per teacher per section per semester
*/
academicRecordSchema.index(     //database concepts: compound unique indexes.
  { year: 1, semester: 1, section: 1, assignedTeacher: 1, rollNumber: 1 },
  { unique: true }
);

/*
  Prevent duplicate academic record for same student in same semester Within a class (same teacher + section + semester),
two students cannot have the same roll number.
*/
academicRecordSchema.index(
  { studentId: 1, year: 1, semester: 1 },
  { unique: true }
);

const AcademicRecord = mongoose.model(
  "AcademicRecord",
  academicRecordSchema
);

export default AcademicRecord;