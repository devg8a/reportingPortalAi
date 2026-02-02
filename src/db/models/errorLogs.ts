import mongoose from 'mongoose';

const errorLogsSchema = new mongoose.Schema({
	client_id     : { type: mongoose.Schema.Types.ObjectId, ref:'Store', required: [true, "Client ID is required."]},
	connection_id : { type: mongoose.Schema.Types.ObjectId },
	account_id    : { type: mongoose.Schema.Types.ObjectId },
    network       : { type: String },
    start_date    : { type: Date },
    end_date      : { type: Date },
	status 	      : { type: String, enum:['error','working','completed'], default:'error' },
	error         : { type: mongoose.Schema.Types.Mixed}
},
{ 
	timestamps: true,
	versionKey: false,
	collection: 'error_logs',
},
);

// errorLogsSchema.index({ client_id: 1 , network: 1 , publisher_id: 1 });
const ErrorLogs = mongoose.model("ErrorLogs",errorLogsSchema); 

export default ErrorLogs;