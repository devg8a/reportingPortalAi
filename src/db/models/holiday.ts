import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  ordering: {
    type: Number,
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  prev_start_date: {
    type: Date
  },
  prev_end_date: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
},{
    timestamps: true,
	versionKey: false,
});

const Holiday = mongoose.model('Holiday', holidaySchema);
export default Holiday;