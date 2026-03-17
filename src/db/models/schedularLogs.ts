import mongoose from 'mongoose';

function formatDate(date: Date) {
  if (!date) return null;
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

const schedularLogsSchema = new mongoose.Schema({
	client_id     : { type: mongoose.Schema.Types.ObjectId, ref:'client_details', required: [true, "Client ID is required."]},
	connection_id : { type: mongoose.Schema.Types.ObjectId, ref:'client_connections' },
	type 		  : { type: String},
	network 	  : { type: String},
	start_date    : { type: Date, get: formatDate},
	end_date	  : { type: Date, get: formatDate},
	priority      : { type: Number, default: 10},
	status 	      : { type: String, enum:['pending','processing','completed','error'], default:'pending' },
	data_input    : { type: mongoose.Schema.Types.Mixed},
	error         : { type: mongoose.Schema.Types.Mixed}
},
{ 
	timestamps: true,
	versionKey: false,
	collection: 'schedular_logs',
	toJSON: { getters: true }, 
	toObject: { getters: true } 
},
);

schedularLogsSchema.index({ client_id: 1 , network: 1, connection_id: 1 });
const schedularLogs = mongoose.model("schedularLogs",schedularLogsSchema); 

export default schedularLogs;