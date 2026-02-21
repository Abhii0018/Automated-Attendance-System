import mongoose from "mongoose";

const academicRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,   //objectId:-Reduced duplication, ObjectId is indexed
      ref: "Student",    //can populate later
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
      uppercase: true,
      match: [/^[A-Z]{2}$/, "Section must be two uppercase letters"],
    },
    rollNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
    updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
},
   
   
  },
  { timestamps: true }
);
/*
    Student cannot have two records in same semester
*/
academicRecordSchema.index(
  { studentId: 1, semester: 1 },
  { unique: true }
);

//Roll must be unique inside teacher + semester + section

academicRecordSchema.index(
  { teacherId: 1, semester: 1, section: 1, rollNumber: 1 },
  { unique: true }
);

const AcademicRecord = mongoose.model(
  "AcademicRecord",
  academicRecordSchema
);

export default AcademicRecord;