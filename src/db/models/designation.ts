import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
},
{ 
	timestamps: true,
	versionKey: false,
},
);

export default mongoose.model('user_designations', designationSchema);